import mongoose from 'mongoose'
import to from 'await-to-js'
import _ from 'lodash'
import { violationsSchema, schemaOptions } from './define'
import { BaseModel, BaseSchema } from './base'
import moment from 'moment'
import { replaceImage } from '../utils'
import { config } from '../configs'
import * as validator from '../validator'

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
  conditions = async (idsCamera, vioObject, vioStatus, vioPlate, startSearchDate, endSearchDate, page, platform) => {

    const arrIds = []
    if (!_.isEmpty(idsCamera)) {
      for (let id of idsCamera) {
        arrIds.push(mongoose.Types.ObjectId(id))
      }
    }
    let idsCameraCondition = _.isEmpty(idsCamera) ? {} : { $or: [{ camera: { $in: arrIds } }] }

    let statusCondition
    const objectCondition = _.isEmpty(_.toString(vioObject)) ? {} : { $or: [{ object: vioObject }] }
    if (platform) {
      statusCondition = { $or: [{ status: 2 }] }
    } else {
      statusCondition = _.isEmpty(_.toString(vioStatus)) ? {} : { $or: [{ status: vioStatus }] }
    }
    const plateCondition = _.isEmpty(vioPlate) ? {} : { $or: [{ plate: { $in: vioPlate } }] }
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
        alprTime: '$alpr_time',
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
  getById = async (id, platform) => {
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
        plateImages: '$plate_images',
        vioTime: '$vio_time',
        email: 1,
        owner: 1,
        phone: 1,
      },
    }

    let [err, result] = await to(this.model.aggregate([match, project]))
    if (err) throw err

    let dataWeb = []
    if (!_.isEmpty(result)) {
      _.forEach(result, function (item) {
        let data = {
          id: item.id,
          action: item.action,
          object: item.object,
          status: item.status,
          plate: item.plate,
          camera: item.camera,
          images: replaceImage(item.images, platform),
          objectImages: replaceImage(item.objectImages, platform),
          plateImages: replaceImage(item.plateImages, platform),
          vioTime: item.vioTime,
          email: item.email,
          owner: item.owner,
          phone: item.phone,
        }
        dataWeb.push(data)
      })
    }

    let dataMobile = []
    if (platform) {
      if (!_.isEmpty(result)) {
        _.forEach(result, function (item) {
          let dataDetail = {
            id: item.id,
            violationType: item.action === 3 ? 'Đỗ xe sai quy định' : 'Chưa có hành động',
            vehicleType: validator.defineObject(item.object),
            status: validator.defineStatus(item.status),
            numberPlate: item.plate,
            camera: { id: item.camera },
            images: replaceImage(item.images, platform),
            objectImages: replaceImage(item.objectImages, platform),
            plateImages: replaceImage(item.plateImages, platform),
            thumbnail: replaceImage(item.objectImages, platform)[0] ? replaceImage(item.objectImages, platform)[0] : null,
            vioTime: item.vioTime,
            email: item.email,
            owner: item.owner,
            phone: item.phone,
          }
          dataMobile.push(dataDetail)
        })
      }
    }

    return platform ? dataMobile[0] : dataWeb[0] ? dataWeb[0] : {}
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

    console.log({ result })
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
  getStatistical = async (dateSearch, timeline) => {
    console.log({ dateSearch })
    let page = 1
    let arrDate = []
    for (let i = 0; i < 10; i++) {
      let dateSubtract = moment(dateSearch).subtract(i, 'days').format('YYYY-MM-DD')
      arrDate.push(dateSubtract)
    }
    // console.log(arrDate)

    let arrWeek = []
    for (let i = 0; i < 20; i++) {
      let dateSubtract = moment(dateSearch).subtract(i, 'weeks').format('YYYY-MM-DD')
      let date = moment(dateSubtract, 'YYYYMMDD').isoWeek()
      arrWeek.push(date)
    }
    // console.log(arrWeek)

    let arrMonth = []
    for (let i = 0; i < 10; i++) {
      let dateSubtract = moment(dateSearch).subtract(i, 'months').format('YYYY-MM')
      arrMonth.push(dateSubtract)
    }

    let arrYear = []
    for (let i = 0; i < 10; i++) {
      let dateSubtract = moment(dateSearch).subtract(i, 'years').format('YYYY')
      arrYear.push(dateSubtract)
    }
    console.log({ arrYear })

    const otherCondition = { deleted: { $ne: true } }
    const sortDateChose = _.isEmpty(_.toString(dateSearch)) ? {} : { $or: [{ vio_time: { $lte: new Date(dateSearch) } }] }
    const match = {
      $match: { $and: [otherCondition, sortDateChose] },
    }

    const project = {
      $project: {
        time: '$_id',
        status1: 1,
        status2: 1,
        status3: 1,
        status4: 1,
        _id: 1,
      },
    }

    let [errDay, timelineDay] = await to(
      this.model.aggregate([
        match,
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$vio_time' } },
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
        },
        // { $sort: { _id: -1 } },
        project,
        { $group: { _id: null, stats: { $push: '$$ROOT' } } },
        {
          $project: {
            stats: {
              $map: {
                input: arrDate,
                as: 'time',
                in: {
                  $let: {
                    vars: { dateIndex: { $indexOfArray: ['$stats._id', '$$time'] } },
                    in: {
                      $cond: {
                        if: { $ne: ['$$dateIndex', -1] },
                        then: { $arrayElemAt: ['$stats', '$$dateIndex'] },
                        else: { _id: '$$time', time: '$$time', status1: 0, status2: 0, status3: 0, status4: 0 },
                      },
                    },
                  },
                },
              },
            },
          },
        },
        {
          $unwind: '$stats',
        },
        {
          $replaceRoot: {
            newRoot: '$stats',
          },
        },
        {
          $project: { time: 1, status1: 1, status2: 1, status3: 1, status4: 1, _id: 0 },
        },
        // { $skip: _.toNumber(config.limitPerPage) * (page - 1) },
        // { $limit: _.toNumber(config.limitPerPage) },
      ])
    )
    if (errDay) throw errDay

    let [errWeek, timelineWeek] = await to(
      this.model.aggregate([
        match,
        {
          $group: {
            _id: { week: { $week: '$vio_time' }, year: { $year: '$vio_time' } },
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
        },
        // { $sort: { _id: -1 } },
        project,
        // { $group: { _id: null, stats: { $push: '$$ROOT' } } },

        // { $skip: _.toNumber(config.limitPerPage) * (page - 1) },
        // { $limit: _.toNumber(config.limitPerPage) },
      ])
    )
    if (errWeek) throw timelineWeek

    let [errMonth, timelineMonth] = await to(
      this.model.aggregate([
        match,
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m', date: '$vio_time' } },
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
        },
        // { $sort: { _id: -1 } },
        project,
        { $group: { _id: null, stats: { $push: '$$ROOT' } } },
        {
          $project: {
            stats: {
              $map: {
                input: arrMonth,
                as: 'time',
                in: {
                  $let: {
                    vars: { dateIndex: { $indexOfArray: ['$stats._id', '$$time'] } },
                    in: {
                      $cond: {
                        if: { $ne: ['$$dateIndex', -1] },
                        then: { $arrayElemAt: ['$stats', '$$dateIndex'] },
                        else: { _id: '$$time', status1: 0, status2: 0, status3: 0, status4: 0, time: '$$time' },
                      },
                    },
                  },
                },
              },
            },
          },
        },
        {
          $unwind: '$stats',
        },
        {
          $replaceRoot: {
            newRoot: '$stats',
          },
        },
        {
          $project: { time: 1, status1: 1, status2: 1, status3: 1, status4: 1, _id: 0 },
        },
        // { $skip: _.toNumber(config.limitPerPage) * (page - 1) },
        // { $limit: _.toNumber(config.limitPerPage) },
      ])
    )
    if (errMonth) throw errMonth

    let [errYear, timelineYear] = await to(
      this.model.aggregate([
        match,
        {
          $group: {
            _id: { $dateToString: { format: '%Y', date: '$vio_time' } },
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
        },
        // { $sort: { _id: -1 } },
        project,
        { $group: { _id: null, stats: { $push: '$$ROOT' } } },
        {
          $project: {
            stats: {
              $map: {
                input: arrYear,
                as: 'time',
                in: {
                  $let: {
                    vars: { dateIndex: { $indexOfArray: ['$stats._id', '$$time'] } },
                    in: {
                      $cond: {
                        if: { $ne: ['$$dateIndex', -1] },
                        then: { $arrayElemAt: ['$stats', '$$dateIndex'] },
                        else: { _id: '$$time', status1: 0, status2: 0, status3: 0, status4: 0, time: '$$time' },
                      },
                    },
                  },
                },
              },
            },
          },
        },
        {
          $unwind: '$stats',
        },
        {
          $replaceRoot: {
            newRoot: '$stats',
          },
        },
        {
          $project: { time: 1, status1: 1, status2: 1, status3: 1, status4: 1, _id: 0 },
        },
        // { $skip: _.toNumber(config.limitPerPage) * (page - 1) },
        // { $limit: _.toNumber(config.limitPerPage) },
      ])
    )
    if (errYear) throw errYear

    return timelineWeek
  }
}
