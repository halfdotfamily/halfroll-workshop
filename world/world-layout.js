// Shared world-space art constraints. The game engine owns space effects and outcomes.
export const ARENA=Object.freeze({x:-4,z:1,radius:6.4,innerRadius:5.35,floorY:.42,rimY:1.2,routeRadius:9.4});
export const RIVER_KNOTS=Object.freeze([[-1,-31],[2,-22],[1,-14],[7,-9],[8,0],[6,9],[4,16],[0,22],[3,31]].map(p=>Object.freeze(p)));
