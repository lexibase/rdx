import { createServer } from 'node:http'
import process from 'node:process'

const port = Number(process.argv[process.argv.indexOf('--port') + 1])
createServer((request, response) => {
  response.writeHead(200, { 'content-type': 'text/plain' })
  response.end('Fixture is running')
}).listen(port, '127.0.0.1')
