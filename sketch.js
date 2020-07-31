const MAX_WATER_PRESSURE = 5;
const MIN_WATER_PRESSURE = 1;
const WATER_SURFACE_TENSION = 1;
const ERROR_RATE = 0.0000001;

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
        line.push(new Tile(i, j, new Air(), tileSize));
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
    this.throwBoundary(i, j);
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
}

class Air extends Content {
  constructor() {
    super();
    this.mass = 1;
  }

  isLiquidFlowable() {
    return true;
  }

  isOverPressure() {
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
}

class Water extends Content {
  constructor(mass) {
    super();
    this.mass = mass;
  }

  isLiquidFlowable() {
    return true;
  }

  isOverPressure() {
    return this.mass >= MAX_WATER_PRESSURE;
  }

  draw() {
    push();
    fill(color(0, 126, 255, (255 * this.mass) / MAX_WATER_PRESSURE));
    rect(
      this.containerTile.i * this.containerTile.size,
      this.containerTile.j * this.containerTile.size,
      this.containerTile.size,
      this.containerTile.size
    );
    pop();
  }
}

class Rock extends Content {
  constructor(mass) {
    super();
    this.mass = mass;
  }

  isOverPressure() {
    return true;
  }

  isLiquidFlowable() {
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

function setup() {
  createCanvas(600, 600);
  grid = new Grid(20, 20, 30);
}

function draw() {
  background(128);
  noStroke();
  grid.draw();

  if (isPainting) {
    const targetedTile = grid.tileAt(mouseX, mouseY);
    if (mouseButton === LEFT) {
      targetedTile.setContent(new Rock(1));
    } else {
      targetedTile.setContent(new Water(3));
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
}

document.oncontextmenu = function() {
  return false;
};

function simulate(grid) {
  // Calculate diff
  const diff = {};

  grid.iterateTiles(tile => {
    if (tile.content instanceof Water) {
      const { top, right, bottom, left } = grid.getNeighbourTiles(tile);

      let remaining = tile.content.mass;

      function flowable(t) {
        return t && t.content.isLiquidFlowable() && !t.content.isOverPressure();
      }

      // Flow to a neighbor tile
      function flowToTile(forces) {
        // "Flow" is actually the process to balance the pressure between tiles
        // Which means the mass of water should be distributed to all of it's
        // neighbor flowable tiles.
        let totalForce = forces
          .map(([_, force]) => force)
          .reduce((sum, n) => sum + n, 0);

        let lostMass = 0;

        let balanceMass =
          (forces
            .map(([targetTile, force]) => targetTile.content.mass)
            .reduce((sum, n) => sum + n, 0) +
            tile.content.mass) /
          (1 + forces.length);

        let bonusTile;

        forces.forEach(([targetTile, force]) => {
          if (
            !(targetTile.content instanceof Water) &&
            force <= WATER_SURFACE_TENSION
          ) {
            return;
          }

          const flowMass = Math.min(
            tile.content.mass,
            (balanceMass * force) / totalForce
          );
          _log('content.mass:', tile.content.mass, 'flowMass', flowMass);
          balanceMass -= flowMass;
          lostMass += flowMass;

          diff[targetTile.i] = diff[targetTile.i] || {};
          diff[targetTile.i][targetTile.j] =
            diff[targetTile.i][targetTile.j] || 0;
          diff[targetTile.i][targetTile.j] += flowMass;

          if (flowMass > 0) {
            bonusTile = targetTile;
          }
        });

        const drip = tile.content.mass - lostMass;
        if (drip <= MIN_WATER_PRESSURE) {
          // console.log('remove last drip');
          lostMass = tile.content.mass;
          // just push the remaining to the first tile to reserve mass
          diff[bonusTile.i][bonusTile.j] += drip;
        }

        diff[tile.i] = diff[tile.i] || {};
        diff[tile.i][tile.j] = diff[tile.i][tile.j] || 0;
        diff[tile.i][tile.j] -= lostMass;
      }

      // _log('tile', tile.content.mass, 'bottom', bottom.content.mass);
      // Pressure balance using average
      const forces = [
        [
          bottom,
          flowable(bottom)
            ? 5 + (tile.content.mass - bottom.content.mass) / 2
            : 0
        ],
        [top, flowable(top) ? (tile.content.mass - top.content.mass) / 2 : 0],
        [
          left,
          flowable(left) ? (tile.content.mass - left.content.mass) / 2 : 0
        ],
        [
          right,
          flowable(right) ? (tile.content.mass - right.content.mass) / 2 : 0
        ]
      ].filter(([_, force]) => force > 0);
      _log('forces for ', tile.i, tile.j, forces);

      if (forces.length === 0) {
        // no where to flow
        return;
      }

      flowToTile(forces);
    }
  });

  // _log(
  //   'mass before',
  //   tile.content.mass,
  //   forces.map(_ => _[0].content.mass)
  // );
  //
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

  // Apply diff
  Object.keys(diff).forEach(i => {
    Object.keys(diff[i]).forEach(j => {
      const diffMass = diff[i][j];
      const tile = grid.data[i][j];

      if (tile.content instanceof Water) {
        tile.content.mass += diffMass;

        if (tile.content.mass <= 0) {
          tile.setContent(new Air()); // should be vaccum
        }
      } else {
        tile.setContent(new Water(diffMass));
      }
    });
  });

  // Mass check
  let mass = 0;
  grid.iterateTiles(tile => {
    if (tile.content instanceof Water) {
      _log('+', tile.content.mass);
      mass += tile.content.mass;
    }
  });
  _log('mass', mass);
}
