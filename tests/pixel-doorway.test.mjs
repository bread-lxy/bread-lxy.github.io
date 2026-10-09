import assert from 'node:assert/strict';
import test from 'node:test';
import {doorwayGrid, ENTRY_TIMING} from '../app/entry-geometry.ts';

for (const [width,height] of [[1440,900],[1024,768],[390,844],[390,667]]) {
  test(`pixel doorway ${width}×${height}: complete coverage and connected growth`, () => {
    const grid=doorwayGrid(width,height,width/2,height*.61);
    const {left,top,rows,columns,size,cx,cy,ranks,maxRank}=grid;
    assert.ok(left<=0 && top<=0 && left+columns*size>=width && top+rows*size>=height);
    assert.ok(rows*columns<3000);
    let previous=0;
    for(let step=0;step<=100;step++) {
      const radius=maxRank*step/100,open=new Set();
      ranks.forEach((row,y)=>row.forEach((rank,x)=>{if(rank<=radius)open.add(y*columns+x);}));
      assert.ok(open.size>=previous);previous=open.size;
      const visited=new Set([cy*columns+cx]),queue=[cy*columns+cx];
      for(let i=0;i<queue.length;i++) {
        const cell=queue[i],x=cell%columns,y=Math.floor(cell/columns);
        for(const [nx,ny] of [[x-1,y],[x+1,y],[x,y-1],[x,y+1]]) {
          const n=ny*columns+nx;
          if(nx>=0&&nx<columns&&ny>=0&&ny<rows&&open.has(n)&&!visited.has(n)){visited.add(n);queue.push(n);}
        }
      }
      assert.equal(visited.size,open.size,`disconnected opening at ${step}%`);
    }
    assert.equal(previous,rows*columns);
  });
}
test('opening has bounded loading and reduced-motion durations',()=>{
  assert.equal(ENTRY_TIMING.minimumLoad,700);
  assert.equal(ENTRY_TIMING.maximumLoad,2500);
  assert.ok(ENTRY_TIMING.reduced<=.15);
});
