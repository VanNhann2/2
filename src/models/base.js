import mongoose from 'mongoose'

export class BaseSchema {
  /** @type {mongoose.Schema} */
  #schema = undefined

  /**
   * @constructor
   * @param {Object} define
   * @param {Object} options
   */
  constructor(define, options) {
    this.#schema = this.define(define, options)
  }

  get = () => {
    return this.#schema
  }

  /**
   * @param {Object} define
   * @param {Object} options
   */
  define = (define, options) => {
    return new mongoose.Schema(define, options)
  }
}

export class BaseModel {
  /** @type {mongoose.Model<mongoose.Document, {}>} */
  model = undefined

  /**
   * @constructor
   * @param {string} name name of model
   * @param {BaseSchema} schema schema define
   */
  constructor(name, schema) {
    this.model = mongoose.model(name, schema.get())
  }

  get = () => {
    return this.model
  }
}
