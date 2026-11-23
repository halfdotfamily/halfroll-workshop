import http from 'node:http';
import fs from 'node:fs/promises';
import {createReadStream} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const port=Number(process.argv[2]??4478);
const contentTypes={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8',
  '.mjs':'text/javascript; charset=utf-8','.json':'application/json','.png':'image/png','.webp':'image/webp','.jpg':'image/jpeg',
  '.svg':'image/svg+xml','.glb':'model/gltf-binary','.gltf':'model/gltf+json','.woff2':'font/woff2',
  '.mp3':'audio/mpeg','.wav':'audio/wav','.ogg':'audio/ogg','.md':'text/plain; charset=utf-8','.txt':'text/plain; charset=utf-8'};

http.createServer(async(req,res)=>{
  const fail=status=>{res.writeHead(status);res.end();};
  if(!['GET','HEAD'].includes(req.method))return fail(405);
  try{
    const url=new URL(req.url,'http://127.0.0.1');
    const requested=decodeURIComponent(url.pathname==='/'?'/index.html':url.pathname);
    if(requested.includes('\\')||requested.split('/').some(part=>part.startsWith('.')))return fail(404);
    const target=await fs.realpath(path.join(root,requested));
    if(!target.startsWith(root+path.sep))return fail(404);
    const stat=await fs.stat(target);
    if(!stat.isFile())return fail(404);
    res.writeHead(200,{'Content-Type':contentTypes[path.extname(target)]??'application/octet-stream','Content-Length':stat.size,
      'Cache-Control':'no-store','Content-Security-Policy':"default-src 'self'; connect-src 'self' blob:; img-src 'self' data: blob:; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline'; worker-src 'self' blob:; frame-ancestors 'none'; form-action 'none'",
      'X-Content-Type-Options':'nosniff'});
    if(req.method==='HEAD')return res.end();
    createReadStream(target).pipe(res);
  }catch{return fail(404);}
}).listen(port,'127.0.0.1',()=>console.log('Halfroll Workshop · http://127.0.0.1:'+port+'/'));
