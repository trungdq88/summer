const MAX_WATER_MASS = 1000;
const MIN_WATER_PRESSURE = 500;
const MIN_WATER = 50;
const ERROR_RATE = 0.01;
const GRAVITY_FORCE = 5;
const AIR_FRICION = 1.5;
const AIR_MAX_FORCE = 10;
const WATER_PRESSURE = 1.02;
const WATER_FLOW_SPEED = 0.5;

let showMass = false;
let grid;
let simulating = true;
let isPainting = false;
let debugDiv;

boats = [];

function _log(...args) {
  // console.log(...args);
}

class Grid {
  constructor(width, height, tileSize) {
    this.width = width;
    this.height = height;
    this.tileSize = tileSize;

    this.data = [];

    for (let i = 0; i < width; i++) {
      let line = [];
      for (let j = 0; j < height; j++) {
        line.push(new Tile(this, i, j, new Vaccum(), tileSize));
      }
      this.data.push(line);
    }
  }

  draw() {
    this.update();

    this.iterateTiles((tile) => {
      tile.draw();
    });

    push();
    let fps = frameRate();
    fill(255);
    stroke(0);
    text('FPS: ' + fps.toFixed(2), 10, height - 10);
    pop();
  }

  iterateTiles(fn) {
    for (let i = 0; i < this.data.length; i++) {
      for (let j = 0; j < this.data.length; j++) {
        fn(this.data[i][j], i, j);
      }
    }
  }

  throwBoundary(i, j) {
    if (i < 0 || i >= this.width) {
      throw Error('exceed i boundary!');
    }
    if (j < 0 || j >= this.height) {
      throw Error('exceed j boundary!');
    }
  }

  tileAt(x, y) {
    const i = Math.floor(x / this.tileSize);
    const j = Math.floor(y / this.tileSize);
    try {
      this.throwBoundary(i, j);
    } catch (e) {
      return undefined;
    }
    return this.data[i][j];
  }

  getNeighbourTiles(tile) {
    let top, right, bottom, left;

    if (tile.i > 0) {
      left = this.data[tile.i - 1][tile.j];
    }
    if (tile.i < this.width - 1) {
      right = this.data[tile.i + 1][tile.j];
    }
    if (tile.j > 0) {
      top = this.data[tile.i][tile.j - 1];
    }
    if (tile.j < this.height - 1) {
      bottom = this.data[tile.i][tile.j + 1];
    }

    return { top, right, bottom, left };
  }

  update() {
    if (simulating) {
      simulate(this);
    }
  }
}

class Tile {
  constructor(containerGrid, i, j, content, size) {
    this.i = i;
    this.j = j;
    this.content = content;
    this.size = size;
    this.content.setContainerTile(this);
    this.evictContent = null;
    this.containerGrid = containerGrid;
  }

  setContent(content) {
    this.content = content;
    this.content.setContainerTile(this);
  }

  draw() {
    this.content.draw();
  }

  replaceContent(newContent) {
    if (newContent.name === this.content.name) {
      return;
    }
    this.evictContent = this.content;
    this.content = newContent;
    this.content.setContainerTile(this);
  }

  getTop() {
    return this.containerGrid.getNeighbourTiles(this).top;
  }
}

class Content {
  constructor() {
    this.mass = 0;
  }

  setContainerTile(tile) {
    this.containerTile = tile;
  }

  debug() {
    return {};
  }
}

class Air extends Content {
  constructor(mass = 1.3) {
    super();
    this.name = 'air';
    this.mass = mass;
  }

  isWaterFlowable() {
    return true;
  }

  isAirFlowable() {
    return true;
  }

  isOverPressure() {
    return false;
  }

  draw() {
    push();
    let p = ((this.mass + 0.2) * 100) / 20;
    p = constrain(p, 5, 85);
    fill(color(`hsl(0, 0%, ${100 - p}%)`));
    rect(
      this.containerTile.i * this.containerTile.size,
      this.containerTile.j * this.containerTile.size,
      this.containerTile.size,
      this.containerTile.size
    );
    if (showMass) {
      fill('black');
      text(
        Math.floor(this.mass * 10) / 10,
        this.containerTile.i * this.containerTile.size,
        this.containerTile.j * this.containerTile.size +
          this.containerTile.size / 3
      );
    }
    pop();
  }

  debug() {
    return {
      class: 'Air',
      position: [this.containerTile.i, this.containerTile.j],
      mass: this.mass,
      debug: this._debug
    };
  }
}

class Vaccum extends Content {
  constructor() {
    super();
    this.name = 'vaccum';
    this.mass = 0;
  }

  isWaterFlowable() {
    return true;
  }

  isAirFlowable() {
    return true;
  }

  draw() {
    push();
    fill(color('white'));
    rect(
      this.containerTile.i * this.containerTile.size,
      this.containerTile.j * this.containerTile.size,
      this.containerTile.size,
      this.containerTile.size
    );
    pop();
  }

  debug() {
    return {
      class: 'Vaccum',
      position: [this.containerTile.i, this.containerTile.j],
      mass: this.mass,
      debug: this._debug
    };
  }
}

class Water extends Content {
  constructor(mass = 1000) {
    super();
    this.name = 'water';
    this.mass = mass;
  }

  isWaterFlowable() {
    return true;
  }

  isAirFlowable() {
    return false;
  }

  isOverPressure() {
    return this.mass >= MAX_WATER_MASS;
  }

  draw() {
    push();
    let p = (1 - this.mass / 1800) * 100;
    p = constrain(p, 10, 60);
    fill('white');
    rect(
      this.containerTile.i * this.containerTile.size,
      this.containerTile.j * this.containerTile.size,
      this.containerTile.size,
      this.containerTile.size
    );
    fill(color(`hsl(208, 98%, ${p}%)`));

    if (
      this.containerTile.getTop() &&
      this.containerTile.getTop().content.name === 'water'
    ) {
      rect(
        this.containerTile.i * this.containerTile.size,
        this.containerTile.j * this.containerTile.size,
        this.containerTile.size,
        this.containerTile.size
      );
    } else {
      rect(
        this.containerTile.i * this.containerTile.size,
        this.containerTile.j * this.containerTile.size +
          this.containerTile.size *
            (1 - Math.min(1, this.mass / MAX_WATER_MASS)),
        this.containerTile.size,
        this.containerTile.size * Math.min(1, this.mass / MAX_WATER_MASS)
      );
    }

    if (showMass) {
      fill('black');
      text(
        Math.floor(this.mass * 10) / 10,
        this.containerTile.i * this.containerTile.size,
        this.containerTile.j * this.containerTile.size +
          this.containerTile.size / 3
      );
    }
    pop();
  }

  debug() {
    return {
      class: 'Water',
      mass: this.mass,
      position: [this.containerTile.i, this.containerTile.j],
      debug: this._debug
    };
  }
}

class Rock extends Content {
  constructor(mass = 1) {
    super();
    this.name = 'rock';
    this.mass = mass;
  }

  isOverPressure() {
    return true;
  }

  isWaterFlowable() {
    return false;
  }

  isAirFlowable() {
    return false;
  }

  draw() {
    push();
    fill(color('black'));
    rect(
      this.containerTile.i * this.containerTile.size,
      this.containerTile.j * this.containerTile.size,
      this.containerTile.size,
      this.containerTile.size
    );
    pop();
  }
}

function setup() {
  createCanvas(600, 600);
  // grid = new Grid(5, 5, 120);
  // grid = new Grid(10, 10, 60);
  grid = new Grid(20, 20, 30);
  // grid = new Grid(30, 30, 20);
  // grid = new Grid(40, 40, 15);
  debugDiv = createDiv('debug');
  massCheckDiv = createDiv('massCheck');
}

function draw() {
  noStroke();
  grid.draw();

  if (isPainting) {
    const targetedTile = grid.tileAt(mouseX, mouseY);
    if (!targetedTile) {
      return;
    }
    if (mouseButton === LEFT) {
      targetedTile.replaceContent(new Rock());
    } else {
      targetedTile.replaceContent(new Water());
    }
  }

  boats.forEach((boat) => {
    boat.draw();
  });
}

function mousePressed() {
  _log('pressed');
  isPainting = true;
}

function mouseReleased() {
  _log('released');
  isPainting = false;
}

function keyPressed() {
  if (keyCode === 39) {
    // right arrow
    simulate(grid);
  }

  if (keyCode === 32) {
    // space
    simulating = !simulating;
  }

  const targetedTile = grid.tileAt(mouseX, mouseY);

  if (keyCode === 38) {
    // up
    targetedTile.content.mass *= 2;
  }

  if (keyCode === 40) {
    // down
    targetedTile.content.mass /= 2;
  }

  if (keyCode === 65) {
    // a
    targetedTile.replaceContent(new Air());
  }

  if (keyCode === 87) {
    // w
    targetedTile.replaceContent(new Water());
  }

  if (keyCode === 82) {
    // r
    targetedTile.replaceContent(new Rock());
  }

  if (keyCode === 86) {
    // r
    targetedTile.replaceContent(new Vaccum());
  }

  if (keyCode === 83) {
    // s
    showMass = !showMass;
  }

  if (keyCode === 77) {
    // m
    massCheck();
  }

  if (keyCode === 66) {
    // b
    addBoat();
  }
}

document.oncontextmenu = function () {
  return false;
};

function simulate(grid) {
  // Calculate airDiff
  const airDiff = {};
  const waterDiff = {};

  grid.iterateTiles((tile) => {
    const neighbours = grid.getNeighbourTiles(tile);
    if (tile.content instanceof Water) {
      _log('diff before flow water', JSON.stringify(waterDiff, null, 2));
      flowWater(tile.content, waterDiff, neighbours);
      _log('diff after flow water', JSON.stringify(waterDiff, null, 2));
    }

    if (tile.content instanceof Air) {
      flowAir(tile.content, airDiff, neighbours);
    }

    if (tile.evictContent) {
      _log('evicting...', tile.evictContent);
      if (tile.evictContent instanceof Air) {
        flowAir(tile.evictContent, airDiff, neighbours, true);
      } else if (tile.evictContent instanceof Water) {
        _log('diff before evict water', JSON.stringify(waterDiff, null, 2));
        flowWater(tile.evictContent, waterDiff, neighbours, true);
        _log('diff after evict water', JSON.stringify(waterDiff, null, 2));
      } else {
        tile.evictContent = null;
      }
    }
  });

  _log('airDiff', airDiff);
  _log('waterDiff', waterDiff);

  // Diff check
  let totalMass = 0;
  Object.keys(airDiff).forEach((i) => {
    Object.keys(airDiff[i]).forEach((j) => {
      totalMass += airDiff[i][j];
    });
  });

  if (Math.abs(totalMass) >= ERROR_RATE) {
    throw Error('Incorrect airDiff! ' + totalMass);
  }

  totalMass = 0;
  Object.keys(waterDiff).forEach((i) => {
    Object.keys(waterDiff[i]).forEach((j) => {
      totalMass += waterDiff[i][j];
    });
  });

  if (Math.abs(totalMass) >= ERROR_RATE) {
    throw Error('Incorrect waterDiff! ' + totalMass);
  }

  // Apply airDiff
  Object.keys(airDiff).forEach((i) => {
    Object.keys(airDiff[i]).forEach((j) => {
      const diffMass = airDiff[i][j];
      const tile = grid.data[i][j];

      if (tile.content instanceof Air) {
        tile.content.mass += diffMass;

        if (tile.content.mass <= 0) {
          tile.setContent(new Vaccum());
        }
      } else {
        if (tile.content.isAirFlowable()) {
          // check if there is any evicting air left in the tile.
          if (tile.evictContent && tile.evictContent.name === 'air') {
            const newMass = diffMass + tile.evictContent.mass;
            tile.replaceContent(new Air(newMass));
            // the evict content is now evicted to this same tile
            tile.evictContent = null;
          } else {
            // put air in the tile, this will evict the previous content of the tile
            tile.setContent(new Air(diffMass));
          }
        } else {
          // probably caused by evicting air
          _log('earasing air mass: ', tile.evictContent);
          tile.evictContent = null;
        }
      }
    });
  });

  Object.keys(waterDiff).forEach((i) => {
    Object.keys(waterDiff[i]).forEach((j) => {
      const diffMass = waterDiff[i][j];
      const tile = grid.data[i][j];

      if (tile.content instanceof Water) {
        tile.content.mass += diffMass;

        if (tile.content.mass <= 0) {
          if (tile.evictContent) {
            // swap
            tile.setContent(tile.evictContent);
            tile.evictContent = null;
          } else {
            tile.setContent(new Vaccum());
          }
        }
      } else {
        if (tile.content.isWaterFlowable()) {
          // check if there is any evicting water left in the tile.
          if (tile.evictContent && tile.evictContent.name === 'water') {
            // Merge the evicting water with the diff water to fill the tile
            // with water again.
            // This happen when the water is reqested to evict the tile but then
            // there are water in other tiles pour in in the same iteration.
            const newMass = diffMass + tile.evictContent.mass;
            tile.replaceContent(new Water(newMass));
            // the evict content is now evicted to this same tile
            tile.evictContent = null;
          } else {
            // if no thing to evict, we can now replace the tile with water
            // this will also evict the current content in the tile.
            tile.replaceContent(new Water(diffMass));
          }
        } else {
          // probably caused by evicting water
          _log('earasing water mass: ', tile.evictContent);
          tile.evictContent = null;
        }
      }
    });
  });

  massCheck();
}

function mouseMoved() {
  const targetedTile = grid.tileAt(mouseX, mouseY);
  if (!targetedTile) {
    return;
  }
  showDebug(debugDiv, targetedTile.content.debug());
}

function showDebug(div, obj) {
  div.html('<pre>' + JSON.stringify(obj, null, 2) + '</pre>');
}

function flowAir(content, diff, { top, right, bottom, left }, evict = false) {
  function flowToTile(forces) {
    let lostMass = 0;

    let totalForce = forces
      .map(([_, force]) => force)
      .reduce((sum, n) => sum + n, 0);

    let totalMass = forces
      .map(([t, _]) => t.content.mass)
      .reduce((sum, n) => sum + n, 0);

    let totalFlowMass;

    if (evict) {
      totalFlowMass = content.mass;
    } else {
      let averageMass = (content.mass + totalMass) / (forces.length + 1);

      totalFlowMass = content.mass - averageMass;
    }

    if (totalFlowMass <= 0) {
      return;
    }

    forces.forEach(([dest, force]) => {
      flowMass = (totalFlowMass * force) / totalForce;
      addMass(diff, dest.i, dest.j, flowMass);
      lostMass += flowMass;
    });

    const currentTile = content.containerTile;
    addMass(diff, currentTile.i, currentTile.j, -lostMass);
  }

  const forces = [];

  [top, right, bottom, left].forEach((dest) => {
    if (dest && dest.content.isAirFlowable()) {
      let force = content.mass / dest.content.mass;

      if (evict) {
        force += 0.1;
      }

      if (force <= 1) {
        return;
      }

      if (force > AIR_MAX_FORCE) {
        force = AIR_MAX_FORCE;
      }

      forces.push([dest, 1 - force]);
    }
  });

  _log('forces', forces, top, right, bottom, left);

  if (forces.length) {
    flowToTile(forces);
  }
}

function flowWater(content, diff, { top, right, bottom, left }, evict = false) {
  let remaining = content.mass;
  let lostMass = 0;

  // Evict the all water in the current tile because another content is
  // replacing the tile.
  function evictWater() {
    _log('flowWater/evict', content);
    // Let water exit at all direction equally, seem to be an ok strategy
    const directions = [top, right, bottom, left].filter(
      (direction) => direction && direction.content.isWaterFlowable()
    );
    const flowMass = remaining / directions.length;
    directions.forEach((direction) => {
      addMass(diff, direction.i, direction.j, flowMass);
      lostMass += flowMass;
    });
  }

  // Let the water flow "naturally"
  function flows() {
    _log('flowWater/flow', content);
    if (remaining <= 0) return;

    if (bottom && bottom.content.isWaterFlowable()) {
      let bottomWaterMass = 0;

      if (bottom.content.name === 'water') {
        bottomWaterMass = bottom.content.mass;
      }

      const desiredBottomMass = calculateBottomMass(
        bottomWaterMass + remaining
      );
      let flowMass = Math.min(remaining, desiredBottomMass - bottomWaterMass);
      if (remaining - flowMass <= ERROR_RATE) {
        flowMass = remaining;
      }
      if (flowMass > 0) {
        _log('flow down', flowMass, 'desired', desiredBottomMass);

        addMass(diff, bottom.i, bottom.j, flowMass);
        lostMass += flowMass;
        remaining -= flowMass;
      }
    }

    if (remaining <= MIN_WATER) return;

    if (left && left.content.isWaterFlowable()) {
      let waterMass = 0;

      if (left.content.name === 'water') {
        waterMass = left.content.mass;
      }

      _log('flow left', left.content.mass, left.content.name);

      if (remaining > waterMass) {
        let flowMass = (remaining - waterMass) / 3;
        if (remaining - flowMass <= ERROR_RATE) {
          flowMass = remaining;
        }
        addMass(diff, left.i, left.j, flowMass);
        lostMass += flowMass;
        remaining -= flowMass;
      }
    }

    if (remaining <= MIN_WATER) return;

    if (right && right.content.isWaterFlowable()) {
      let waterMass = 0;

      if (right.content.name === 'water') {
        waterMass = right.content.mass;
      }

      if (remaining > waterMass) {
        let flowMass = (remaining - waterMass) / 3;
        if (remaining - flowMass <= ERROR_RATE) {
          flowMass = remaining;
        }
        addMass(diff, right.i, right.j, flowMass);
        lostMass += flowMass;
        remaining -= flowMass;
      }
    }

    if (remaining <= MIN_WATER) return;

    if (top && top.content.isWaterFlowable()) {
      if (remaining <= MAX_WATER_MASS) return;
      let waterMass = 0;

      if (top.content.name === 'water') {
        waterMass = top.content.mass;
      }

      const desiredBottomMass = calculateBottomMass(waterMass + remaining);
      let flowMass = Math.min(remaining, remaining - desiredBottomMass);
      if (remaining - flowMass <= ERROR_RATE) {
        flowMass = remaining;
      }
      if (flowMass > 0) {
        addMass(diff, top.i, top.j, flowMass);
        lostMass += flowMass;
        remaining -= flowMass;
      }
    }
  }

  if (evict) {
    evictWater();
  } else {
    flows();
  }

  const currentTile = content.containerTile;
  addMass(diff, currentTile.i, currentTile.j, -lostMass);
}

function addMass(diff, i, j, mass) {
  diff[i] = diff[i] || {};
  diff[i][j] = diff[i][j] || 0;
  diff[i][j] += mass;
}

// Three cases to cover:
// 1. Total is less than MAX_WATER_MASS: put all the water to bottom
// 2. Too many water that can fill both bottom & up at MAX_WATER_MASS: figure out the bottom one using a simple fomula
// 3. Total water is enough to fill MAX_WATER_MASS and still left a bit (< MAX_WATER_MASS) for the top: recalculate the pressure ratio
function calculateBottomMass(total) {
  _log('total', total);
  if (total <= MAX_WATER_MASS) {
    // Case 1
    return total;
  } else if (total >= 2 * MAX_WATER_MASS) {
    // Case 2
    // Let x is the amount of water in the top cell.
    // x + WATER_PRESSURE * x = total
    //
    // The return bellow return the value of (WATER_PRESSURE * x)
    return (WATER_PRESSURE * total) / (WATER_PRESSURE + 1);
  } else {
    // Case 3
    return MAX_WATER_MASS * WATER_PRESSURE;
  }
}

function massCheck() {
  // Mass check
  let massDict = {};
  let evictDict = {};

  grid.iterateTiles((tile) => {
    massDict[tile.content.name] = massDict[tile.content.name] || 0;
    massDict[tile.content.name] += tile.content.mass;
    if (tile.evictContent) {
      evictDict[tile.evictContent.name] =
        evictDict[tile.evictContent.name] || 0;
      evictDict[tile.evictContent.name] = tile.evictContent.mass;
    }
  });
  for (key in massDict) {
    massDict[key] = Math.round(massDict[key] * 100) / 100;
  }
  for (key in evictDict) {
    evictDict[key] = Math.round(evictDict[key] * 100) / 100;
  }
  showDebug(massCheckDiv, { evictDict, massDict });
}

function addBoat() {}
