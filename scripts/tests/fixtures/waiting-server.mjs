import process from 'node:process'

console.error(`Intentional startup timeout (PID ${process.pid})`)
setInterval(() => {}, 1_000)
