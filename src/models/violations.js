import mongoose from 'mongoose'
import to from 'await-to-js'
import _ from 'lodash'
import { violationsSchema, schemaOptions } from './define'
import { BaseModel, BaseSchema } from './base'
import moment from 'moment'
import { replacePath } from '../utils'

export class ViolationModel extends BaseModel {
  // perPage = undefined
  constructor() {
    super('Objects', new BaseSchema(violationsSchema, schemaOptions))
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
        plateImages: '$plate_images',
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

    const replaceImage = (image) => {
      let arrayImage = []
      _.forEach(image, function (item) {
        arrayImage.push(replacePath(item))
      })
      return arrayImage
    }

    let dataResutl = []
    if (!_.isEmpty(result)) {
      _.forEach(result, function (item) {
        let data = {
          id: item.id,
          action: item.action,
          object: item.object,
          status: item.status,
          plate: item.plate,
          camera: item.camera,
          images: replaceImage(item.images),
          objectImages: replaceImage(item.objectImages),
          plateImages: replaceImage(item.plateImages),
          vioTime: item.vioTime,
        }
        dataResutl.push(data)
      })
      return dataResutl
    }
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

  getAllPublic = async (plate) => {
    console.log(plate)
    const otherCondition = { deleted: { $ne: true } }
    const plateCondition = _.isEmpty(plate) ? {} : { $or: [{ plate: plate }] }
    console.log(plateCondition)
    const match = { $match: { $and: [plateCondition, otherCondition] } }

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
        id: '$_id',
        _id: 0,
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
  timeEndSearch
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

  /**
   *
   * @param {Date()} timeEndSearch
   * @param {Number} status
   */
  getStatistical = async (date, timeline) => {
    // console.log({ date })
    // const endDate = new Date('2020-12-12T17:00:00.000Z')
    // const otherCondition = { deleted: { $ne: true } }
    // const sortDateChose = _.isEmpty(_.toString(date)) ? {} : { $or: [{ vio_time: { $lte: new Date(date) } }] }
    // let [err, result] = await to(
    //   this.model.aggregate([
    //     {
    //       $match: { $and: [otherCondition, sortDateChose] },
    //     },
    //     {
    //       $addFields: {
    //         saleDate: { $dateFromParts: { year: { $year: '$vio_time' }, month: { $month: '$vio_time' }, day: { $dayOfMonth: '$vio_time' } } },
    //         dateRange: {
    //           $map: {
    //             input: { $range: [0, { $subtract: [date, endDate] }, 1000 * 60 * 60 * 24] },
    //             in: { $add: [date, '$$this'] },
    //           },
    //         },
    //       },
    //     },
    //     { $unwind: '$dateRange' },
    //     {
    //       $group: {
    //         _id: { date: '$dateRange', make: '$status' },
    //         count: { $sum: { $cond: [{ $eq: ['$dateRange', '$vio_time'] }, 1, 0] } },
    //       },
    //     },
    //     {
    //       $group: {
    //         _id: '$_id.date',
    //         total: { $sum: '$count' },
    //         byBrand: { $push: { k: '$_id.make', v: { $sum: '$count' } } },
    //       },
    //     },
    //     { $sort: { _id: 1 } },
    //     {
    //       $project: {
    //         _id: 0,
    //         saleDate: '$_id',
    //         totalSold: '$total',
    //         byBrand: { $arrayToObject: { $filter: { input: '$byBrand', cond: '$$this.v' } } },
    //       },
    //     },
    //   ])
    // )
    // if (err) throw err
    // return result
  }
}
