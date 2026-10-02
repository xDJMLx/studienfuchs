// Startet das Relais lokal auf Port 8787 (nur zum Testen): node relay/relay-dev.mjs
import http from 'node:http'
import worker from './kilo-relay.js'

http
  .createServer(async (req, res) => {
    const chunks = []
    for await (const c of req) chunks.push(c)
    const request = new Request('http://localhost:8787' + req.url, {
      method: req.method,
      headers: req.headers,
      body: ['GET', 'HEAD'].includes(req.method) ? undefined : Buffer.concat(chunks),
    })
    const response = await worker.fetch(request)
    res.writeHead(response.status, Object.fromEntries(response.headers))
    res.end(Buffer.from(await response.arrayBuffer()))
  })
  .listen(8787, () => console.log('Relais auf http://localhost:8787'))
