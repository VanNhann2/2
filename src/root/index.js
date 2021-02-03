import { logger } from '../utils'
import { Server, Database } from '../services'
import { model } from '../models'

export class Root {
  /** @type {Server} */
  #server = null

  /** @type {Database} */
  #database = null

  constructor() {
    this.#server = new Server()
    this.#database = new Database()
  }

  start = async () => {
    this.#registerSignal()

    logger.info('Starting server...')
    await this.#server.start()

    logger.info('Starting database client...')
    await this.#database.start()

    await model.createRequiredCollections()
  }

  stop = async () => {
    logger.info('Stopping server...')
    await this.#server.stop()

    logger.info('Stopping database client...')
    await this.#database.stop()

    // logger.info('Stopping gRPC server...')
  }

  #registerSignal = () => {
    process.on('SIGINT', this.#handleSignal.bind(this, 'SIGINT'))
    process.on('SIGTERM', this.#handleSignal.bind(this, 'SIGTERM'))
  }

  #handleSignal = async (signal) => {
    if (!this.#server.isAlive()) return

    logger.warn(`Received signal: ${signal}`)
    try {
      await this.stop()
      logger.info('App stopped succesfully')
      process.exit(0)
    } catch {
      logger.error('App stop with error, please check')
      process.exit(1)
    }
  }
}
