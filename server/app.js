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

//create game collection that'll hold all games played
var gameCollection =  new function() {
    this.totalGameCount = 0,
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
                        gameCollection.gameList.lobbyInfo.players.push([username]);
                        for(var players in gameCollection.gameList.lobbyInfo.players){
                            console.log("players in game: " + gameCollection.gameList.lobbyInfo.players[players])
                        }
                    }
                }
            }
        }

        console.log(JSON.stringify(gameCollection, null, 2));

    }); //end on(join game)

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

app.use('/lobby', function (req, res, next) {
    //req.game_code = gameCode;
    next();
}, lobby);

server.listen(port, ()=>{
    console.log('Server is up on port %d', port);
});

