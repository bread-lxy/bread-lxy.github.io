import test from 'node:test';
import assert from 'node:assert/strict';
import {addAlbumSlide} from '../app/album-transition.ts';
test('Codrops frame and inner counter-motion fit the existing preview gate',()=>{
 const calls=[],tl={set(...args){calls.push(['set',...args]);return this;},to(...args){calls.push(['to',...args]);return this;},fromTo(...args){calls.push(['fromTo',...args]);return this;}};
 addAlbumSlide(tl,'old','new','inner',-1,.8);
 assert.equal(calls[1][2].scale,.9);
 assert.equal(calls[3][2].yPercent,-100);
 assert.equal(calls[4][2].yPercent,50);
 assert.ok(Math.abs(calls[3][3].duration+calls[3][4]-.8)<.00001);
});
