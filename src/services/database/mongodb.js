import mongoose from 'mongoose'
import { logger } from '../../utils'
import { config } from '../../configs'

export class MongoService {
  /** @type {Boolean} */
  #stop = false

  constructor() {}

  start = async () => {
    this.#registerSignals()
    await mongoose.connect('mongodb://' + config.databaseHost, this.#setOptions())

    // await mongoose.connection.openUri('mongodb://' + config.databaseHost, this.#setOptions())
    // check if connection is valid, specially when authentication failed
    await mongoose.connection.db.listCollections().toArray()
  }

  stop = async () => {
    await mongoose.connection.close()
    this.#stop = true
  }

  #setOptions = () => {
    /** @type mongoose.ConnectionOptions */
    const options = {
      promiseLibrary: global.Promise,
      useNewUrlParser: true,
      useFindAndModify: false,
      useCreateIndex: true,
      useUnifiedTopology: false,
      user: config.databaseUsername,
      pass: config.databasePassword,
      authSource: 'admin',
      dbName: config.databaseName,
      // replicaSet: 'rs0',
    }

    return options
  }

  #registerSignals = () => {
    mongoose.connection.on('connected', () => {
      logger.info('MongoDB client connected')
    })

    mongoose.connection.on('disconnected', () => {
      logger.warn('MongoDB client disconnected')
      if (!this.#stop && config.env === 'production') {
        setTimeout(this.start, 10000)
      }
    })
  }
}
