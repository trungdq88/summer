const MAX_WATER_PRESSURE = 500000;
const MIN_WATER_PRESSURE = 500;
const WATER_AIR_PRESSURE_RATIO = 770;
const ERROR_RATE = 0.00001;
const GRAVITY_FORCE = 5;
const AIR_FRICION = 1.5;
const AIR_MAX_FORCE = 10;

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
        line.push(new Tile(i, j, new Vaccum(), tileSize));
      }
      this.data.push(line);
    }
  }

  draw() {
    this.update();

    this.iterateTiles(tile => {
      tile.draw();
    });
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
  constructor(i, j, content, size) {
    this.i = i;
    this.j = j;
    this.content = content;
    this.size = size;
    this.content.setContainerTile(this);
  }

  setContent(content) {
    this.content = content;
    this.content.setContainerTile(this);
  }

  draw() {
    this.content.draw();
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
  constructor(mass) {
    super();
    this.name = 'air';
    if (mass === undefined) {
      this.mass = 1.3;
    } else {
      this.mass = mass;
    }
  }

  isFlowable() {
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
    if (p > 85) {
      p = 85;
    }
    if (p < 5) {
      p = 5;
    }
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

  isFlowable() {
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
  constructor(mass) {
    super();
    this.name = 'water';
    this.mass = mass || 1000;
  }

  isFlowable() {
    return true;
  }

  isAirFlowable() {
    return false;
  }

  isOverPressure() {
    return this.mass >= MAX_WATER_PRESSURE;
  }

  draw() {
    push();
    let p = (1 - this.mass / 5000) * 100;
    if (p < 15) {
      p = 25;
    }
    if (p > 90) {
      p = 90;
    }
    fill(color(`hsl(208, 98%, ${p}%)`));
    rect(
      this.containerTile.i * this.containerTile.size,
      this.containerTile.j * this.containerTile.size,
      this.containerTile.size,
      this.containerTile.size
    );
    fill('gray');
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
      position: [this.containerTile.i, this.containerTile.j],
      debug: this._debug
    };
  }
}

class Rock extends Content {
  constructor(mass) {
    super();
    this.name = 'rock';
    this.mass = mass;
  }

  isOverPressure() {
    return true;
  }

  isFlowable() {
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

let grid;
let simulating = false;
let isPainting = false;
let debugDiv;

function setup() {
  createCanvas(600, 600);
  grid = new Grid(20, 20, 30);
  // grid = new Grid(40, 40, 15);
  debugDiv = createDiv('hello');
}

function draw() {
  background(128);
  noStroke();
  grid.draw();

  if (isPainting) {
    const targetedTile = grid.tileAt(mouseX, mouseY);
    if (!targetedTile) {
      return;
    }
    if (mouseButton === LEFT) {
      targetedTile.setContent(new Rock());
    } else {
      targetedTile.setContent(new Water());
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
    targetedTile.setContent(new Air());
  }

  if (keyCode === 87) {
    // w
    targetedTile.setContent(new Water());
  }

  if (keyCode === 82) {
    // r
    targetedTile.setContent(new Rock());
  }
}

document.oncontextmenu = function() {
  return false;
};

function simulate(grid) {
  // Calculate diff
  const diff = {};

  grid.iterateTiles(tile => {
    if (tile.content instanceof Air) {
      const { top, right, bottom, left } = grid.getNeighbourTiles(tile);

      function flowable(t) {
        return t && t.content.isAirFlowable();
      }

      function flowToTile(forces) {
        let lostMass = 0;

        let totalForce = forces
          .map(([_, force]) => force)
          .reduce((sum, n) => sum + n, 0);

        let totalMass = forces
          .map(([t, _]) => t.content.mass)
          .reduce((sum, n) => sum + n, 0);

        // const maxMassGap = Math.max(
        //   ...forces
        //     .map(([destTile]) => tile.content.mass - destTile.content.mass)
        //     .filter(_ => _ > 0)
        // );

        let averageMass = (tile.content.mass + totalMass) / (forces.length + 1);

        let totalFlowMass = tile.content.mass - averageMass;

        if (totalFlowMass <= 0) {
          return;
        }

        forces.forEach(([destTile, force]) => {
          flowMass = (totalFlowMass * force) / totalForce;

          diff[destTile.i] = diff[destTile.i] || {};
          diff[destTile.i][destTile.j] = diff[destTile.i][destTile.j] || 0;
          diff[destTile.i][destTile.j] += flowMass;
          lostMass += flowMass;
        });

        diff[tile.i] = diff[tile.i] || {};
        diff[tile.i][tile.j] = diff[tile.i][tile.j] || 0;
        diff[tile.i][tile.j] -= lostMass;
      }

      const forces = [];
      let remaining = tile.content.mass;

      [top, right, bottom, left].forEach(dest => {
        if (flowable(dest)) {
          let force = tile.content.mass / dest.content.mass;
          if (force <= 1) {
            return;
          }

          if (force > AIR_MAX_FORCE) {
            force = AIR_MAX_FORCE;
          }

          forces.push([dest, 1 - force]);
        }
      });

      if (forces.length) {
        flowToTile(forces);
      }

      tile.content._debug = {
        forces: forces.map(_ => _[1])
      };
    }
  });

  _log('diff', diff);

  // Mass check
  let totalMass = 0;
  Object.keys(diff).forEach(i => {
    Object.keys(diff[i]).forEach(j => {
      totalMass += diff[i][j];
    });
  });

  if (Math.abs(totalMass) >= ERROR_RATE) {
    throw Error('Incorrect diff! ' + totalMass);
  }

  // Apply air diff
  Object.keys(diff).forEach(i => {
    Object.keys(diff[i]).forEach(j => {
      const diffMass = diff[i][j];
      const tile = grid.data[i][j];

      if (tile.content instanceof Air) {
        tile.content.mass += diffMass;

        if (tile.content.mass <= 0) {
          tile.setContent(new Vaccum()); // should be vaccum
        }
      } else {
        tile.setContent(new Air(diffMass));
      }
    });
  });

  // Mass check
  let massDict = {};
  grid.iterateTiles(tile => {
    massDict[tile.content.name] = massDict[tile.content.name] || 0;
    massDict[tile.content.name] += tile.content.mass;
  });
  _log('mass', massDict);
}

function mouseMoved() {
  const targetedTile = grid.tileAt(mouseX, mouseY);
  if (!targetedTile) {
    return;
  }
  debugDiv.html(
    '<pre>' + JSON.stringify(targetedTile.content.debug(), null, 2) + '</pre>'
  );
}
