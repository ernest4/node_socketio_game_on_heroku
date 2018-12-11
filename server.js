var express = require('express');
var app = express();
var server = require('http').Server(app);
var io = require('socket.io').listen(server);

/* Normally this would be persisted in a database...but for now, just store it 
locally on the server. */
var players = {};
var star = {
    x: Math.floor(Math.random() * 700) + 50,
    y: Math.floor(Math.random() * 500) + 50
};
var scores = {
    blue: 0,
    red: 0
};

const PORT = process.env.PORT || 3000;

app.use(express.static(__dirname + '/public'));

app.get('/', function(req, res){
    res.sendFile(__dirname + '/index.html');
});

io.on('connection', function (socket){
    console.log(`a user connected: ${socket.id}`); //DEBUGGING

    //create a new player and add it to the player object
    players[socket.id] = {
        rotation: 0,
        x: Math.floor(Math.random() * 700) + 50,
        y: Math.floor(Math.random() * 500) + 50,
        playerId: socket.id,
        team: (Math.floor(Math.random() * 2) === 0) ? 'red' : 'blue'
    }

    //Update the new player of the current game state...
    //send the players objects to new player
    socket.emit('currentPlayers', players);
    //send the star object to the new player
    socket.emit('starLocation', star);
    //send the current scores
    socket.emit('scoreUpdate', scores);

    //update all other players of the new player
    socket.broadcast.emit('newPlayer', players[socket.id]);


    socket.on('disconnect', function(){
        console.log(`user disconnected: ${socket.id}`); //DEBUGGING

        //remove this player from the players object
        delete players[socket.id];

        //emit a message to all other players to remove this player
        io.emit('disconnect', socket.id);
    });


    /*When the playerMovement event is received on the server, we update that
    player’s information that is stored on the server, emit a new event called 
    playerMoved to all other players, and in this event we pass the updated
    player’s information. */
    socket.on('playerMovement', function(movementData){
        players[socket.id].x = movementData.x;
        players[socket.id].y = movementData.y;
        players[socket.id].rotation = movementData.rotation;

        //emit message to all players about the player that moved
            //socket.broadcast.emit('playerMoved', players[socket.id]);

        /*volatile messages should be faster as they dont require confirmation 
        (but then they may not reach the sender)*/
        socket.volatile.broadcast.emit('playerMoved', players[socket.id]);
    });

    /*update the correct team’s score, generate a new location for the star, 
    and let each player know about the updated scores and the stars new location.*/
    socket.on('starCollected', function(){
        if (players[socket.id].team === 'red') scores.red += 10;
        else scores.blue += 10;

        star.x = Math.floor(Math.random() * 700) + 50;
        star.y = Math.floor(Math.random() * 500) + 50;

        //broadcast
        io.emit('starLocation', star);
        io.emit('scoreUpdate', scores);
    });
});

server.listen(PORT, function(){
    console.log(`Listening on ${server.address().port}`);
});