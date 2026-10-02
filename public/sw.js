// Einfacher Service Worker: App-Dateien und Texterkennungsdaten nach dem ersten Abruf offline verfügbar machen.
// Strategie: erst Netz (aktuelle Version), bei Fehler Cache. Seite, Manifest und version.json werden immer beim Server nachgefragt
// (GitHub Pages erlaubt sonst 10 Minuten Browser-Cache). Gehashte Dateien unter /assets/ ändern ihren Namen, die dürfen aus dem Cache kommen.
const CACHE = 'studienfuchs-v2'

self.addEventListener('install', () => self.skipWaiting())

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  )
})

self.addEventListener('fetch', (event) => {
  const req = event.request
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return
  event.respondWith(
    (req.mode === 'navigate' || !new URL(req.url).pathname.includes('/assets/') ? fetch(req.url, { cache: 'no-cache' }) : fetch(req))
      .then((res) => {
        if (res.ok) {
          const copy = res.clone()
          caches.open(CACHE).then((c) => c.put(req, copy))
        }
        return res
      })
      .catch(() => caches.match(req).then((hit) => hit || caches.match(self.registration.scope))),
  )
})
