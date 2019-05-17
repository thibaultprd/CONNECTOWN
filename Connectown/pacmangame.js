var game = new Phaser.Game(720, 496, Phaser.AUTO, "game");

//safe tile : route et 170


var PacmanGame = function (game) {
    this.map = null;
    this.layer = null;

    this.numDots = 0;
    this.TOTAL_DOTS = 0;
    this.score = 0;
    this.money = 0;
    this.scoreText = null;
    this.moneyText = null;
    this.start = null;
    this.end = null;
    this.icon = null;
    this.connecting = false;
    this.pacman = null;
    this.clyde = null;
    this.pinky = null;
    this.inky = null;
    this.blinky = null;
    this.isInkyOut = false;
    this.isClydeOut = false;
    this.ghosts = [];

    this.safetile = 14;
    this.gridsize = 16;
    this.threshold = 3;

    this.SPECIAL_TILES = [
        { x: 12, y: 11 },
        { x: 15, y: 11 },
        { x: 12, y: 23 },
        { x: 15, y: 23 }
    ];

    this.TIME_MODES = [
        {
            mode: "scatter",
            time: 7000
        },
        {
            mode: "chase",
            time: 20000
        },
        {
            mode: "scatter",
            time: 7000
        },
        {
            mode: "chase",
            time: 20000
        },
        {
            mode: "scatter",
            time: 5000
        },
        {
            mode: "chase",
            time: 20000
        },
        {
            mode: "scatter",
            time: 5000
        },
        {
            mode: "chase",
            time: -1 // -1 = infinite
        }
    ];
    this.changeModeTimer = 0;
    this.remainingTime = 0;
    this.currentMode = 0;
    this.isPaused = false;
    this.FRIGHTENED_MODE_TIME = 7000;

    this.ORIGINAL_OVERFLOW_ERROR_ON = true;
    this.DEBUG_ON = false;

    this.KEY_COOLING_DOWN_TIME = 250;
    this.lastKeyPressed = 0;

    this.game = game;
};

PacmanGame.prototype = {

    init: function () {
        this.scale.scaleMode = Phaser.ScaleManager.SHOW_ALL;
        this.scale.pageAlignHorizontally = true;
        this.scale.pageAlignVertically = true;

        Phaser.Canvas.setImageRenderingCrisp(this.game.canvas); // full retro mode, i guess ;)

        this.physics.startSystem(Phaser.Physics.ARCADE);
    },

    preload: function () {
        //  We need this because the assets are on Amazon S3
        //  Remove the next 2 lines if running locally
        //this.load.baseURL = 'http://files.phaser.io.s3.amazonaws.com/codingtips/issue005/';
        //this.load.crossOrigin = 'anonymous';

        this.load.image('dot', 'assets/dot.png');
        this.load.image("pill", "assets/pill16.png");
        this.load.image('tiles', 'assets/pacman-tiles.png');
        this.load.image('blueBuilding', "assets/blueBuilding.png",16,32);
        this.load.image('redBuilding', "assets/redBuilding.png",16,32);
        this.load.image('greenBuilding', "assets/greenBuilding.png",16,32);
        this.load.image('redHouse', "assets/redHouse.png");
        this.load.image('whiteHouse', "assets/whiteHouse.png");
        this.load.image('blueHouse', "assets/blueHouse.png");
        this.load.image('epuration', "assets/Epuration.png");
        this.load.image('fontaine', "assets/Fontaine.png");
        this.load.image('townHall', "assets/townHall.png");
        this.load.image('centraleNuc', "assets/nuclearCentral.png");
        this.load.spritesheet('pacman', 'assets/pacman.png', 32, 32);
        this.load.spritesheet('eclair', 'assets/eclair.png', 16, 16);
        this.load.spritesheet("ghosts", "assets/ghosts32.png", 32, 32);

        this.load.image('carre', "assets/carre.png");

        game.load.audio('hit', 'sounds/hit.wav');
        game.load.audio('ouh', 'sounds/ouh.wav');
        game.load.audio('pop', 'sounds/pop.wav');
        game.load.audio('song', 'sounds/musique.mp3');

        this.load.tilemap('map', 'assets/pacman-map.json', null, Phaser.Tilemap.TILED_JSON);

        //  Needless to say, the beast was stoned... and the graphics are Namco (C)opyrighted
    },

    create: function () {
        this.map = this.add.tilemap('map');
        this.map.addTilesetImage('pacman-tiles', 'tiles');

        //Initialize sounds
        hitSound = game.add.audio('hit', 1, false);
        ouhSound = game.add.audio('ouh', 1, false);
        popSound = game.add.audio('pop', 1, false);

        song = game.add.audio('song', 1, true); song.play();
        song.loop = true;

        this.layer = this.map.createLayer('Pacman');
        this.layerDeco = this.map.createLayer('Deco');
        this.layerDeco2 = this.map.createLayer('Deco2');
        this.dots = this.add.physicsGroup();
        this.numDots = this.map.createFromTiles(7, this.safetile, 'dot', this.layer, this.dots);
        this.TOTAL_DOTS = this.numDots;

        this.pills = this.add.physicsGroup();
        this.numPills = this.map.createFromTiles(40, this.safetile, "pill", this.layer, this.pills);

        //  The dots will need to be offset by 6px to put them back in the middle of the grid
        this.dots.setAll('x', 6, false, false, 1);
        this.dots.setAll('y', 6, false, false, 1);

        //  Pacman should collide with everything except the safe tile
        this.map.setCollisionByExclusion([this.safetile], true, this.layer);

		// Our hero
        this.pacman = new Pacman(this, "pacman");


        //Buildings
        var blueBuilding = game.add.sprite(309, 270, 'blueBuilding'); //blueBuilding.scale.setTo(0.7,0.7);
        var redHouse = game.add.sprite(117, 235, 'redHouse'); //redHouse.scale.setTo(0.7,0.7);
        var whiteHouse = game.add.sprite(117, 260, 'whiteHouse'); //whiteHouse.scale.setTo(0.7,0.7);
        var blueHouse = game.add.sprite(117, 285, 'blueHouse'); //blueHouse.scale.setTo(0.7,0.7);
        var canPop = 0;
        while(!canPop){
          var posX = this.getRandomInt(0, 27); var posY = this.getRandomInt(0, 30);
          if((this.map.getTile(Math.trunc(posX), Math.trunc(posY)).index) == 14){
            canPop = 1;
          }
        }
        this.start = game.add.sprite(this.map.getTile(posX,posY).left,this.map.getTile(posX,posY).top, 'eclair');
        this.start.animations.add('thunder', [0, 1, 2, 3,4], 20, true);
        this.start.play('thunder');

        // Score and debug texts
        this.scoreText = game.add.text(8, 0, "Score: " + this.score, { fontSize: "12px", fill: "#fff" });
        this.moneyText = game.add.text(200, 0, "Thune: " + this.money, { fontSize: "12px", fill: "#fff" });
        this.debugText = game.add.text(375, 260, "", { fontSize: "12px", fill: "#fff" });
        this.overflowText = game.add.text(375, 280, "", { fontSize: "12px", fill: "#fff" });

        this.cursors = this.input.keyboard.createCursorKeys();
        this.cursors["d"] = this.input.keyboard.addKey(Phaser.Keyboard.D);
        this.cursors["b"] = this.input.keyboard.addKey(Phaser.Keyboard.B);

        //this.game.time.events.add(1250, this.sendExitOrder, this);
        //this.game.time.events.add(7000, this.sendAttackOrder, this);

        this.changeModeTimer = this.time.time + this.TIME_MODES[this.currentMode].time;

        // Ghosts
        this.blinky = new Ghost(this, "ghosts", "blinky", {x:13, y:11}, Phaser.RIGHT);
        this.pinky = new Ghost(this, "ghosts", "pinky", {x:15, y:14}, Phaser.LEFT);
        this.inky = new Ghost(this, "ghosts", "inky", {x:14, y:14}, Phaser.RIGHT);
        this.clyde = new Ghost(this, "ghosts", "clyde", {x:17, y:14}, Phaser.LEFT);
        this.ghosts.push(this.clyde, this.pinky, this.inky, this.blinky);

        this.sendExitOrder(this.pinky);

        var townHall = game.add.sprite(this.map.getTile(10,12).left+8, this.map.getTile(10,12).top+4, 'townHall');
    },

    checkKeys: function () {
        this.pacman.checkKeys(this.cursors);

        if (this.lastKeyPressed < this.time.time) {
            if (this.cursors.d.isDown) {
                this.DEBUG_ON = (this.DEBUG_ON) ? false : true;
                this.lastKeyPressed = this.time.time + this.KEY_COOLING_DOWN_TIME;
            }
            if (this.cursors.b.isDown) {
                this.ORIGINAL_OVERFLOW_ERROR_ON = this.ORIGINAL_OVERFLOW_ERROR_ON ? false : true;
                this.pinky.ORIGINAL_OVERFLOW_ERROR_ON = this.ORIGINAL_OVERFLOW_ERROR_ON;
            }
        }
    },

    checkMouse: function() {
        if (this.input.mousePointer.isDown) {
            var x = this.game.math.snapToFloor(Math.floor(this.input.x), this.gridsize) / this.gridsize;
            var y = this.game.math.snapToFloor(Math.floor(this.input.y), this.gridsize) / this.gridsize;
            this.debugPosition = new Phaser.Point(x * this.gridsize, y * this.gridsize);
            console.log(x, y);
        }
    },

    dogEatsDog: function(pacman, ghost) {
        if (this.isPaused) {
            this[ghost.name].mode = this[ghost.name].RETURNING_HOME;
            this[ghost.name].ghostDestination = new Phaser.Point(14 * this.gridsize, 14 * this.gridsize);
            this[ghost.name].resetSafeTiles();
            this.score += 10;

        } else {
            this.killPacman();
            game.add.text(8, 8, "YOU DIED!", { fontSize: "100px", fill: "#fff" });
        }
    },

    getRandomInt: function(min, max){
      return Math.floor(Math.random() * (max - min + 1)) + min;
    },

    getObject: function(){
      var canPop = 0;
      while(!canPop){
        var posX = this.getRandomInt(0, 45); var posY = this.getRandomInt(0, 30);

        if((this.map.getTile(Math.trunc(posX), Math.trunc(posY)).index) == 14 ){
          canPop = 1;
        }
      }
        this.end = game.add.sprite(this.map.getTile(posX,posY).left,this.map.getTile(posX,posY).top, 'eclair');
        this.icon  = game.add.sprite(this.pacman.sprite.x - 8, this.pacman.sprite.y - 20, 'eclair');
        this.icon.animations.add('thunder', [0, 1, 2, 3,4], 20, true);
        this.icon.play('thunder');
        this.end.animations.add('thunder', [0, 1, 2, 3,4], 20, true);
        this.end.play('thunder');
        this.start.visible = false;

    },

    pop: function(){
      var tableau = ['whiteHouse', 'redHouse', 'blueHouse', 'blueBuilding', 'redBuilding', 'greenBuilding', 'fontaine'];
      //9 éléments
      var nombre = this.getRandomInt(0,8);
      var canPop = 0;

      if(this.score > 10){
        while(!canPop){
          var posX = this.getRandomInt(0, 27); var posY = this.getRandomInt(0, 30);
          if((this.map.getTile(Math.trunc(posX), Math.trunc(posY)).index) == 154){
            canPop = 1;
          }
        }

        popSound.play();
        this.score = 0;
        var bat = game.add.sprite(this.map.getTile(posX,posY).left,this.map.getTile(posX,posY).top, tableau[nombre]);
        if(bat.height > 16){
          bat.anchor.y = 0.5;
        }
        if(bat.height > 32){
          bat.anchor.y = 0.25;
        }

      }
    },

    getCurrentMode: function() {
        if (!this.isPaused) {
            if (this.TIME_MODES[this.currentMode].mode === "scatter") {
                return "scatter";
            } else {
                return "chase";
            }
        } else {
            return "random";
        }
    },

    gimeMeExitOrder: function(ghost) {
        this.game.time.events.add(Math.random() * 3000, this.sendExitOrder, this, ghost);
    },

    killPacman: function() {
        this.pacman.isDead = true;
        this.stopGhosts();
        hitSound.play();
        ouhSound.play();
        song.stop();
    },

    stopGhosts: function() {
        for (var i=0; i<this.ghosts.length; i++) {
            this.ghosts[i].mode = this.ghosts[i].STOP;
        }
    },

    //Fonction qui update l'icone et verifie si pacman arrive sur le point de connexion
    isArrived: function(){
      this.icon.x = this.pacman.sprite.x - 8;
      this.icon.y = this.pacman.sprite.y - 20;
      if(this.pacman.sprite.overlap(this.end) && this.end.visible === true){
        this.end.visible = false;
        this.icon.visible = false;
        this.money += 1000;
        return 1;
      }else{
        return 0;
      }
    },

    update: function () {
        this.scoreText.text = "Money: " + this.score;
        this.moneyText.text = "Energy: " + this.money;
        //console.log("Pacman: ("+ this.pacman.sprite.x+","+this.pacman.sprite.y+")  Test: ("+test.x+","+test.y+")");
        if(this.money >= 5000 && this.score >=400){
          this.stopGhosts();
          game.add.text(8, 8, "YOU WON!", { fontSize: "100px", fill: "#fff" });
        }
        if(this.pacman.sprite.overlap(this.start) && this.start.visible === true){
          this.getObject()
        }

        if(this.icon != undefined){
        if(this.isArrived()){
          var canPop = 0;
          while(!canPop){
            var posX = this.getRandomInt(0, 45); var posY = this.getRandomInt(0, 30);
            if((this.map.getTile(Math.trunc(posX), Math.trunc(posY)).index) == 14){
              canPop = 1;
            }
          }
          this.start.destroy();
          this.start = game.add.sprite(this.map.getTile(posX,posY).left,this.map.getTile(posX,posY).top, 'eclair');
          this.start.animations.add('thunder', [0, 1, 2, 3,4], 20, true);
          this.start.play('thunder');
          this.start.visible = true;
        }
      }
        if (!this.pacman.isDead) {
            for (var i=0; i<this.ghosts.length; i++) {
                if (this.ghosts[i].mode !== this.ghosts[i].RETURNING_HOME) {
                    this.physics.arcade.overlap(this.pacman.sprite, this.ghosts[i].ghost, this.dogEatsDog, null, this);
                }
            }



            //this.pop();

            if (this.TOTAL_DOTS - this.numDots > 30 && !this.isInkyOut) {
                this.isInkyOut = true;
                this.sendExitOrder(this.inky);
            }

            if (this.numDots < this.TOTAL_DOTS/3 && !this.isClydeOut) {
                this.isClydeOut = true;
                this.sendExitOrder(this.clyde);
            }


            if (this.changeModeTimer !== -1 && !this.isPaused && this.changeModeTimer < this.time.time) {
                this.currentMode++;
                this.changeModeTimer = this.time.time + this.TIME_MODES[this.currentMode].time;
                if (this.TIME_MODES[this.currentMode].mode === "chase") {
                    this.sendAttackOrder();
                } else {
                    this.sendScatterOrder();
                }
                console.log("new mode:", this.TIME_MODES[this.currentMode].mode, this.TIME_MODES[this.currentMode].time);
            }
            if (this.isPaused && this.changeModeTimer < this.time.time) {
                this.changeModeTimer = this.time.time + this.remainingTime;
                this.isPaused = false;
                if (this.TIME_MODES[this.currentMode].mode === "chase") {
                    this.sendAttackOrder();
                } else {
                    this.sendScatterOrder();
                }
                console.log("new mode:", this.TIME_MODES[this.currentMode].mode, this.TIME_MODES[this.currentMode].time);
            }
        }

        this.pacman.update();
		this.updateGhosts();

        this.checkKeys();
        this.checkMouse();
    },

    enterFrightenedMode: function() {
        for (var i=0; i<this.ghosts.length; i++) {
            this.ghosts[i].enterFrightenedMode();
        }
        if (!this.isPaused) {
            this.remainingTime = this.changeModeTimer - this.time.time;
        }
        this.changeModeTimer = this.time.time + this.FRIGHTENED_MODE_TIME;
        this.isPaused = true;
        console.log(this.remainingTime);
    },

    isSpecialTile: function(tile) {
        for (var q=0; q<this.SPECIAL_TILES.length; q++) {
            if (tile.x === this.SPECIAL_TILES[q].x && tile.y === this.SPECIAL_TILES[q].y) {
                return true;
            }
        }
        return false;
    },

    updateGhosts: function() {
        for (var i=0; i<this.ghosts.length; i++) {
            this.ghosts[i].update();
        }
    },

    render: function() {
        if (this.DEBUG_ON) {
            for (var i=0; i<this.ghosts.length; i++) {
                var color = "rgba(0, 255, 255, 0.6)";
                switch (this.ghosts[i].name) {
                    case "blinky":
                        color = "rgba(255, 0, 0, 0.6";
                        break;
                    case "pinky":
                        color = "rgba(255, 105, 180, 0.6";
                        break;
                    case "clyde":
                        color = "rgba(255, 165, 0, 0.6";
                        break;
                }
                if (this.ghosts[i].ghostDestination) {
                    var x = this.game.math.snapToFloor(Math.floor(this.ghosts[i].ghostDestination.x), this.gridsize);
                    var y = this.game.math.snapToFloor(Math.floor(this.ghosts[i].ghostDestination.y), this.gridsize);
                    this.game.debug.geom(new Phaser.Rectangle(x, y, 16, 16), color);
                }
            }
            if (this.debugPosition) {
                this.game.debug.geom(new Phaser.Rectangle(this.debugPosition.x, this.debugPosition.y, 16, 16), "#00ff00");
            }
        } else {
            this.game.debug.reset();
        }
    },

    sendAttackOrder: function() {
        for (var i=0; i<this.ghosts.length; i++) {
            this.ghosts[i].attack();
        }
    },

    sendExitOrder: function(ghost) {
        ghost.mode = this.clyde.EXIT_HOME;
    },

    sendScatterOrder: function() {
        for (var i=0; i<this.ghosts.length; i++) {
            this.ghosts[i].scatter();
        }
    }
};

game.state.add('Game', PacmanGame, true);
