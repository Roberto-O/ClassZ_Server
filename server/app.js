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

    socket.on('join', function(data) {
        var id = data.userID;
        var username = data.uname;

        for(var key in dict) {
            //if userId is already in the dictionary, pair/link it with a username
            if(key == id){
                dict[key] = username;
            }
        }

        console.log(username + " has joined");
    });

    socket.on('join game', function (data) {
        //var gameId = data.gameCode;

        //check gameCollection if gameID exists, if not emit saying so
        for(var key in gameCollection){
            var gameExists = false;
            var obj = gameCollection[key];

            if(key == "gameList"){
                for(var prop in obj) {

                    if(data == obj[prop]){
                        console.log("Joined game lobby " + data);
                        gameExists = true;
                    }
                }

                if(!gameExists){
                    console.log(data + " does not exist.");
                    socket.emit('game exists', "false");
                }
            }

        }

    });

    socket.on('create game', function (data) {
        var gameId = data.gameCode;
        var uname = data.username;

        console.log(uname + " is hosting a game at lobby " + gameId);

        gameCollection.gameList.gameId = gameId;
        gameCollection.gameList.gameId.host = uname;
        gameCollection.gameList.gameId.open = true;
        gameCollection.totalGameCount++;

        myEmitter.emit('game created', uname, gameId);
    });

    socket.on('disconnect', () => {
        console.log("User was disconnected");

    });

    //socket.emit('test send to client', 'this was sent from the server'); //for debugging

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

