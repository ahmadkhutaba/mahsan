const C='mahsan-v5';
const A=['./','./index.html','./manifest.json','https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js','https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js','https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js','https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(C).then(c=>c.addAll(A)));self.skipWaiting();});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(k=>Promise.all(k.filter(x=>x!==C).map(x=>caches.delete(x)))));self.clients.claim();});
self.addEventListener('fetch',e=>{
  if(e.request.url.includes('script.google')||e.request.method!=='GET')return;
  const isPage=e.request.mode==='navigate'||e.request.url.endsWith('/index.html')||e.request.url.endsWith('/mahsan/');
  if(isPage){
    // network first for the page itself so updates show immediately
    e.respondWith(fetch(e.request,{cache:'no-store'}).then(r=>{const cp=r.clone();caches.open(C).then(c=>c.put(e.request,cp));return r;}).catch(()=>caches.match(e.request,{ignoreSearch:true}).then(r=>r||caches.match('./index.html'))));
    return;
  }
  e.respondWith(caches.match(e.request,{ignoreSearch:true}).then(c=>c||fetch(e.request).then(r=>{if(r.ok){const cp=r.clone();caches.open(C).then(x=>x.put(e.request,cp));}return r;})));
});
