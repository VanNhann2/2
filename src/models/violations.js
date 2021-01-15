import mongoose from 'mongoose'
import to from 'await-to-js'
import _ from 'lodash'
import { violationsSchema, schemaOptions } from './define'
import { BaseModel, BaseSchema } from './base'

export class ViolationModel extends BaseModel {
  // perPage = undefined
  constructor() {
    super('Violations', new BaseSchema(violationsSchema, schemaOptions))
    this.perPage = 10
  }

  /**
   *
   * @param {Number} vioObject
   * @param {Number} vioStatus
   * @param {String} vioPlate
   * @param {Date} startSearchDate
   * @param {Date} endSearchDate
   * @param {Number} page
   */
  conditions = async (vioObject, vioStatus, vioPlate, startSearchDate, endSearchDate, page) => {
    // let perPage = 10
    const objectCondition = _.isEmpty(_.toString(vioObject)) ? {} : { $or: [{ object: vioObject }] }
    const statusCondition = _.isEmpty(_.toString(vioStatus)) ? {} : { $or: [{ status: vioStatus }] }
    const plateCondition = _.isEmpty(vioPlate) ? {} : { $or: [{ plate: vioPlate }] }
    const searchDateCondition =
      _.isEmpty(startSearchDate) && _.isEmpty(endSearchDate) ? {} : { $or: [{ vio_time: { $gte: new Date(startSearchDate), $lte: new Date(endSearchDate) } }] }
    const otherCondition = { deleted: { $ne: true } }
    const match = { $match: { $and: [objectCondition, statusCondition, plateCondition, searchDateCondition, otherCondition] } }

    const project = {
      $project: {
        _id: 0,
        id: '$_id',
        action: 1,
        object: 1,
        status: 1,
        plate: 1,
        camera: 1,
        time: 1,
        images: 1,
        objectImages: '$object_images',
        plagteImages: '$plate_images',
        vioTime: '$vio_time',
        email: 1,
        owner: 1,
        phone: 1,
      },
    }
    // const addField = { $addFields: { id: '$_id' } }
    //const conditionsData = [match, project, { $addFields: { id: '$_id' } }, { $sort: { vio_time: -1 } }, { $skip: perPage * (page - 1) }, { $limit: perPage }]
    //const conditionsCount = [match, project, { $addFields: { id: '$_id' } }]
    const conditionsData = [match, project, { $sort: { vio_time: -1 } }, { $skip: this.perPage * (page - 1) }, { $limit: this.perPage }]
    const conditionsCount = [match]

    return { conditionsData, conditionsCount }
  }

  /**
   *
   * @param {[]} conditions
   */
  getAll = async (conditions) => {
    let [err, result] = await to(this.model.aggregate(conditions))
    if (err) throw err
    return result
  }

  /**
   *
   * @param {[]} conditions
   */
  getCount = async (conditions) => {
    let [err, result] = await to(this.model.aggregate([...conditions, { $count: 'myCount' }]))
    if (err) throw err
    return result
  }

  /**
   *
   * @param {mongoose.Types.ObjectId} id
   */
  getById = async (id) => {
    const otherCondition = { deleted: { $ne: true } }
    const idCondition = { _id: mongoose.Types.ObjectId(id) }
    const match = {
      // $match: { _id: mongoose.Types.ObjectId(id), deleted: { $ne: true } },
      // {age: { $ne: 12} =>>>>>>>>>>>>>>> WHERE age != 12
      $match: { $and: [otherCondition, idCondition] },
    }

    const project = {
      $project: {
        _id: 0,
        id: '$_id',
        action: 1,
        object: 1,
        status: 1,
        plate: 1,
        camera: 1,
        time: 1,
        images: 1,
        objectImages: '$object_images',
        plagteImages: '$plate_images',
        vioTime: '$vio_time',
        email: 1,
        owner: 1,
        phone: 1,
      },
    }

    let [err, result] = await to(this.model.aggregate([match, project]))
    if (err) throw err

    if (_.isEmpty(result)) return {}
    return result[0]
  }

  /**
   * Update approval status
   * @param {String[]} ids
   * @param {('approved'|'unapproved'|'finishReport'|'finishPenal'|'expired')} action
   */
  updatedStatus = async (ids, action) => {
    let [err, result] = await to(
      this.model.updateMany(
        {
          _id: {
            $in: ids,
          },
        },
        {
          $set: {
            // status: action === 'unapproved' ? 1 : action === 'approved' ? 2 : action === 'finishReport' ? 3 : 4,
            status: action === 'approved' ? 1 : action === 'unapproved' ? 2 : action === 'finishReport' ? 3 : action === 'finishPenal' ? 4 : 5,
          },
        }
      )
    )
    if (err) throw err
    return result
  }

  /**
   *
   * @param {ObjectId} id
   * @param {String} vioObject
   * @param {String} vioPlate
   * @param {String} vioOwner
   * @param {String} vioPhone
   * @param {String} vioEmail
   */
  editViolation = async (id, vioStatus, vioObject, vioPlate, vioOwner, vioPhone, vioEmail) => {
    let [err, result] = await to(
      this.model.findByIdAndUpdate(
        id,
        {
          $set: {
            status: vioStatus,
            object: vioObject,
            plate: vioPlate,
            owner: vioOwner,
            phone: vioPhone,
            email: vioEmail,
          },
        },
        { new: true }
      )
    )
    if (err) throw err
    return result
  }

  /**
   *
   * @param {mongoose.Types.ObjectId} id
   */
  delete = async (ids) => {
    let [err, result] = await to(
      this.model.updateMany(
        {
          _id: {
            $in: ids,
          },
        },
        {
          $set: {
            deleted: true,
          },
        }
      )
    )

    if (err) throw err
    return result
  }
}
