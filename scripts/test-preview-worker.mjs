/**
 * Verify the exact self-contained Worker that will be published to Cloudflare.
 * Uses Node's Web Response, Request and DecompressionStream.
 */
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { resolve, join, relative, sep } from 'node:path';
import { pathToFileURL } from 'node:url';

const app=(await import(pathToFileURL(resolve('.edge-qa/staging-worker.js')).href)).default;
const origin='https://shoreline.example';
const request=(path,options={})=>app.fetch(new Request(origin+path,options));
const root=await request('/');
assert.equal(root.status,200);
assert.match(root.headers.get('content-type'),/text\/html/);
assert.match(root.headers.get('cache-control'),/no-cache/);
const html=await root.text();
assert.match(html,/id="world"/);
assert.match(html,/id="foam"/);

const files=[];
async function walk(dir){
 for(const entry of await readdir(dir,{withFileTypes:true})){
  const name=join(dir,entry.name);
  if(entry.isDirectory())await walk(name);
  else files.push(name);
 }
}
await walk(resolve('dist'));
for(const path of files){
 const key='/'+relative(resolve('dist'),path).split(sep).join('/');
 const response=await request(key);
 assert.equal(response.status,200,key);
 assert.equal(response.headers.get('etag')?.startsWith('"'),true,key);
 const actual=Buffer.from(await response.arrayBuffer());
 const expected=await readFile(path);
 assert.deepEqual(actual,expected,key+' changed during gzip transfer');
 const cache=response.headers.get('cache-control');
 if(key.startsWith('/assets/'))assert.match(cache,/immutable/);
 else assert.match(cache,/no-cache/);
 const head=await request(key,{method:'HEAD'});
 assert.equal(head.status,200);
 assert.equal((await head.arrayBuffer()).byteLength,0);
 const fresh=await request(key,{headers:{'If-None-Match':response.headers.get('etag')}});
 assert.equal(fresh.status,304);
 assert.equal((await fresh.arrayBuffer()).byteLength,0);
}
assert.equal((await request('/does-not-exist')).status,404);
assert.equal((await request('/',{method:'POST'})).status,405);
console.log('Worker package verified:',files.length,'static resources, gzip byte equality, caching, HEAD, ETag 304, 404/405');
