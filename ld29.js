var c = createjs;

/**
  * STATS
  */
var stats = new Stats();
stats.setMode(1);
// Align top-left
stats.domElement.style.position = 'absolute';
stats.domElement.style.left = '260px';
stats.domElement.style.top = '10px';
document.body.appendChild( stats.domElement );

/**
  * Game variables
  */
var width = 384;
var height = width * 9 / 16;
var scale = 2;
var tileSize = 2; // in pixels
var gravity = .1;

var globalTicks = 0;

var entities = [];
var buffer = [];

// 0 - swap // slow
// 1 - inplace // standard
// 2 - splice
var updateMode = 1;

var stage;
var fps = 30;

var once = false;
var mousePressed = false;

var blurryScaling = false;

var GLOBAL = {
}


/**
  * Load assets
  */
// init an empty map array
var map = (function() {
  var w = width / tileSize;
  var h = height / tileSize;
    var arr = new Array(w);
  for (var i = 0; i < w; i++) {
    arr[i] = new Array(h);
  }
  //console.log(arr);
  return arr;
})();
var buffertiles = [];

var sprSheet = {};
var sprTiles = [];

var init = function(_scale, _tileScaleMethod, _bs) {
  scale = _scale || scale;
  var tileMethod = typeof _tileScaleMethod === 'number' ? _tileScaleMethod : 1;
  blurryScaling = typeof _bs === 'boolean' ? _bs : false;

  var manifest = [
    {src:"assets/level.png", id:"level"},
    {src:"assets/sheet.png", id:"sheet"},
    {src:"assets/tiles.png", id:"tiles"}
  ];

  var loader = new c.LoadQueue(false);
  loader.loadManifest(manifest);

  loader.addEventListener("complete", function() {

    /**
      * load tiles sprites
      */
    var data = {
      images: [loader.getResult("tiles")],
      frames: {width: tileSize, height: tileSize}
    }
    var tileSheet = new c.SpriteSheet(data);
    for (var i = 0; i < tileSheet._frames.length; i++) {
      switch (tileMethod) {
        case 0: // bleeding
          var spr = new c.Sprite(tileSheet, i);
          spr.gotoAndStop(i);
          sprTiles.push(spr);
          break;

        case 1: // no bleeding
          var frame = createjs.SpriteSheetUtils.extractFrame(tileSheet, i);
          var bm = new createjs.Bitmap(frame);
          sprTiles.push(bm);
          break;
      }

      /*
      spr bleeds if scaled
      var spr = new c.Sprite(tileSheet, i);
      spr.gotoAndStop(i);
      sprTiles.push(spr);
      */

      //console.log(spr);
      /*
      var frame = sheet.getFrame(i);
      var bm = new createjs.Bitmap( frame.image );
      bm.sourceRect = frame.rect;
      sprTiles.push(bm);
      */

      /*
      // scale bleed fix
      var frame = createjs.SpriteSheetUtils.extractFrame(sheet, i);
      var bm = new createjs.Bitmap(frame);
      sprTiles.push(bm);
      */
      
    }

    /**
      * load sprite sheet
      */
    var data = {
      images: [loader.getResult("sheet")],
      frames: {width: 9, height: 9},
      animations: {
        stand: 0,
        walk: {
          frames: [1, 0, 2, 0],
          speed: 1/4
        },
        build: [11, 12],
        spawn: [3, 4],
        gunwalk: {
          frames: [21, 20, 22, 20]
        },
        gunwalkshot: {
          frames: [31, 30, 32, 30]
        },
        voidwalk: [40,41],
        squidwalk: [50,51],
        squidshoot: [52, 53],
        fishmissile: [60, 61],
        treespawn: [70, 79],
        tree: 79,
        treetrapspawn: [80, 84],
        treetrap: 84,
        blueguywalk: {
          frames: [90, 91, 92, 91]
        },
        blueguyshoot: [93,95]
      }
    }
    var spriteSheet = new c.SpriteSheet(data);

    sprSheet = {
      greenguy: new c.Sprite(spriteSheet, "walk")
    }

    /*
    sprSheet = {
      stand: new c.Sprite(spriteSheet, "stand"),
      walk: new c.Sprite(spriteSheet, "walk"),
      build: new c.Sprite(spriteSheet, "buildd"),
      spawn: new c.Sprite(spriteSheet, "spawn"),
      gunwalk: new c.Sprite(spriteSheet, "gunwalk"),
      gunwalkshot: new c.Sprite(spriteSheet, "gunwalkshot"),
      voidwalk: new c.Sprite(spriteSheet, "voidwalk"),
      squidwalk: new c.Sprite(spriteSheet, "squidwalk"),
      squidshoot: new c.Sprite(spriteSheet, "squidshoot"),
      fishmissile: new c.Sprite(spriteSheet, "fishmissile"),
      treespawn: new c.Sprite(spriteSheet, "treespawn"),
      tree: new c.Sprite(spriteSheet, "tree"),
      treetrapspawn: new c.Sprite(spriteSheet, "treetrapspawn"),
      treetrap: new c.Sprite(spriteSheet, "treetrap"),
      blueguywalk: new c.Sprite(spriteSheet, "blueguywalk"),
      blueguyshoot: new c.Sprite(spriteSheet, "blueguyshoot"),
    }
    */

    /**
      * load level data
      * To get the pixel data we need to first
      * draw the image into a canvas and grab the
      * imageData (pixels) from the canvas.
      */
    var imgCanvas = document.createElement('canvas');
    imgCanvas.width = Math.floor(width / 2);
    imgCanvas.height = Math.floor(height / 2);
    var ctx = imgCanvas.getContext('2d');
    var img = loader.getResult("level");

    img.width = imgCanvas.width;
    img.height = imgCanvas.height;

    console.log(img);

    ctx.drawImage(loader.getResult("level"), 0, 0, img.width, img.height);
    document.body.appendChild(imgCanvas); // delete this
    // grab image data from the imgCanvas
    var imgData = ctx.getImageData(0, 0, imgCanvas.width, imgCanvas.height);
    var pixels = imgData.data;

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
      }

      count++;
    }

    console.log("count: " + count);

    /**
      * And finally start the game
      */
    main();
  });
}


/**
  * main
  */

var main = function() {
  var canvas = document.getElementById('myCanvas');

  canvas.width = width * scale;
  canvas.height = height * scale;

  /*
  var ctx = canvas.getContext('2d');
  ctx.scale(4,4);
  */

  stage = new c.Stage(canvas);
  //canvas.getContext('2d').imageSmoothingEnabled = false;

  // between pixel fix
  stage.regX = .5;
  stage.regY = .5;

  // scale the stage
  stage.scaleX = scale;
  stage.scaleY = scale;

  stage.update();

  /**
    * Initialize Map
    */
  console.log("w: " + map.length + ", h: " + map[0].length);
  //var mapContainer = new c.Container();

  // make a sliced map container
  // slice it into 4 by 4
  var contSize = 4; // containers size 4 by 4 = 16 in total
  var contWidth = (width / contSize); // single container width
  var contHeight = (height / contSize); // single container width
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
      mapContainers[i][j] = new c.Container();
    }
  }

  // populate the mapContainers with tiles from the map
  for (var i = 0; i < map.length; i++) {
    for (var j = 0; j < map[0].length; j++) {
      var t = map[i][j];
      if (!t)
        continue; // skip empty tiles
      
      // find the correct container
      var x = Math.floor(i / (contWidth / tileSize) );
      var y = Math.floor(j / (contHeight / tileSize) );
      mapContainers[x][y].addChild(t);
    }
  }

  // cache the containers
  for (var i = 0; i < contSize; i++) {
    for (var j = 0; j < contSize; j++) {
      var cw = contWidth;
      var ch = contHeight;

      if (blurryScaling) // blurry scaling
        mapContainers[i][j].cache(i * cw, j * ch, cw, ch);
        else // pixelated scaling
        mapContainers[i][j].cache(i * cw, j * ch, cw, ch, scale);

      stage.addChild(mapContainers[i][j]);
    }
  }

  /* OLD single container cache ( slow re-caching )
  cache the map (draw time reduced dramatically)
  mapContainer.cache(0, 0, width, height);
  mapContainer.snapToPixel = true;

  stage.addChild(mapContainer);*/

  /**
    * add some entities
    */
  for (var i = 0; i < 180; i++) {
    var entity = newEntity(20 + 2 * i, 100);
    buffer.push(entity);
    stage.addChild(entity);
  }
  for (var i = 0; i < 180; i++) {
    var entity = newEntity(19 + 2 * i, 120);
    buffer.push(entity);
    stage.addChild(entity);
  }


  // add tiles when mouse is pressed
  stage.addEventListener('stagemousemove', function(evt) {
    if (mousePressed) {
      var x = Math.floor(evt.stageX / scale);
      var y = Math.floor(evt.stageY / scale);
      if (x < 0 || x >= width || y < 0 || y >= height)
        return;
      var i = Math.floor(x / tileSize);
      var j = Math.floor(y / tileSize);
      //alert("x: " + x + ", y: " + y);
      if (!map[i][j]) {
        var t = newTile(x,y);
        map[i][j] = t;
        stage.addChild(t);
        buffertiles.push(t);
        mapContainers[Math.floor(x / contWidth)][Math.floor(y / contHeight)].addChild(t.clone());
      }
    }
  });

  stage.addEventListener('stagemousedown', function(evt) {
    mousePressed = true;
  });

  stage.addEventListener('stagemouseup', function(evt) {
    mousePressed = false;

    // find the affected parts of the map that needs an update
    for (var i = 0; i < 4; i++) {
      for (var j = 0; j < 4; j++) {
        mapContainers[i][j].shouldUpdate = false;
      }
    }

    // remove the tiles from the root stage
    while (buffertiles.length > 0) {
      var t = buffertiles.pop();
      var x = Math.floor(t.x / (contWidth) );
      var y = Math.floor(t.y / (contHeight) );
      //console.log("x: " + x + ", y: " + y);
      mapContainers[x][y].shouldUpdate = true;
      stage.removeChild(t);
    }
    //mapContainers.updateCache();

    // update the affected parts of the map
    for (var i = 0; i < 4; i++) {
      for (var j = 0; j < 4; j++) {
        if (mapContainers[i][j].shouldUpdate) {
          mapContainers[i][j].updateCache();
          mapContainers[i][j].shouldUpdate = false;

          // add a tempory visual queue on the updated part
          var box = newBox(i * 96 + 1, j * 54 + 1, 96 - 1, 54 - 1, "red");
          stage.addChild(box);

          var removeBox = function(b) {
            return function() {
              stage.removeChild(b);
            }
          }

          setTimeout(removeBox(box), 1000);
        }
      }
    }

  });


  /**
    * add a border and update stage
    */
  var border = newBox(1, 1, width - 1, height - 1);
  stage.addChild(border);

  stage.update();

  /**
    * configure Ticker
    */
  c.Ticker.addEventListener('tick', tick);
  //c.Ticker.timingMode = c.Ticker.RAF;
  c.Ticker.setFPS(fps);
}

/**
  * Game objects creators
  */
var newTile = function(x, y, type) {
  var n = 0;
  if (type === 'water') {
    n = 4;
  }
  var spr = sprTiles[n].clone();
  spr.type = type || 'ground';
  spr.exists = true;
  spr.snapToPixel = true;

  // make sure the position is snapped into
  // a tileSize x tileSize grid (2 x 2)
  spr.x = Math.floor(x / tileSize) * tileSize;
  spr.y = Math.floor(y / tileSize) * tileSize;

  spr.w = tileSize * 2;
  spr.h = tileSize * 2;
  return spr;
}

/**
  * Entity
  */
var newEntity = function(x, y, color) {
  var self = sprSheet.greenguy.clone();
  self.snapToPixel = true;
  self.removed = false;
  self.x = x;
  self.y = y;
  self.w = 9;
  self.h = 9;

  //self.filters = [new createjs.ColorFilter(1,0,0,1)];

  // Test fields
  self.ticks = 0;
  self.aliveTime = globalTicks + Math.floor(Math.random() * 100) * 5 + 90;

  self.yspeed = 0;
  self.xspeed = 0;

  self.onFloor = false;

  self.jumpPower = 4;
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
      var e = newEntity( this.x, this.y);
      buffer.push( e );
      stage.addChild( e );
      return;
    }

    // make the sprite flip from left to right at the inflection point
    if (this.lastyspeed < 0 && this.yspeed >= 0 && !this.onFloor) {
      this.scaleX *= -1;
      if (this.scaleX < 0)
        this.regX = 9;
      else
        this.regX = 0;
    }
    this.lastyspeed = this.yspeed;

    // apply gravity and collision detection if not on floor
    if (!this.onFloor) {
      var i = Math.floor( (this.x + 4) / tileSize );
      var j = Math.floor( (this.y + this.h + this.yspeed)  / tileSize );
      var t = map[i][j] || map[i][j+1];
      //if (!t) return;
      if (!t || this.yspeed < 0) {
        this.yspeed += gravity;
        if (this.currentAnimation !== 'walk')
          this.gotoAndPlay("walk");
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
            this.gotoAndStop("stand");

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
    }

    self.jump = function(amount) {
      if (this.onFloor) {
        this.onFloor = false;
        this.yspeed = -amount;
      }
    }
  }

  return self;
}


/**
  * Shape creators
  */
var newBox = function(x,y,w,h,color) {
  var box = new c.Shape();
  box.snapToPixel = true;
  box.graphics.setStrokeStyle(1).beginStroke(color || "white").rect(x, y, w, h);
  return box;
}


/**
  * tick
  */
var tick = function() {
  globalTicks++;
  stats.begin();

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

  stage.update();

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
      stage.removeChild(e);
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
    //stage.addChild(e);
  }
  // src: http://stackoverflow.com/questions/1232040/how-to-empty-an-array-in-javascript
}