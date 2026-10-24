export class RdxConfigError extends Error {
  constructor(message: string) {
    super(`Invalid rdx.config.ts: ${message}`)
    this.name = 'RdxConfigError'
  }
}
