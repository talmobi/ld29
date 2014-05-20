/**
  * STATS
  */
var stats = new Stats();
stats.setMode(0);
// Align top-left
stats.domElement.style.position = 'absolute';
stats.domElement.style.left = '260px';
stats.domElement.style.top = '5px';
document.body.appendChild( stats.domElement );

/**
  * Game variables
  */
var width = 384;
var height = width * 9 / 16;
var scale = 1;
var tileSize = 2; // in pixels
var gravity = .1 / 2;

var globalTicks = 0;

var entities = [];
var buffer = [];

var updateMode = 1;

var fps = 30;

var once = false;
var mousePressed = false;


// init an empty map array
function array2D(w,h) {
  var w = Math.floor(width / tileSize);
  var h = Math.floor(height / tileSize);
    var arr = new Array(w);
  for (var i = 0; i < w; i++) {
    arr[i] = new Array(h);
  }
  //console.log(arr);
  return arr;
}

var map = (array2D)();
var buffertiles = [];
var tileBatch;

// make a sliced map container
// slice it into 4 by 4
var contSize = 4; // containers size 4 by 4 = 16 in total
var contWidth = (width / contSize); // single container width
var contHeight = (height / contSize); // single container width

// init map containers
var mapContainers = (function() {
  var w = contSize;
  var h = contSize;
    var arr = new Array(w);
  for (var i = 0; i < w; i++) {
    arr[i] = new Array(h);
  }
  //console.log(arr);
  return arr;
})();

for (var i = 0; i < 4; i++) {
  for (var j = 0; j < 4; j++) {
    // mapContainers[i][j] = new c.Container();
  }
}

var sprSheet = {};
var sprTiles = [];

var game;
var divid;
var scale = 1;
var nn = true; // nearest neighbor scaling


/**
  * Preload assets
  */
function preload() {
  game.load.image('level', 'assets/level.png');
  game.load.spritesheet('sheet', 'assets/sheet.png', 9, 9);
  game.load.spritesheet('tiles', 'assets/tiles.png', 2, 2);
} // preload

// Initialize assets
function create() {
  game.input.maxPointers = 1;

  /**
    * load level data
    * To get the pixel data we need to first
    * draw the image into a canvas and grab the
    * imageData (pixels) from the canvas.
    */
  var img = game.cache.getImage('level');
  var imgCanvas = document.createElement('canvas');
  imgCanvas.width = img.width;
  imgCanvas.height = img.height;
  var ctx = imgCanvas.getContext('2d');

  console.log(img);

  ctx.drawImage(img, 0, 0, img.width, img.height);
  document.getElementById(divid).appendChild(imgCanvas); // delete this
  // grab image data from the imgCanvas
  var imgData = ctx.getImageData(0, 0, imgCanvas.width, imgCanvas.height);
  var pixels = imgData.data;

  //mapContainer = new Phaser.Group(game, null, 'tiles');
  tileBatch = new Phaser.SpriteBatch(game, null, 'tiles');

  // loop through the pixels 4BYTE_RGBA
  var count = 0;
  for (var i = 0; i < pixels.length; i += 4) {
    // care only about alpha atm
    var a = pixels[i+3];
    if (a === 0) {
      // skip it
    } else {
      var x = Math.floor(count % imgCanvas.width);
      var y = Math.floor(count / imgCanvas.width);

      var tile;
      if (pixels[i+2] === 255) // blue
        tile = newTile(x * tileSize, y * tileSize, 'water');
        else
        tile = newTile(x * tileSize, y * tileSize);
      map[x][y] = tile;
      tileBatch.add(tile);
    }

    count++;
  }

  // add the tilecontainer
  game.world.add(tileBatch);

  console.log("count: " + count);


  /**
    * Scaling
    */
  if (this.game.device.desktop) {
    game.scale.pageAlignHorizontally = true;
    game.scale.refresh();
  }
  game.scale.setShowAll();
  game.scale.refresh();

  /**
    * Add input events
    */
  // add tiles when mouse is pressed
  game.input.onDown.add(function() {
    mousePressed = true;
    console.log("pressed");
  });

  game.input.onUp.add(function() {
    mousePressed = false;
    console.log("released");
  });

  game.input.onHold.add(function() {
    var x = Math.floor(game.input.activePointer.clientX / scale);
    var y = Math.floor(game.input.activePointer.clientY / scale);
    if (x < 0 || x >= width || y < 0 || y >= height)
      return;
    var i = Math.floor(x / tileSize);
    var j = Math.floor(y / tileSize);
    //alert("x: " + x + ", y: " + y);
    if (!map[i][j]) {
      var t = newTile(x,y);
      map[i][j] = t;
      //buffertiles.push(t);
      tileBatch.add(t);
    }
  });



  /**
    * Add some entities
    */
  for (var i = 0; i < 180; i++) {
    var entity = newEntity(20 + 2 * i, 100);
    buffer.push(entity);
    game.world.add(entity);
  }
  for (var i = 0; i < 180; i++) {
    var entity = newEntity(19 + 2 * i, 120);
    buffer.push(entity);
    game.world.add(entity);
  }

  game.antialias = false;

} // create


function init(_divid, _scale, _nn) {
  game = new Phaser.Game(width,height,Phaser.CANVAS, _divid || 'container', {
    preload: preload,
    create: create,
    update: update,
    render: render
  });

  scale = (_scale || scale) | 0;
  divid = _divid;
}


/**
  * Game objects creators
  */
var newTile = function(x, y, type) {
  var n = 0;
  if (type === 'water') {
    n = 4;
  }
  var spr = new Phaser.Sprite(game, x | 0, y | 0, 'tiles', n);
  spr.anchor.set(0,0);
  spr.smoothed = false;
  spr.type = type || 'ground';
  spr.exists = true;
  spr.snapToPixel = true;

  // make sure the position is snapped into
  // a tileSize x tileSize grid (2 x 2)
  spr.x = Math.floor(x / tileSize) * tileSize;
  spr.y = Math.floor(y / tileSize) * tileSize;

  spr.w = tileSize * scale;
  spr.h = tileSize * scale;
  return spr;
}

/**
  * Entity
  */
var newEntity = function(x, y, color) {
  //var self = sprSheet.greenguy.clone();
  var self = new Phaser.Sprite(game, x | 0, y | 0, 'sheet', 0);

  self.snapToPixel = true;
  self.smoothed = false;
  self.removed = false;
  self.x = x;
  self.y = y;
  self.w = 9;
  self.h = 9;
  self.anchor.setTo(0.5, 0);

  //self.filters = [new createjs.ColorFilter(1,0,0,1)];

  // Test fields
  self.ticks = 0;
  self.aliveTime = globalTicks + Math.floor(Math.random() * 100) * 5 + 90;

  self.yspeed = 0;
  self.xspeed = 0;

  self.onFloor = false;

  self.jumpPower = 4 / 2;
  self.lastyspeed = 0;

  /**
    * Entity tick
    */
  self.tick = function() {
    if (this.removed) {
      return;
    }

    if (globalTicks > this.aliveTime) {
      this.removed = true;
      // add another entity
      this.createCopy();
      return;
    }

    // make the sprite flip from left to right at the inflection point
    if (this.lastyspeed < 0 && this.yspeed >= 0 && !this.onFloor) {
      this.scale.x *= -1;
    }
    this.lastyspeed = this.yspeed;

    // apply gravity and collision detection if not on floor
    if (!this.onFloor) {
      var i = Math.floor( (this.x) / tileSize );
      var j = Math.floor( (this.y + this.h + this.yspeed)  / tileSize );
      var t = map[i][j] || map[i][j+1];
      //if (!t) return;
      if (!t || this.yspeed < 0) {
        this.yspeed += gravity;
        //if (this.currentAnimation !== 'walk')
          //this.gotoAndPlay("walk");
      } else {

        switch (t.type) {
          case 'water':
            if (Math.abs(this.yspeed) > 1)
              this.yspeed *= 0.85;
            if (Math.abs(this.yspeed) > 0.2)
              this.yspeed *= 0.95;
            if (Math.abs(this.yspeed) < .15) {
              var s = 1;
              if (this.yspeed < 0) {
                s = -1;
              }
              this.yspeed = 0.15 * s;
            }
            break;
          case 'ground':
            if (map[i][j - 1] &&  map[i][j - 1].type === 'ground')
              t = map[i][j - 1];
            this.onFloor = true;
            this.yspeed = 0;
            this.y = t.y - this.h;
            //this.gotoAndStop("stand");

            var that = this;
            var j = function() {
              that.jump(Math.random() * that.jumpPower);
            };

            // TODO
            setTimeout(function() {
              j();
            }, Math.random() * 5 * 250);

            break;
        }
      }

      this.y += this.yspeed;
      this.x += this.xspeed;    
    } // tick

    self.jump = function(amount) {
      if (this.onFloor) {
        this.onFloor = false;
        this.yspeed = -amount;
      }
    } // jump

    self.createCopy = function() {
      var e = newEntity( this.x, this.y);
      buffer.push( e );
    }
  }

  return self;
}


/**
  * Shape creators
  */
var newBox = function(x,y,w,h,color) {
  var box = game.add.graphics(0,0);
  box.lineStyle(1, color || "white", 1);
  box.drawRect(x, y, w, h);
  return box;
}


/**
  * tick
  */
function update() {
  globalTicks++;
  stats.begin();


  if (mousePressed) {
    //var x = Math.floor(game.input.activePointer.clientX / scale);
    //var y = Math.floor(game.input.activePointer.clientY / scale);
    var x = Math.floor(game.input.worldX);
    var y = Math.floor(game.input.worldY);
    if (x < 0 || x >= width || y < 0 || y >= height)
      return;
    var i = Math.floor(x / tileSize);
    var j = Math.floor(y / tileSize);
    //alert("x: " + x + ", y: " + y);
    if (!map[i][j]) {
      var t = newTile(x,y);
      map[i][j] = t;
      //buffertiles.push(t);
      tileBatch.add(t);
    }
  }


  switch (updateMode) {
    case 0:
      swap();
      break;
    case 1:
      inplace();
      break;
    case 2:
      spliceupdate();
      break;
  }

}

function render() {
  stats.end();
}

function swap() {
  for (var i = 0; i < entities.length; i++) {
    var e = entities[i];
    if (!e.removed) {
      e.tick();
      buffer.push(e);
    } else {
      stage.removeChild(e);
    }
  }

  // swap
  var t = entities;
  entities = buffer;
  buffer = t;

  // clear the buffer (faster than buffer.clear())
  while (buffer.length > 0) {
    buffer.pop();
  }
  // src: http://stackoverflow.com/questions/1232040/how-to-empty-an-array-in-javascript
}

function spliceupdate() {
  for (var i = 0; i < entities.length; i++) {
    var e = entities[i];
    if (!e.removed) {
      e.tick();
    } else {
      stage.removeChild(e);
      // splice the entity out
      entities.splice(i--, 1);
    }
  }

  // add new entities
  while (buffer.length > 0) {
    entities.push( buffer.pop() );
  }
}

function inplace() {
  var removed = 0;
  for (var i = 0; i < entities.length; i++) {
    var e = entities[i];
    if (!e.removed) {
      e.tick();
      if (removed > 0) {
        entities[i - removed] = e;
      }
    } else {
      e.destroy();
      removed++;
    }
  }
  if (removed > 0) {
    // trim the list
    entities.length = entities.length - removed;
  }


  // clear the buffer (faster than buffer.clear())
  while (buffer.length > 0) {
    var e = buffer.pop();
    entities.push( e );
    game.world.add(e);
    //stage.addChild(e);
  }
  // src: http://stackoverflow.com/questions/1232040/how-to-empty-an-array-in-javascript
}