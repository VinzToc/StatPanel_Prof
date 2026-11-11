/* Service worker StatPanel - Prof – tout est mis en cache : l'app fonctionne sans réseau.
   Pour publier une mise à jour : changer VERSION ci-dessous (et APP_VERSION dans version.js). */
const VERSION='1.0.0';
const CACHE='statpanel-prof-'+VERSION;
const CORE=["./", "index.html", "statpanel.js", "statpanel.css", "sp-xlsx.js", "eps-core.js", "version.js", "manifest.webmanifest", "icons/icon-192.png", "icons/icon-512.png", "icons/icon-maskable-512.png", "icons/apple-touch-icon.png"];
self.addEventListener('install',e=>{e.waitUntil(caches.open(CACHE).then(c=>c.addAll(CORE)).then(()=>self.skipWaiting()))});
self.addEventListener('activate',e=>{e.waitUntil((async()=>{for(const k of await caches.keys())if(k.startsWith('statpanel-prof-')&&k!==CACHE)await caches.delete(k);await self.clients.claim()})())});
// Cache d'abord, mise à jour en arrière-plan
self.addEventListener('fetch',e=>{const req=e.request;
 if(req.method!=='GET'||new URL(req.url).origin!==self.location.origin)return;
 e.respondWith((async()=>{const cache=await caches.open(CACHE);const cached=await cache.match(req,{ignoreSearch:true});
  const net=fetch(req).then(r=>{if(r&&r.ok)cache.put(req,r.clone());return r}).catch(()=>null);
  if(cached){e.waitUntil(net);return cached}
  const r=await net;if(r)return r;
  if(req.mode==='navigate'){const fb=await cache.match('index.html');if(fb)return fb}
  return new Response('Hors ligne',{status:503})})())});
