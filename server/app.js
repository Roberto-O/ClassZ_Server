const http = require('http');
const express = require('express');
const socketio = require('socket.io');
const EventEmitter = require('events');
const port = 3000;

let app = express();
let server = http.createServer(app);
let io = socketio(server);

let generate = require('../routes/generate.js');
let lobby = require('../routes/lobby.js');

var gameCode;

//create a dictionary of uniqueID with username
var dict = {};

//create game collection that'll hold all games created
var gameCollection =  new function() {
    this.totalGameCount = 0,
    this.infected = 0,
    this.gameList = {}
    };

io.on('connection', (socket) => {
    class MyEmitter extends EventEmitter {}
    const myEmitter = new MyEmitter();

    console.log("New user just connected");

    socket.on('connect to server', function(userID) {
        console.log(userID + " -> has connected to the server."  );
        dict[userID] = ""; //set userId to null since no username has been set yet
    });

    socket.on('generate code', function () {
        //will generate a code and save it in variable gameCode
        gameCode = (function () {
            var gc = Math.floor(Math.random() * (99999 - 11111 + 1)) + 11111;
            var time = new Date();
            console.log("Generated game code", gc, "on", time.toString());
            return gc;
        })();
    });

    socket.on('set name', function(data) {
        var id = data.userID;
        var username = data.uname;

        for(var key in dict) {
            //if userId is already in the dictionary, pair/link it with a username
            if(key == id){
                dict[key] = username;
            }
        }

        console.log("Set id " + id + " to " + username);
    });

    socket.on('get username', function(data) {
        var id = data;
        var username = dict[id];

        console.log(username + " has joined");
        socket.emit('rec username', username);
    });

    socket.on('create game', function (data) {
        var gameId = data.gameID;
        var userId = data.userID;
        var username = dict[userId];

        gameCollection.gameList.lobbyInfo = {};
        gameCollection.gameList.lobbyInfo.gameCode = gameId;
        gameCollection.gameList.lobbyInfo.host = username;
        gameCollection.gameList.lobbyInfo.open = true;
        gameCollection.gameList.lobbyInfo.players = [username];

        gameCollection.totalGameCount++;

        //console.log(JSON.stringify(gameCollection, null, 2)); //for debugging

        myEmitter.emit('game created', username, gameId);
    });

    socket.on('does game exist', function (gameId) {
        var gameExists = false;

        //check gameCollection if gameID exists, if not emit saying so
        for(var key in gameCollection){
            var obj = gameCollection[key];

            if(key == "gameList"){
                for(var key2 in obj) { //loops through lobbies
                    var lobby = obj[key2];

                    for(var key3 in lobby){ //loops through the lobby variables
                        if(key3 == "gameCode"){
                            if(lobby[key3] == gameId){
                                gameExists = true;
                                console.log("game " + gameId + " exists");
                            }
                        }
                    }
                }
            }

        }//end for

        if(!gameExists){
            console.log(gameId + " does not exist.");
            socket.emit('game exists', 'false');
        }else{
            socket.emit('game exists', 'true');
        }
    });

    socket.on('join game', function (data) {
        var gameId = data.gameID;
        var userId = data.userID;
        var username = dict[userId];

        for(var key in gameCollection.gameList){
            if(key == "lobbyInfo"){
                for(var infoVar in gameCollection.gameList.lobbyInfo){ //loop through the lobby's parameters
                    if(infoVar == "gameCode"){
                        var newData = gameCollection.gameList.lobbyInfo.gameCode;
                        if(newData == gameId){ //compare current gameCode with gameCode sent from client
                            continue;
                        }else{
                            break;
                        }
                    }
                    if(infoVar == "players"){
                        gameCollection.gameList.lobbyInfo.players.push([username]); //add player to player list for that game
                    }
                }
            }
        }

        //console.log(JSON.stringify(gameCollection, null, 2)); //for debugging

    }); //end on(join game)

    socket.on('get players', function (data) {
        var gameId = data;
        var playerName = [];

        for(var key in gameCollection.gameList){
            if(key == "lobbyInfo"){
                for(var infoVar in gameCollection.gameList.lobbyInfo){ //loop through the lobby's parameters
                    if(infoVar == "gameCode"){
                        var newData = gameCollection.gameList.lobbyInfo.gameCode;
                        if(newData == gameId){ //compare current gameCode with gameCode sent from client
                            continue;
                        }else{
                            break;
                        }
                    }
                    if(infoVar == "players"){
                        for(var players in gameCollection.gameList.lobbyInfo.players){ //print out players in the game
                            var player = gameCollection.gameList.lobbyInfo.players[players];

                            if(playerName.indexOf(player) === -1) { //don't add duplicates
                                playerName.push(player);
                            }
                        }
                    }
                }
            }
        }

        socket.emit('rec players', { playerArr: playerName} );
    });

    socket.on('link', function (data) {
        console.log("joined room");
        socket.join(data);
    });

    socket.on('get host', function (data) {
        var gameId = data.gameID;
        var userId = data.userID;
        var username = dict[userId];
        var isHost = false;
        var hostData;

        for(var key in gameCollection.gameList){
            if(key == "lobbyInfo"){
                for(var infoVar in gameCollection.gameList.lobbyInfo){ //loop through the lobby's parameters
                    if(infoVar == "gameCode"){
                        var newData = gameCollection.gameList.lobbyInfo.gameCode;
                        if(newData == gameId){ //compare current gameCode with gameCode sent from client
                            continue;
                        }else{
                            break;
                        }
                    }
                    if(infoVar == "host"){
                        hostData = gameCollection.gameList.lobbyInfo.host;
                        if(hostData == username){
                            isHost = true;
                        }
                    }
                }
            }
        }

        if(!isHost){
            socket.emit('am host', 'false');
            socket.emit('host name', hostData);
        }else{
            socket.emit('am host', 'true');
        }

    });

    socket.on('add infected', function () {
        gameCollection.infected++;
        console.log("added one to infected count, now it's " + gameCollection.infected);
    });

    socket.on('get infected count', function (data) {
        io.to(data).emit('infected count', gameCollection.infected);
    });

    socket.on('start countdown lobby', function (data) {
        console.log("Starting lobby countdown")
        io.to(data).emit('begin countdown lobby');
    });

    socket.on('start countdown game', function (data) {
        console.log("Starting game timer")
        io.to(data).emit('begin countdown game');
    });

    socket.on('select infected', function (data) {
        var gameId = data;
        var playerName = [];

        for(var key in gameCollection.gameList){
            if(key == "lobbyInfo"){
                for(var infoVar in gameCollection.gameList.lobbyInfo){ //loop through the lobby's parameters
                    if(infoVar == "gameCode"){
                        var newData = gameCollection.gameList.lobbyInfo.gameCode;
                        if(newData == gameId){ //compare current gameCode with gameCode sent from client
                            continue;
                        }else{
                            break;
                        }
                    }
                    if(infoVar == "players"){
                        for(var players in gameCollection.gameList.lobbyInfo.players){ //print out players in the game
                            var player = gameCollection.gameList.lobbyInfo.players[players];

                            if(playerName.indexOf(player) === -1) { //don't add duplicates
                                playerName.push(player);
                            }
                        }
                    }
                }
            }
        }

        var infectedPlayer = playerName[Math.floor(Math.random() * playerName.length)];
        console.log(infectedPlayer + " was chosen as the first infected!");
        io.to(data).emit('get infected', { firstInfected: infectedPlayer } );
    });

    socket.on('end', function () {
        gameCollection =  new function() {
            this.totalGameCount = 0,
            this.infected = 0,
            this.gameList = {}
        };
    })

    socket.on('disconnect', () => {
        console.log("User was disconnected");
    });

    myEmitter.on('game created', (host, gameID) => {
        console.log(host + " created game: " + gameID);
    });

});

app.use('/generate', function (req, res, next) {
    req.game_code = gameCode;
    next();
}, generate);

app.use('/lobby', function (req, res, next) { //might not need
    next();
}, lobby);

server.listen(port, ()=>{
    console.log('Server is up on port %d', port);
});

