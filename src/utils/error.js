// eslint-disable-next-line no-unused-vars
const errorData = {
  code: new Number(),
  message: new String(),
  detail: new String(),
  params: new Object()
}

class CommonError extends Error {
  /**
   * @constructor
   * @param {errorData} data error data
   */
  constructor(data) {
    super(data.message)
    this.code = data.code
    this.detail = data.detail
    this.params = data.params
  }
}

export class ServiceError extends CommonError {
  /**
   * @constructor
   * @param {errorData} data error data
   */
  constructor(data) {
    super(data)
    this.name = 'ServiceError'
  }
}

export class AppError extends CommonError {
  /**
   * @constructor
   * @param {errorData} data error data
   */
  constructor(data) {
    super(data)
    this.name = 'AppError'
  }
}

export class RequestError extends CommonError {
  /**
   * @constructor
   * @param {errorData} data error data
   */
  constructor(data) {
    super(data)
    this.name = 'RequestError'
  }
}
