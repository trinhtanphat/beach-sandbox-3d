/**
 * Package dist/ into a self-contained Cloudflare Workers staging script.
 * This is a reproducible deployment artifact builder, NOT a production deployer.
 * No credentials or custom DNS are used. Output is gitignored.
 *
 * Build: npm run build && node scripts/build-preview-worker.mjs
 */
import { readFile, readdir, mkdir, writeFile } from 'node:fs/promises';
import { join, relative, resolve, sep } from 'node:path';
import { gzipSync } from 'node:zlib';
import { createHash } from 'node:crypto';
const root=resolve('dist');
const files=[];
async function collect(dir) {
 for(const entry of await readdir(dir,{withFileTypes:true})) {
  const full=join(dir,entry.name);
  if(entry.isDirectory())await collect(full);
  else if(entry.isFile())files.push(full);
 }
}
await collect(root);
if(!files.some(f=>f.endsWith('index.html'))||!files.some(f=>f.endsWith('.js')))throw new Error('Build dist/ first');
const assets={};
for(const file of files){
 const pathname='/'+relative(root,file).split(sep).join('/');
 const type=file.endsWith('.html')?'text/html; charset=utf-8':
   file.endsWith('.js')?'application/javascript; charset=utf-8':
   file.endsWith('.css')?'text/css; charset=utf-8':
   file.endsWith('.svg')?'image/svg+xml':
   file.endsWith('.png')?'image/png':'application/octet-stream';
 const bytes=await readFile(file);
 assets[pathname]={type,blob:gzipSync(bytes,{level:9}).toString('base64'),etag:'"'+createHash('sha256').update(bytes).digest('hex').slice(0,24)+'"'};
}
const content=`// Generated from beach-sandbox-3d/dist: dedicated, isolated demo worker.
const ASSETS=${JSON.stringify(assets)};
export default {
 async fetch(request){
  if(request.method!=='GET'&&request.method!=='HEAD')
    return new Response('Method not allowed',{status:405,headers:{Allow:'GET, HEAD'}});
  const url=new URL(request.url);
  const key=(url.pathname==='/'?'/index.html':url.pathname);
  const file=ASSETS[key];
  if(!file)return new Response('Not found',{status:404,headers:{'Content-Type':'text/plain; charset=utf-8'}});
  const headers={'Content-Type':file.type,'X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer','Cache-Control':key.startsWith('/assets/')?'public, max-age=31536000, immutable':'no-cache, must-revalidate','ETag':file.etag};
  if(request.headers.get('If-None-Match')===file.etag)return new Response(null,{status:304,headers});
  if(request.method==='HEAD')return new Response(null,{status:200,headers});
  const bytes=Uint8Array.from(atob(file.blob),c=>c.charCodeAt(0));
  const stream=new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'));
  return new Response(stream,{status:200,headers});
 }
};`;
const location=resolve('.edge-qa/staging-worker.js');
await mkdir(resolve('.edge-qa'),{recursive:true});
await writeFile(location,content);
console.log(JSON.stringify({destination:location,files:files.length,workerBytes:Buffer.byteLength(content),paths:Object.keys(assets)},null,2));
