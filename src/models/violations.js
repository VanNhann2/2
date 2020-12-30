import mongoose from 'mongoose'
import to from 'await-to-js'
import _ from 'lodash'
import { violationsSchema, schemaOptions } from './define'
import { BaseModel, BaseSchema } from './base'

export class ViolationModel extends BaseModel {

  constructor() {
    super('Violations', new BaseSchema(violationsSchema, schemaOptions))
  }

  /** Get all province */
  getAll = async (isObject, isStatus, isPlate, startDay, endDay) => {
    console.log("isObject: " + isObject + "isStatus: " + isStatus + "isPlate: " + isPlate)
    // console.log(isObject)
    // console.log(isStatus)
    // console.log(isPlate)
    const objectCondition = _.isEmpty(_.toString(isObject)) ? {} : { $or: [{ object: isObject }] }
    const statusCondition = _.isEmpty(_.toString(isStatus)) ? {} : { $or: [{ status: isStatus }] }
    // console.log(objectCondition)
    const plateCondition = _.isEmpty(isPlate) ? {} : { $or: [{ plate: isPlate }] }
    // const plateCondition = _.isEmpty(startDay) ? {} : { $or: [{ plate: isPlate }] }
    // const plateCondition = _.isEmpty(endDay) ? {} : { $or: [{ plate: isPlate }] }
    // console.log(plateCondition)
    const searchDay = (_.isEmpty(startDay) || _.isEmpty(endDay)) ? "" : { $or: [{ vio_time: { $gte: startDay, $lt: endDay } }] }
    const otherCondition = { deleted: { $ne: true } }
    const match = { $match: { $and: [objectCondition, statusCondition, plateCondition, otherCondition, searchDay] } }
    const project = {
      $project: {
        _id: 0
      }
    }

    let [err, result] = await to(this.model.aggregate([match, project]))
    if (err) throw err
    return result
  }

  getById = async (id) => {
    const otherCondition = { deleted: { $ne: true } }
    const idCondition = { _id: mongoose.Types.ObjectId(id) }
    const match = {
      // $match: { _id: mongoose.Types.ObjectId(id), deleted: { $ne: true } },
      // {age: { $ne: 12} =>>>>>>>>>>>>>>> WHERE age != 12 
      $match: { $and: [otherCondition, idCondition] }
    }

    const project = {
      $project: {
        _id: 0
      },
    }
    let [err, result] = await to(this.model.aggregate([match, { $addFields: { id: '$_id' } }, project]))
    if (err) throw err

    if (_.isEmpty(result)) return {}
    return result
  }


  updatedStatus = async (id, status) => {
    let [err, result] = await to(
      this.model.findByIdAndUpdate(
        id,
        {
          $set: {
            status: (status === 1) ? (status = 0) : ((status === 0) ? (status = 1) : '')
          }
        },
        { new: true }
      )
    )
    if (err) throw err
    return result
  }

  editViolation = async (id, object, plate) => {
    let [err, result] = await to(
      this.model.findByIdAndUpdate(
        id,
        {
          $set: {
            object: object,
            plate: plate
          }
        },
        { new: true }
      )
    )
    if (err) throw err
    return result
  }

  delete = async (id) => {
    let [err, result] = await to(
      this.model.findByIdAndUpdate(
        id,
        {
          $set: {
            deleted: true,
          },
        },
        { new: true }
      )
    )

    if (err) throw err
    return result
  }
}