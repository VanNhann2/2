import { MongoService } from './mongodb'

//TODO: others database

export class Database {
  /** @type {MongoService} */
  #database = undefined

  constructor() {
    this.#database = new MongoService()
  }

  start = async () => {
    await this.#database.start()
  }

  stop = async () => {
    await this.#database.stop()
  }
}
