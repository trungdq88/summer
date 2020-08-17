I. Tile, content, vaccum and pressure:
1. "tiles" are placeholder for contents.
1. "contents" are matters, like water, air, rock... it has the density value indicate their "natural" mass in one tile.
1. "vaccum" are considered content with 0 mass and only exist in tiles when there is no other content in the tile
1. each tile has a "pressure" value calculated from the sum of all the contents in its. (Q: probably with weighting?)
1. each tile can contains multiple contents
1. all flowable contents flow from higher pressures tile to a lower one
1. non flowable contents (rocks) have very high pressure value, which prevent all other contents to "flow" into them, creating the inert attribute.


II. Flow & Gravity :
1. Flowable contents (air, water) always try to distribute its mass to the nearby tiles to equalize the pressure.
1. Contents from a tile can flow in 4 direction: up right down left.
1. The amount of mass flowing into each direction is determined by the following flow forces and "flow speed"
1. Flow forces are:
 - over pressure force: the current tile's pressure is higher than the density of the content, forcing the content to flow into other tile. This force goes to all 4 directions evenly.
 - pressure difference forces: a neighbour tile has lower pressure value and "pull" the content from the current tile. This forces goes to all 4 directions but will have different value depends on the difference between the current tile and the neighbour tiles.
 - gravity: falling force
 - surface tension (for liquid)
 - (?momentum to form flow)
 - (?friction, reduce waves)
1. Flow speed is an attribute of a content to indicate how easy it is for a content to flow. This can be used to simulate other kind of liquids, e.g. honey, magma (flow very slowly)
1. Non-flowable contents can be represent with flow speed = 0, which makes them not movable by any force.
1. Gravity affect all contents with mass, contribute to the flow force and pulling them to a specific direction (unless the contents has flow speed = 0). Gravity is hardcoded to the "down" direction for easier coding.
1. Gravitiy apply higher force for contents with higher mass (naturally).
1. If the direction of gravity is blocked, the force of gravity is translated to sideway forces (left and right) with a slightly decrease in value. These force are combined with the existing sideway forces if any.


Resulting behavior:
1.  Air flow:
- A pocket of air will span out and fill up every reachable tiles and evenually reaches the equalized pressure. This is driven by the pressure difference between the air tile and the vaccum tiles around them, and gravity.
- Because the mass of the air tile is so low (density is 1.3kg per tile), gravity won't affect much on the flow direction, which means the air can flow to all neighbours tiles (even the top one).
- Tiles at the bottom have slightly more mass than the aboves due to the affect of gravity, but not much.

2. Water flow:
- Same as air, water tend to spreadout to neighbour tiles because of pressure difference, even if the tiles are filled with air (air contribute too few pressure to the tile to prevent it from being flow'ed by the water).
- Water tend to flow down, as its mass is big (1000kg per tile), gravity pull the water down entirely if the tile bellow has sufficient space. When the down direction is blocked (by pressure), it flow sideway.
- Water can flow up if the pressure is high and can counter the force created by gravity. This will allow the water to flow up in a communicating vessels and form the water level.

3. Bricks:
- Bricks stay in one place, doesn't fall by gravity, and doesn't let air/water flow into it.
- Since everything in this simulation is "flowing", the bricks can be made to stay still at one place by setting flow speed = 0.
- (Q: If we can ajdust flow speed at run time, we can simulate the "melting" effect by slowly increase the flow speed and let the bricks slowly flow (melt) and get pulled down by gravity).
- Bricks also have a very very high pressure value, prevent air and water to flow into them.

4. Eviction:
- If Water and Air are found to be in the same tile (i.e. water flow down and take over the tile): due to the "over pressure force", the air will be pushed out to neighbour tiles. If the tile is in the water surface, the sideway tiles are also filled with water, the only escape flow is to flow up and balance with the air pressure above. If all for edges are filled with water (e.g. in boiling water case), the air will also flow up because the water at bottom have higher pressure due to gravity rule.

we need something to push the air out of water, push water out of bricks, see a pattern here?

5. Water pressure phenomenon
- When the gravity force of the upper water tile balance with the push out force of the bottom water, it forms a state where the mass of the bottom water is slighty higher than the top one. (proof?)


Expectations:

1. Mixing:
- Sand in water?

1. Small flows. The gravity's effect on air is too low to pull it down every iteration, however, by time it should flow down evenually, could be done via probability and random air block swap?

1. How to keep the falling water tile surrounded by air to spread sideway? gravity force "over come" the sideway force? Surface tension?

https://www.khanacademy.org/science/chemistry/states-of-matter-and-intermolecular-forces/states-of-matter/v/phase-diagrams


https://byjus.com/physics/relation-between-pressure-and-density/#:~:text=Pressure%20is%20the%20measure%20of,in%20density%20and%20vise%2Dversa.


- Pressure
- Density
- Temperature
- Mass
- Relative Density (Specific Gravity)

https://en.wikipedia.org/wiki/Relative_density
http://butane.chem.uiuc.edu/pshapley/GenChem1/L21/2.html#:~:text=Density%20increase%20as%20the%20temperature,however%2C%20the%20density%20decreases%20again.&text=This%20is%20the%20reason%20why,trap%20fewer%20extra%20water%20molecules.
