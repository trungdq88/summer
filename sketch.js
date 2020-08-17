const MAX_WATER_MASS = 1000;
const MIN_WATER = 50;
const ERROR_RATE = 0.01;
const AIR_MAX_FORCE = 10;
const WATER_PRESSURE = 1.01;
const WATER_SPILL_OVER_MASS = 0;

const OVER_PRESSSURE_FORCE_RATIO = 1;
const PRESSSURE_DIFFERENCE_FORCE_RATIO = 1;
const GRAVITY_FORCE_RATIO = 1;

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

    this.iterateTiles(tile => {
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
      simulatev2(this);
    }
  }
}

class Tile {
  constructor(containerGrid, i, j, contents, size) {
    this.i = i;
    this.j = j;
    if (Array.isArray(contents)) {
      this.contents = contents;
    } else {
      this.contents = [contents];
    }
    this.size = size;
    this.contents.forEach(content => content.setContainerTile(this));
    this.refreshContentsMap();
    this.containerGrid = containerGrid;
  }

  getMass() {
    return this.contents.map(_ => _.mass).reduce((sum, n) => sum + n, 0);
  }

  getDensity() {
    return this.contents.map(_ => _.density).reduce((sum, n) => sum + n, 0);
  }

  refreshContentsMap() {
    this.contentsMap = this.contents.reduce(
      (map, c) => ({ ...map, [c.name]: c }),
      {}
    );
  }

  addContent(content) {
    content.setContainerTile(this);
    if (this.contentsMap[content.name]) {
      this.contentsMap[content.name].mass += content.mass;
    } else {
      this.contents.push(content); // merge with existing type if possible
      this.refreshContentsMap();
    }
  }

  draw() {
    this.contents.forEach(content => content.draw());
  }

  removeContents() {
    this.contents = [];
    this.refreshContentsMap();
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
    this.density = 1.3;
  }

  isWaterFlowable() {
    return true;
  }

  isAirFlowable() {
    return true;
  }

  isFlowable() {
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
    fill('black');
    text(
      Math.floor(this.mass * 10) / 10,
      this.containerTile.i * this.containerTile.size,
      this.containerTile.j * this.containerTile.size +
        this.containerTile.size / 3
    );
    pop();
  }

  debug() {
    return {
      class: 'Air',
      position: [this.containerTile.i, this.containerTile.j],
      mass: this.mass
    };
  }
}

class Vaccum extends Content {
  constructor() {
    super();
    this.name = 'vaccum';
    this.mass = 0;
    this.density = 0;
  }

  isWaterFlowable() {
    return true;
  }

  isAirFlowable() {
    return true;
  }

  isFlowable() {
    return false;
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
      mass: this.mass
    };
  }
}

class Water extends Content {
  constructor(mass = 1000) {
    super();
    this.name = 'water';
    this.mass = mass;
    this.density = 1000;
  }

  isWaterFlowable() {
    return true;
  }

  isAirFlowable() {
    return false;
  }

  isFlowable() {
    return true;
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
      this.containerTile.getTop().contents.find(_ => _.name === 'water')
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

    fill('black');
    text(
      Math.floor(this.mass * 10) / 10,
      this.containerTile.i * this.containerTile.size,
      this.containerTile.j * this.containerTile.size +
        this.containerTile.size / 3
    );
    pop();
  }

  debug() {
    return {
      class: 'Water',
      mass: this.mass,
      position: [this.containerTile.i, this.containerTile.j]
    };
  }
}

class Rock extends Content {
  constructor(mass = 1) {
    super();
    this.name = 'rock';
    this.mass = mass;
    this.density = 1;
  }

  isOverPressure() {
    return true;
  }

  isFlowable() {
    return false;
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

  debug() {
    return {
      class: 'Rock',
      mass: this.mass,
      position: [this.containerTile.i, this.containerTile.j]
    };
  }
}

let grid;
let simulating = false;
let isPainting = false;
let debugDiv;

function setup() {
  createCanvas(600, 600);
  // grid = new Grid(5, 5, 120);
  // grid = new Grid(10, 10, 60);
  grid = new Grid(20, 20, 30);
  // grid = new Grid(40, 40, 15);
  debugDiv = createDiv('hello');
  massCheckDiv = createDiv('hello');
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
      if (!targetedTile.contentsMap.rock) {
        targetedTile.addContent(new Rock());
      }
    } else {
      targetedTile.removeContents();
      targetedTile.addContent(new Water());
    }
  }
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
    simulatev2(grid);
  }

  if (keyCode === 32) {
    // space
    simulating = !simulating;
  }

  const targetedTile = grid.tileAt(mouseX, mouseY);

  if (keyCode === 38) {
    // up
    targetedTile.contents.forEach(content => (content.mass *= 2));
  }

  if (keyCode === 40) {
    // down
    targetedTile.contents.forEach(content => (content.mass /= 2));
  }

  if (keyCode === 65) {
    // a
    targetedTile.addContent(new Air());
  }

  if (keyCode === 87) {
    // w
    targetedTile.addContent(new Water());
  }

  if (keyCode === 82) {
    // r
    targetedTile.addContent(new Rock());
  }

  if (keyCode === 86) {
    // r
    targetedTile.addContent(new Vaccum());
  }

  if (keyCode === 77) {
    // m
    massCheck();
  }
}

document.oncontextmenu = function() {
  return false;
};

function simulatev2(grid) {
  const forceFields = {};

  grid.iterateTiles(tile => {
    const neighbours = grid.getNeighbourTiles(tile);
    tile.contents
      .filter(_ => _.name !== 'vaccum')
      .forEach(content => {
        forceFields[content.name] = forceFields[content.name] || {};
        calculateFlowForce(content, forceFields[content.name], neighbours);
      });
  });

  _log('forceFields', forceFields);
}

function calculateFlowForce(content, field, neighbours) {
  const tiles = ['top', 'right', 'bottom', 'left'].filter(
    _ => neighbours[_] !== undefined
  );

  const forces = {
    top: 0,
    right: 0,
    bottom: 0,
    left: 0
  };

  // Over pressure force
  const overPressureRatio =
    content.mass / content.containerTile.getDensity() - 1;
  const overPressureForce = overPressureRatio / tiles.length;
  tiles.forEach(tile => {
    forces[tile] += overPressureForce * OVER_PRESSSURE_FORCE_RATIO;
  });

  // Pressure difference force
  tiles.forEach(tile => {
    const pressureDifferenceForce = content.mass / neighbours[tile].getMass();
    forces[tile] += pressureDifferenceForce * PRESSSURE_DIFFERENCE_FORCE_RATIO;
  });

  // Gravity
  forces.bottom += content.mass * GRAVITY_FORCE_RATIO;

  // Add to the force field
  const { i, j } = content.containerTile;

  field[i] = field[i] || {};
  field[i][j] = field[i][j] || {
    top: 0,
    right: 0,
    bottom: 0,
    left: 0
  };

  field[i][j].top += forces.top;
  field[i][j].right += forces.right;
  field[i][j].bottom += forces.bottom;
  field[i][j].left += forces.left;

  _log(forces);
}

// Balance the overlapping forces
function normalizeForceField(field) {
  iterateField(field, (tile, i, j) => {
    // if (field[i-1] && field[i-1][j] && field[i-1][j].right) {
    //
    // }
  });
}

function simulate(grid) {
  // Calculate airDiff
  const airDiff = {};
  const waterDiff = {};

  grid.iterateTiles(tile => {
    const neighbours = grid.getNeighbourTiles(tile);
    tile.contents.forEach(content => {
      if (content instanceof Water) {
        flowWater(content, waterDiff, neighbours);
      }

      if (content instanceof Air) {
        flowAir(content, airDiff, neighbours);
      }
    });
  });

  _log('airDiff', airDiff);
  _log('waterDiff', waterDiff);

  // Diff check
  let totalMass = 0;
  Object.keys(airDiff).forEach(i => {
    Object.keys(airDiff[i]).forEach(j => {
      totalMass += airDiff[i][j];
    });
  });

  if (Math.abs(totalMass) >= ERROR_RATE) {
    throw Error('Incorrect airDiff! ' + totalMass);
  }

  totalMass = 0;
  Object.keys(waterDiff).forEach(i => {
    Object.keys(waterDiff[i]).forEach(j => {
      totalMass += waterDiff[i][j];
    });
  });

  if (Math.abs(totalMass) >= ERROR_RATE) {
    throw Error('Incorrect waterDiff! ' + totalMass);
  }

  // Apply airDiff
  Object.keys(airDiff).forEach(i => {
    Object.keys(airDiff[i]).forEach(j => {
      const diffMass = airDiff[i][j];
      const tile = grid.data[i][j];

      const air = tile.contents.find(_ => _.name === 'air');
      if (air) {
        air.mass += diffMass;

        if (air.mass <= 0) {
          // is air with 0 mass the same with vaccum?
          tile.removeContents();
          tile.addContent(new Vaccum());
        }
      } else {
        if (tile.contents.every(_ => _.isAirFlowable())) {
          tile.addContent(new Air(diffMass));
        } else {
          _log('cannot flow anywhere');
        }
      }
    });
  });

  Object.keys(waterDiff).forEach(i => {
    Object.keys(waterDiff[i]).forEach(j => {
      const diffMass = waterDiff[i][j];
      const tile = grid.data[i][j];

      const water = tile.contents.find(content => content.name === 'water');
      if (water) {
        water.mass += diffMass;

        if (water.mass <= 0) {
          tile.removeContents();
          tile.addContent(new Vaccum());
        }
      } else {
        if (tile.contents.every(content => content.isWaterFlowable())) {
          tile.addContent(new Water(diffMass));
        } else {
          _log('cannot flow anywhere');
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
  showDebug(debugDiv, targetedTile.contents.map(_ => _.debug()));
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

    // should use overall pressure instead of air mass
    let totalMass = forces
      .map(([t, _]) =>
        t.contents
          .filter(_ => _.name === 'air')
          .map(_ => _.mass)
          .reduce((sum, n) => sum + n, 0)
      )
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

    // Nowhere for air to evict
    if (forces.length === 0) {
      // Bubble up the air to the nearby water, priority the top one
      // TODO: rethink about the content model?
      // TODO: each tile can contains multiple content, they interact with each
      // TODO: other in there?
      //
      // TODO: even distribute a pressurized water/air?
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

  [top, right, bottom, left].forEach(dest => {
    if (dest && dest.contents.every(_ => _.isAirFlowable())) {
      let airMass = dest.contents
        .filter(_ => _.name === 'air')
        .map(_ => _.mass)
        .reduce((sum, n) => sum + n, 0);
      let force = content.mass / airMass;

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
  // function evictWater() {
  //   _log('flowWater/evict', content);
  //   // Let water exit at all direction equally, seem to be an ok strategy
  //   const directions = [top, right, bottom, left].filter(
  //     direction => direction && direction.content.isWaterFlowable()
  //   );
  //   const flowMass = remaining / directions.length;
  //   directions.forEach(direction => {
  //     addMass(diff, direction.i, direction.j, flowMass);
  //     lostMass += flowMass;
  //   });
  // }

  // Let the water flow "naturally"
  function flows() {
    _log('flowWater/flow', content);
    if (remaining <= 0) return;

    if (bottom && bottom.contents.every(_ => _.isWaterFlowable())) {
      let bottomWaterMass = bottom.contents
        .filter(_ => _.name === 'water')
        .map(_ => _.mass)
        .reduce((sum, n) => sum + n, 0);

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

    if (left && left.contents.every(_ => _.isWaterFlowable())) {
      let waterMass = left.contents
        .filter(_ => _.name === 'water')
        .map(_ => _.mass)
        .reduce((sum, n) => sum + n, 0);

      // _log('flow left', left.content.mass, left.content.name);

      if (remaining - waterMass >= WATER_SPILL_OVER_MASS) {
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

    if (right && right.contents.every(_ => _.isWaterFlowable())) {
      let waterMass = right.contents
        .filter(_ => _.name === 'water')
        .map(_ => _.mass)
        .reduce((sum, n) => sum + n, 0);

      if (remaining - waterMass >= WATER_SPILL_OVER_MASS) {
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

    if (top && top.contents.every(_ => _.isWaterFlowable())) {
      if (remaining <= MAX_WATER_MASS) return;
      let waterMass = top.contents
        .filter(_ => _.name === 'water')
        .map(_ => _.mass)
        .reduce((sum, n) => sum + n, 0);

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

  grid.iterateTiles(tile => {
    tile.contents.forEach(content => {
      massDict[content.name] = massDict[content.name] || 0;
      massDict[content.name] += content.mass;
    });
  });
  for (key in massDict) {
    massDict[key] = Math.round(massDict[key] * 100) / 100;
  }
  showDebug(massCheckDiv, { massDict });
}

function iterateField(field, cb) {
  Object.keys(field).forEach(i => {
    Object.keys(field[i]).forEach(j => {
      cb(field[i][j], i, j);
    });
  });
}
