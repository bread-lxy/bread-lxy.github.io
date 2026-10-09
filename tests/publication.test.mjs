import test from 'node:test';
import assert from 'node:assert/strict';
import { publicationItems, publicationById, internshipIds, experienceOrder, experienceNotes, ownedBy, publishedIn, readingTarget } from '../content/publication.ts';
import { createHash } from 'node:crypto';

test('seven short notes follow education first and maintain separate project bodies',()=>{
  assert.deepEqual(experienceOrder,['ruc','cbs','sand-ai','huatai','baidu','guotai','esg']);
  assert.deepEqual(Object.keys(experienceNotes),experienceOrder);
  for(const id of experienceOrder){assert.ok(experienceNotes[id].sentences.length>=2&&experienceNotes[id].sentences.length<=3);assert.ok(experienceNotes[id].sentences.every(s=>s.trim()));}
  assert.match(experienceNotes.cbs.sentences[0],/OpenInnovation 2024 Sustainable Cities/);
  for(const id of ['eval-studio','yama','director']){
    assert.ok(publishedIn('projects').some(i=>i.id===id));
    assert.equal(publicationById[id].associatedExperience,'sand-ai');
  }
});

test('abridgment preserves source details byte-for-byte',()=>{
  const hashes={ruc:'8a47ee2529eba2eec328ea42c24b40903f399af4c9c1c96c569628a7129bad2a',cbs:'62ac54875f8cfe51be685c346b352797599d32a144756e5f4cbcf01cb6ebd94a','sand-ai':'75900f6fecbad26e3848d10f9c134208b10f84bbd1676c818aa59482780e7adf',huatai:'870381c576e90493912a6ee78149be4f05d5e93a30de53311d47daf55455f07c',baidu:'82e1ac4bf00baae72ee29f2d664b480b58cf1fb635ac6c916488947627e91934',guotai:'e964c3714bf9b7f59fa49cb4f3ec47467c0fcb2cbd035fc8ed818c8730f9aa6d',esg:'06dc6a4b7fb913f1635a66d9b634c9c5e62bc99af2b0357499b4b3ceee285554','eval-studio':'9abf6435f553944d14d131323623b5b1b54d2bd357d5c77e3271e28a820e8185',yama:'c3e8a3f972434f060c7d605ca556e2098be6f2af6da40b1a432027956e9bdeda',director:'5241d44bcfb00f8ac5a6c766e3e13d5d2069ae80640671839a962f9e381767c2'};
  for(const [id,hash] of Object.entries(hashes))assert.equal(createHash('sha256').update(JSON.stringify(publicationById[id].details)).digest('hex'),hash,id);
});

test('publication contains five complete internships in reverse chronological order',()=>{
  assert.deepEqual(internshipIds,['sand-ai','huatai','baidu','guotai','esg']);
  for(const id of internshipIds){
    const entry=publicationById[id];
    assert.ok(entry.details?.length>=2,id);
    assert.ok(entry.details.reduce((n,x)=>n+x.text.length,0)>=90,id);
  }
});
test('each work has one canonical owner, with no fabricated portfolio entries',()=>{
  assert.equal(new Set(publicationItems.map(i=>i.id)).size,publicationItems.length);
  assert.deepEqual(ownedBy('sand-ai'),[]);
  for(const item of publicationItems)if(item.ownerId)assert.ok(publicationById[item.ownerId]);
  assert.equal(publicationItems.filter(i=>['studio','life'].includes(i.primarySection)).length,0);
});
test('legacy item destinations and resume resolve to visible canonical prose',()=>{
  assert.equal(readingTarget({kind:'resume'}),'experience');
  assert.equal(readingTarget({kind:'item',section:'projects',slug:'eval-studio'}),'item-eval-studio');
  assert.equal(readingTarget({kind:'section',section:'studio',collection:'motion'}),'studio-motion');
  assert.equal(readingTarget({kind:'home'}),'home');
});
test('publication text excludes unverified performance numbers and internal links',()=>{
  const text=JSON.stringify(publicationItems);
  assert.doesNotMatch(text,/95%|19\/19|5,800|sandaii\.cn|feishu\.cn|153[- ]?2182/);
  assert.equal(publicationById.director.status,'prototype');
});
