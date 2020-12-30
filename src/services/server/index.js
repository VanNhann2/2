import { HttpServer } from './http'

//TODO: https server

export class Server {
  /** @type {HttpServer} */
  #server = undefined

  constructor() {
    this.#server = new HttpServer()
  }

  start = async () => {
    await this.#server.start()
  }

  stop = async () => {
    await this.#server.stop()
  }

  isAlive = () => {
    return this.#server.isAlive()
  }
}
