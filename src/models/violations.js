import mongoose from 'mongoose'
import to from 'await-to-js'
import _ from 'lodash'
import { violationsSchema, schemaOptions } from './define'
import { BaseModel, BaseSchema } from './base'
import moment from 'moment'
import { replacePath, replaceImage } from '../utils'
import { config } from '../configs'

export class ViolationModel extends BaseModel {
  // perPage = undefined
  constructor() {
    super('Objects', new BaseSchema(violationsSchema, schemaOptions))
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
  conditions = async (idsCamera, vioObject, vioStatus, vioPlate, startSearchDate, endSearchDate, page) => {
    const arrIds = []
    if (!_.isEmpty(idsCamera)) {
      for (let id of idsCamera) {
        arrIds.push(mongoose.Types.ObjectId(id))
      }
    }
    let idsCameraCondition = _.isEmpty(idsCamera) ? {} : { $or: [{ camera: { $in: arrIds } }] }

    const objectCondition = _.isEmpty(_.toString(vioObject)) ? {} : { $or: [{ object: vioObject }] }
    const statusCondition = _.isEmpty(_.toString(vioStatus)) ? {} : { $or: [{ status: vioStatus }] }
    const plateCondition = _.isEmpty(vioPlate) ? {} : { $or: [{ plate: vioPlate }] }
    const searchDateCondition =
      _.isEmpty(startSearchDate) && _.isEmpty(endSearchDate) ? {} : { $or: [{ vio_time: { $gte: new Date(startSearchDate), $lte: new Date(endSearchDate) } }] }
    const otherCondition = { deleted: { $ne: true } }
    const match = { $match: { $and: [idsCameraCondition, objectCondition, statusCondition, plateCondition, searchDateCondition, otherCondition] } }

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
    const conditionsData = [
      match,
      project,
      { $sort: { vioTime: -1 } },
      { $skip: _.toNumber(config.limitPerPage) * (page - 1) },
      { $limit: _.toNumber(config.limitPerPage) },
    ]
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
          email: item.email,
          owner: item.owner,
          phone: item.phone,
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
    const otherCondition = { deleted: { $ne: true } }
    const plateCondition = _.isEmpty(plate) ? {} : { $or: [{ plate: plate }] }
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

    let dataResutl = []
    if (!_.isEmpty(result)) {
      _.forEach(result, function (item) {
        let data = {
          id: item.id,
          violationType: item.action === 3 ? 'Đỗ xe sai quy định' : '',
          vehicleType:
            item.object === 0
              ? 'Mô tô'
              : item.object === 1
              ? 'Ô tô khách trên 16 chỗ'
              : item.object === 2
              ? 'Ô tô con'
              : item.object === 3
              ? 'Ô tô khách 16 chỗ'
              : 'Ô tô tải',
          status:
            item.status === 1
              ? 'Chưa duyệt'
              : item.status === 2
              ? 'Đã duyệt'
              : item.status === 3
              ? 'Đã xuất biên bản'
              : item.status === 4
              ? 'Đã hoàn thành xử phạt'
              : 'Quá hạn',
          numberPlate: item.plate,
          camera: { id: item.camera },
          images: !_.isEmpty(replaceImage(item.images)) ? config.LinkImageMobile + replaceImage(item.images) : [],
          objectImages: !_.isEmpty(replaceImage(item.objectImages)) ? config.LinkImageMobile + replaceImage(item.objectImages) : [],
          plateImages: !_.isEmpty(replaceImage(item.plateImages)) ? config.LinkImageMobile + replaceImage(item.plateImages) : [],
          vioTime: item.vioTime,
          email: item.email,
          owner: item.owner,
          phone: item.phone,
        }
        dataResutl.push(data)
      })
      return dataResutl
    }
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
          email: item.email,
          owner: item.owner,
          phone: item.phone,
        }
        dataResutl.push(data)
      })
      return dataResutl[0] ? dataResutl[0] : {}
    }
  }

  /**
   * Update approval status
   * @param {String[]} ids
   * @param {('unapproved'|'approved'|'finishReport'|'finishPenal'|'expired')} action
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
            status: action === 'unapproved' ? 1 : action === 'approved' ? 2 : action === 'finishReport' ? 3 : action === 'finishPenal' ? 4 : 5,
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
  editViolation = async (id, dataChange) => {
    let [err, result] = await to(
      this.model.findByIdAndUpdate(
        id,
        {
          $set: dataChange,
        },
        { new: true }
      )
    )
    if (err) throw err

    let dataResutl = []
    if (!_.isEmpty(result)) {
      let data = {
        id: result._id,
        action: result.action,
        object: result.object,
        status: result.status,
        plate: result.plate,
        camera: result.camera,
        images: replaceImage(result.images),
        objectImages: replaceImage(result.object_images),
        plateImages: replaceImage(result.plate_images),
        vioTime: result.vio_time,
        email: result.email,
        owner: result.owner,
        phone: result.phone,
      }
      dataResutl = data
    }
    console.log({ dataResutl })
    return dataResutl ? dataResutl : {}
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

  /**
   *
   * @param {Date()} timeEndSearch
   * @param {Number} status
   */
  getStatistical = async (date, timeline) => {
    console.log({ date })
    let page = 1
    let arrDate = []
    for (let i = 1; i < 5; i++) {
      let dateSubtract = moment(date).subtract(i, 'days').format('MM-DD-YYYY')
      arrDate.push(dateSubtract)
    }
    console.log(arrDate)
    arrDate = arrDate.map((arr) => {
      return new Date(arr)
    })
    // const startDate = new Date(date)
    // const endDate = new Date('2020-12-20T17:00:00.000Z')
    // const sortDateChose = _.isEmpty(_.toString(date)) ? {} : { $or: [{ vio_time: { $gte: new Date(startDate), $lt: new Date(endDate) } }] }
    const otherCondition = { deleted: { $ne: true } }
    const sortDateChose = _.isEmpty(_.toString(date)) ? {} : { $or: [{ vio_time: { $lt: new Date(date) } }] }
    const match = {
      $match: { $and: [otherCondition, sortDateChose] },
    }

    const group = {
      $group: {
        _id: {
          day: { $dayOfMonth: '$vio_time' },
          month: { $month: '$vio_time' },
          year: { $year: '$vio_time' },
        },
        status1: {
          $sum: { $cond: [{ $eq: ['$status', 1] }, 1, 0] },
        },
        status2: {
          $sum: { $cond: [{ $eq: ['$status', 2] }, 1, 0] },
        },
        status3: {
          $sum: { $cond: [{ $eq: ['$status', 3] }, 1, 0] },
        },
        status4: {
          $sum: { $cond: [{ $eq: ['$status', 4] }, 1, 0] },
        },
      },
    }

    const project = {
      $project: {
        date: '$_id',
        status1: 1,
        status2: 1,
        status3: 1,
        status4: 1,
        _id: 0,
      },
    }

    let [err, result] = await to(
      this.model.aggregate([
        match,
        group,
        project,
        { $sort: { _id: -1 } },
        { $skip: _.toNumber(config.limitPerPage) * (page - 1) },
        { $limit: _.toNumber(config.limitPerPage) },
      ])
    )
    if (err) throw err

    return result
  }
}
