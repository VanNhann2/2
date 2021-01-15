import * as grpc from '@grpc/grpc-js'
import * as protoLoader from '@grpc/proto-loader'
import _ from 'lodash'
import { logger } from '../../utils'

export class GRpcClient {
  /** @type grpc.GrpcObject */
  #proto = null

  #client = null

  /**
   * @constructor
   * @param {string} serverAddress
   * @param {string} protoPath
   * @param {string} serviceName
   */
  constructor(serverAddress, protoPath, serviceName) {
    this.#proto = this.#loadProto(protoPath)
    // console.log('dadasd')
    // console.log(this.#proto)
    // console.log(serviceName)
    // console.log(_.get(this.#proto, serviceName))
    this.#client = new (_.get(this.#proto, serviceName))(serverAddress, grpc.credentials.createInsecure())
  }

  // /**
  //  * Make a gRPC request to server
  //  * @param {string} method
  //  * @param {object} requestData
  //  */
  // getCameraById = async (requestData) => {
  //   return new Promise((resolve, reject) => {
  //     this.#client(requestData, (err, response) => {
  //       if (err) reject(err)
  //       resolve(response)
  //     })
  //   })
  // }

  /**
   * Make a gRPC request to server
   * @param {string} method
   * @param {object} requestData
   */
  makeRequest = async (method, requestData) => {
    return new Promise((resolve, reject) => {
      this.#client[method](requestData, (err, response) => {
        if (err) reject(err)
        resolve(response)
      })
    })
  }

  /**
   * Load protocol buffer
   * @param {string} path
   */
  #loadProto = (path) => {
    const pkgDefine = protoLoader.loadSync(path, { keepCase: true, longs: String, enums: String, defaults: true, oneofs: true })
    const proto = grpc.loadPackageDefinition(pkgDefine)

    return proto
  }
}
