import express from 'express'
import http from 'http'
import cookieParser from 'cookie-parser'
// import compression from 'compression'
import cors from 'cors'
import StatusCodes from 'http-status-codes'

import { apis } from '../../api'
import { config } from '../../configs'
import { logger } from '../../utils'

export class HttpServer {
  /** @type {http.Server} */
  #server = null

  /** @type {express.Express}  */
  #app = null

  constructor() {
    this.#app = express()
  }

  start = async () => {
    this.#app.use(express.json())
    this.#app.use(
      express.urlencoded({
        extended: true,
      })
    )
    this.#app.use(cookieParser())
    this.#app.disable('x-powered-by')
    this.#app.use(cors({ exposedHeaders: ['X-Filename'] }))
    // this.#app.use(compression())

    this.#app.use(config.apiPrefix, apis())
    this.#app.use(this.#checkRouteExist, this.#handleError)

    this.#server = http.createServer(this.#app)
    this.#server.listen(config.apiPort, '0.0.0.0', () => logger.info('Http server is running at port:', config.apiPort))
  }

  stop = async () => {
    if (this.#server) {
      this.#server.close()
      logger.info('Http server stopped')
    }
  }

  isAlive = () => {
    return this.#server.listening
  }

  // checking for routes that not exist
  #checkRouteExist = (req, res, next) => {
    if (!req.route) return next({ status: 404, messages: 'Endpoint not found' })
    next()
  }

  // handle error
  #handleError = (err, req, res, next) => {
    if (err) {
      if (config.env !== 'production') {
        logger.error(`HTTP ${req.method} ${req.originalUrl} ${err.code}: ${err.message}`)
      }
      res.status(err.code || StatusCodes.INTERNAL_SERVER_ERROR)
      res.json({ messages: err.message, params: err.params })
    }
    next()
  }
}
