const { test } = require('node:test');
const assert = require('node:assert/strict');
const Model = require('../arena-model.js');
const World = require('../world-data.js');
const Art = require('../world-art.js');
global.window = { WhiteoutWorld: World, Expedition: Model };
const footprint = b => ({ x:b.x,y:b.y,w:b.w,h:b.h });

test('visible world walls share collision footprints and creating a renderer does not mutate a save', () => {
  const run = Model.create({seed:42,health:100,warmth:78});
  const before = JSON.stringify(run), view = Art.create(run);
  assert.deepEqual(view.structures.filter(s=>s.type==='building').flatMap(World.shell),run.obstacles);
  assert.equal(JSON.stringify(run),before);
  view.dispose();
});

test('an old expedition without optional layout and obstacle fields renders the original wall set', () => {
  const run = {width:2304,height:1536,extraction:{x:510,y:980},nodes:[]};
  const view = Art.create(run), buildings = view.structures.filter(s=>s.type==='building');
  assert.deepEqual(buildings.map(footprint),Model.V2_OBSTACLES);
  assert.equal(buildings.length,8);
  assert.equal(view.structures.some(s=>s.type==='facility'),false);
  view.dispose();
});

test('a resumed legacy expedition uses its translated four walls instead of newer geometry', () => {
  const run = {mapLayout:'legacy',width:2304,height:1536,extraction:{x:594,y:1046},nodes:[]};
  const view = Art.create(run);
  assert.deepEqual(view.structures.filter(s=>s.type==='building').map(footprint),Model.LEGACY_OBSTACLES);
  view.dispose();
});
