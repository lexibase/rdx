import { createServer } from 'node:http'
import process from 'node:process'

const port = Number(process.argv[process.argv.indexOf('--port') + 1])
createServer((request, response) => {
  if (request.url === '/unhealthy') {
    response.writeHead(500)
    return response.end('Startup failed')
  }
  if (request.url === '/environment') {
    response.writeHead(200, { 'content-type': 'application/json' })
    return response.end(
      JSON.stringify({
        command: process.argv[2],
        nodeEnv: process.env.NODE_ENV,
      })
    )
  }
  response.writeHead(200, { 'content-type': 'text/plain' })
  response.end('Fixture is running')
}).listen(port, '127.0.0.1')
