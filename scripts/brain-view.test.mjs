import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
const source=readFileSync('public/runtimes/flybrain-9191824-fm4/js/brain3d.js','utf8');
function fixture(value){
 const sandbox={window:{},BRAIN:{postSynaptic:{TEST:[value,0]},thisState:0},Date,Math};
 vm.runInNewContext(source,sandbox);
 const brain=sandbox.window.Brain3D; sandbox.Brain3D=brain;
 brain.active=true;brain._initialized=true;
 brain._regions=[{name:'Test',neurons:['TEST'],meshes:[{material:{}}],_highlightUntil:0}];
 return {brain,sandbox};
}
test('real signal changes brain brightness without modifying neural state',()=>{
 const {brain,sandbox}=fixture(0);brain.update();const dark=brain._regions[0].meshes[0].material.emissiveIntensity;
 sandbox.BRAIN.postSynaptic.TEST[0]=2;brain.update();
 assert.ok(brain._regions[0].meshes[0].material.emissiveIntensity>dark);
 assert.equal(brain._regions[0].rawActivation,2);assert.equal(sandbox.BRAIN.postSynaptic.TEST[0],2);
});
test('zero activity stays zero, no invented pulses',()=>{const {brain}=fixture(0);brain.update();assert.equal(brain._regions[0].activation,0);});
