import to from 'await-to-js'
import * as StatusCodes from 'http-status-codes'
import { model } from '../models'
import { AppError, logger } from '../utils'
import mongoose from 'mongoose'

export class Violation {
  constructor() { }

  /** Get all violations */
  getAll = async (object, status, plate, startSearch, endSearch) => {
    try {
      const vehicle = object === 'loai1' ? 0 : 1
      const boolStatus = status === 'enabled' ? 1 : ('disabled' ? 0 : 2)
      const isObject = object ? vehicle : []
      const isStatus = status ? boolStatus : []
      const isPlate = plate ? plate : []
      const startDay = startSearch ? startSearch : ""
      const endDay = endSearch ? endSearch : ""
      let [err, result] = await to(model.violation.getAll(isObject, isStatus, isPlate, startDay, endDay))
      if (err) throw err
      return result
    } catch (error) {
      logger.error('Violations.getAll() error:', error)
      throw new AppError({ code: StatusCodes.INTERNAL_SERVER_ERROR, message: 'Lấy danh sách vi phạm thất bại' })
    }
  }

  getById = async (id) => {
    try {
      let [err, result] = await to(model.violation.getById(id))
      if (err) {
        throw err
      }

      return result
    } catch (error) {
      logger.error('Violations.getById() error:', error)
      throw new AppError({ code: StatusCodes.INTERNAL_SERVER_ERROR, message: 'Lấy thông tin vi phạm thất bại' })
    }
  }

  changeApproved = async (id, status) => {
    try {
      const boolStatus = status === 'enabled' ? 1 : ('disabled' ? 0 : 2)
      let [err, result] = await to(model.violation.updatedStatus(id, boolStatus))
      if (err) throw err

      return result
    } catch (error) {
      logger.error('Violations.getById() error:', error)
      throw new AppError({ code: StatusCodes.INTERNAL_SERVER_ERROR, message: 'Thay đổi thông tin vi phạm thất bại' })
    }
  }

  editViolation = async (id, object, plate) => {
    try {
      let [err, result] = await to(model.violation.editViolation(id, object, plate))
      if (err) throw err

      return result
    } catch (error) {
      logger.error('Violations.getById() error:', error)
      throw new AppError({ code: StatusCodes.INTERNAL_SERVER_ERROR, message: 'Thay đổi thông tin vi phạm thất bại' })
    }
  }



  /**
   * Delete violations
   * @param {string|mongoose.Types.ObjectId} id
   */
  delete = async (id) => {
    //////// session dung de xoa CA 2 table khac nhau neu ben table A get thuoc tinh table B
    // let session = undefined
    try {
      // let [errSession, newSession] = await to(mongoose.startSession())
      // if (errSession) throw errSession
      // session = newSession
      // session.startTransaction()

      // let [errDelete] = await to(model.violation.delete(id, session))
      // if (errDelete) throw errDelete

      // session.endSession()

      let [errDelete] = await to(model.violation.delete(id))
      if (errDelete) throw errDelete

      return 'Xóa vi phạm thành công'
    } catch (error) {
      logger.error('Violations.delete() error:', error)
      if (session) await session.abortTransaction()
      throw new AppError({ code: StatusCodes.INTERNAL_SERVER_ERROR, message: 'Xóa vi phạm thất bại' })
    }
  }
}