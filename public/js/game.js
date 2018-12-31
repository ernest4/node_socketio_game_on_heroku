/* Copyright 2018 Ernestas Monkevicius */

var config = {
    type: Phaser.AUTO, /* Set the renderer type for our game. The two main
                        types are Canvas and WebGL. WebGL is a faster
                        renderer and has better performance, but not all 
                        browsers support it. By choosing AUTO for the type, 
                        Phaser will use WebGL if it is available, otherwise, it
                        will use Canvas. */
    parent: 'phaser-example', /* the parent field is used to tell Phaser to 
                                render our game in an existing  <canvas>  
                                element with id 'phaser-example' if it exists.
                                If it does not exists, then Phaser will create
                                a <canvas> element for us. */
    width: 800,
    //height: 600,
    height: 550,
    physics: {
        default: 'arcade',
        arcade: {
            debug: false,
            gravity: { y: 0 }
        }
    },
    scene: {
        preload: preload,
        create: create,
        update: update
    }
};

var game = new Phaser.Game(config);
const eventMSG = Object.freeze({
    player: Object.freeze({
        list: "1",
        new: "2",
        disconnect: "3",
        movement: "4",
        moved: "5"
    }),
    star: Object.freeze({
        location: "6",
        collected: "7"
    }),
    score: Object.freeze({
        update: "8"
    })
});

function preload() {
    // Runs once, loads up assets like images and audio

    this.load.image('ship', 'assets/spaceShips_001.png');
    this.load.image('otherPlayer', 'assets/enemyBlack5.png');
    this.load.image('star', 'assets/star_gold.png');
}

var players = {}; //global secondary index of all players

function create() {
    // Runs once, after all assets in preload are loaded

    var self = this; /*needed in order to access 'this' object inside of a
                        function. This is because functions are objects too
                        and referencing this in a function will reference the
                        function itself rather than the object the function is
                        inside.*/
    this.socket = io();

    this.otherPlayers = this.physics.add.group(); /*groups in Phaser, they are 
    a way for us to manage similar game objects and control them as one unit.
    One example is, instead of having to check for collisions on each of those
    game objects separately, we can check for collision between the group and 
    other game objects. */

    //this.socket.on('currentPlayers', function(players){
    this.socket.on(eventMSG.player.list, function(players){
        //for each of the players in the game
        Object.keys(players).forEach(function(id){
            //if the player is this player, add it to the game...
            //if (players[id].playerId === self.socket.id){
            if (id === self.socket.id){
            //extract the string ID
            //if (binaryToString(players[id], 7, 27) === self.socket.id){
                addPlayer(self, players[id]);
            } else { //...some other player, add it to the 'others' group
                addOtherPlayers(self, players[id]);
            }
        });
    });

    //this.socket.on('newPlayer', function(playerInfo){
    this.socket.on(eventMSG.player.new, function(playerInfo){
        addOtherPlayers(self, playerInfo);
    });

    //this.socket.on('disconnect', function(playerId){
    this.socket.on(eventMSG.player.disconnect, function(playerId){
        self.otherPlayers.children.getArray().forEach(function(otherPlayer){
            if (otherPlayer.playerId === playerId){
                otherPlayer.destroy();
            }
        });
    });

    this.socket.on(eventMSG.player.moved, function(playerInfo){
        /*Find the player that moved in the stored array of ther players and
        update it's position and rotation */

        //var playerInfoView = new DataView(playerInfo);
        //console.log('Player Moved');

        self.otherPlayers.children.getArray().forEach(function(otherPlayer){
            if (otherPlayer.playerId === playerInfo.playerId){
            //if (otherPlayer.playerId === binaryToString(playerInfo, 7, 27)){

                //console.log("Rotation in moved::");
                //console.log(playerInfoView.getInt16(0)/100);

                /*otherPlayer.setRotation(playerInfoView.getInt16(0)/100);
                otherPlayer.setPosition(playerInfoView.getUint16(2), playerInfoView.getUint16(4));*/
                otherPlayer.setRotation(playerInfo.rotation);
                otherPlayer.setPosition(playerInfo.x, playerInfo.y);
            }
        });
    });

    this.cursors = this.input.keyboard.createCursorKeys(); /*This will populate
    the cursors object with our four main Key objects (up, down, left, and 
    right), which will bind to those arrows on the keyboard.  */

    //----TESTING
    //this.input.keyboard.on('keyup_' + 'P', function(event){
    this.input.keyboard.on('keyup_' + 'P', event => {
        console.log("You pressed P!");
    });

    this.socket.on('testResponse', function(data){
        console.log(data.val)
    });
    //----TESTING


    this.blueScoreText = this.add.text(16, 16, '', {fontSize: '32px', fill: '#11bbFF'});
    this.redScoreText = this.add.text(584, 16, '', {fontSize: '32px', fill: '#FF0000'});

    //this.socket.on('scoreUpdate', function(scores){
    this.socket.on(eventMSG.score.update, function(scores){
        self.blueScoreText.setText('Blue: ' + scores.blue);
        self.redScoreText.setText('Red: ' + scores.red);
    });

    //this.socket.on('starLocation', function(starLocation){
    this.socket.on(eventMSG.star.location, function(starLocation){
        //if star exists, destroy it and make a new one based on recieved location
        if (self.star) self.star.destroy();
        self.star = self.physics.add.image(starLocation.x, starLocation.y, 'star');

        //collision detection between this ship and star
        self.physics.add.overlap(self.ship, self.star, function(){
            //this.socket.emit('starCollected');
            this.socket.emit(eventMSG.star.collected);
        }, null, self);
    });
}


function update(time, delta) {
    // Runs once per frame for the duration of the scene

    //console.log(`time: ${time}, delta: ${delta}`);

    if (this.ship){
        //console.log(new Date());
        //handle rotation
        if (this.cursors.left.isDown) this.ship.setAngularVelocity(-150);
        else if (this.cursors.right.isDown) this.ship.setAngularVelocity(150);
        else this.ship.setAngularVelocity(0);

        //handle acceleration
        /*if (this.cursors.up.isDown){
            this.physics.velocityFromRotation(this.ship.rotation + 1.5, 100, this.ship.body.acceleration);
        } else this.ship.setAcceleration(0);*/

        //FOR LOAD TESTING, SIMULATE MOVEMENT (can be override any time by user...)
        if (this.cursors.up.isDown){
            this.physics.velocityFromRotation(this.ship.rotation + 1.5, 100, this.ship.body.acceleration);
        } else this.physics.velocityFromRotation(this.ship.rotation + 1.5, 10, this.ship.body.acceleration);

        //DEBUGGING server hardware
        if (this.cursors.down.isDown) {
            this.socket.emit('serverHardware');
        }

        this.physics.world.wrap(this.ship, 5); /*If the ship goes off screen we
        want it to appear on the other side of the screen with an offset. */

        //tell the server this player has moved...
        //emit player movement
        var x = this.ship.x;
        var y = this.ship.y;
        var r = this.ship.rotation;
        if (this.ship.oldPosition && (x !== this.ship.oldPosition.x || y !== this.ship.oldPosition.y || r !== this.ship.oldPosition.rotation)){
            //this.socket.emit(eventMSG.player.movement, movementToBinary({ x: this.ship.x, y: this.ship.y, rotation: this.ship.rotation}));
            this.socket.emit(eventMSG.player.movement, { x: this.ship.x, y: this.ship.y, rotation: this.ship.rotation});
        }

        //save old position data
        this.ship.oldPosition = {
            x: this.ship.x,
            y: this.ship.y,
            rotation: this.ship.rotation
        };
    }
}

//var movementBinaryBlob = new Uint16Array(3); //global scope for reuse
var movementBinaryBlobView = new DataView(new ArrayBuffer(6)); //global scope for reuse
function movementToBinary(movementObject){
    /* input:
    {   
        x: this.ship.x,
        y: this.ship.y,
        rotation: this.ship.rotation
    } 
    */
    /*var binaryBlob = Buffer.allocUnsafe(6); //6 bytes with cruft
    
    binaryBlob.writeUInt16BE(movementObject.rotation, 0);
    binaryBlob.writeUInt16BE(movementObject.x, 2);
    binaryBlob.writeUInt16BE(movementObject.y, 4);*/

    //console.log("Rotation in movementToBinary::");
    //console.log(movementObject.rotation);

    movementBinaryBlobView.setInt16(0, movementObject.rotation*100);
    movementBinaryBlobView.setUint16(2, movementObject.x);
    movementBinaryBlobView.setUint16(4, movementObject.y);

    return movementBinaryBlobView.buffer;
}

function addPlayer(self, playerInfo){
    /*usign self.physics.add.image instead of self.add.image so the ship can
    use the arcade physics.*/
    //var playerDataView = new DataView(playerInfo);

    self.ship = self.physics.add.image(playerInfo.x, playerInfo.y, 'ship')
                                    .setOrigin(0.5, 0.5) /*default is top left,
                                                        this affects rotation.*/
                                    .setDisplaySize(53, 40); /*Scale down the
                                    original 106×80 px image proportionately. */
    
    //set color based on team
    //if (playerDataView.getUint8(6) === 2) self.ship.setTint(0x0000ff);
    if (playerInfo.team === 2) self.ship.setTint(0x0000ff);
    else self.ship.setTint(0xff0000);

    //arcade physics settings
    self.ship.setDrag(100);
    self.ship.setAngularDrag(100);
    self.ship.setMaxVelocity(200);
}

function addOtherPlayers(self, playerInfo){
    //var playerDataView = new DataView(playerInfo);

    const otherPlayer = self.add.sprite(playerInfo.x, playerInfo.y, 'otherPlayer')
                                    .setOrigin(0.5, 0.5)
                                    .setDisplaySize(53, 40);

    //if (playerDataView.getUint8(6) === 2) otherPlayer.setTint(0x0000ff);
    if (playerInfo.team === 2) otherPlayer.setTint(0x0000ff);
    else otherPlayer.setTint(0xff0000);

    //otherPlayer.playerId = binaryToString(playerInfo, 7, 27); //playerInfo.toString('ascii', 7, 27);
    otherPlayer.playerId = playerInfo.playerId;
    self.otherPlayers.add(otherPlayer);

    //update secondary index
    players[otherPlayer.playerId] = otherPlayer;
}

function binaryToString(binaryData, from, to){
    var binaryDataView = new DataView(binaryData);
    var str = "";

    for (let i = from; i < to; i++){
        str += String.fromCharCode(binaryDataView.getUint8(i));
    }

    return str;
}

var stringBinaryBlobView = new DataView(new ArrayBuffer(20)); //global scope for reuse
function stringToBinary(str){

    for (let i = 0; i < str.length; i++){
        stringBinaryBlobView.setUint8(i) = str.charCodeAt(i);
    }

    return stringBinaryBlobView;
}
