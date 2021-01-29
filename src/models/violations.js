import mongoose, { Mongoose } from 'mongoose'
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
   * @param {'web'|'mobile'} platform
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
   * @param {'web'|'mobile'} platform
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
   * @param {{}} dataChange
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
   * @param {Date}} dateSearch
   * @param {'day'|'week'|'month'|'year'} timeline
   * @param {Number}} page
   * @param {Mongoose.Types.ObjectId} idCam
   */
  getStatistical = async (dateSearch, timeline, page, idCam) => {
    console.log({ dateSearch })
    let arrDate = []
    for (let i = 0; i < 100; i++) {
      let dateSubtract = moment(dateSearch).subtract(i, 'days').format('YYYY-MM-DD')
      arrDate.push(dateSubtract)
    }
    // console.log(arrDate)

    let arrWeek = []
    for (let i = 0; i < 100; i++) {
      let dateSubtract = moment(dateSearch).subtract(i, 'weeks').format('YYYY-MM-DD')
      // console.log({ dateSubtract })
      let date = moment(dateSearch - 1, 'YYYYMMDD').isoWeek()
      // let dateFor
      // if (date > 1) {
      //   dateFor = {
      //     week: date,
      //     year: new Date(dateSearch).getFullYear() - 1,
      //   }
      // } else {
      //   dateFor = {
      //     week: date,
      //     year: new Date(dateSearch).getFullYear(),
      //   }
      // }
      arrWeek.push(date)
    }
    // let arrWeek1
    // let arrWeek2
    let arrWeek1 = arrWeek.slice(0, _.indexOf(arrWeek, 1) + 1)
    let arrWeek2 = arrWeek.slice(_.indexOf(arrWeek, 1) + 1)
    let arrWeek3
    console.log({ arrWeek })
    console.log({ arrWeek2 })

    if (arrWeek2.length > 52) {
      arrWeek3 = arrWeek2.slice(_.indexOf(arrWeek2, 1) + 1)
    }
    console.log({ arrWeek3 })
    let dataWeek1 = []
    _.forEach(arrWeek1, function (x) {
      let arr = {
        week: x,
        year: new Date(dateSearch).getFullYear(),
      }
      dataWeek1.push(arr)
    })
    let dataWeek2 = []
    _.forEach(arrWeek2, function (x) {
      let arr = {
        week: x,
        year: new Date(dateSearch).getFullYear() - 1,
      }
      dataWeek2.push(arr)
    })
    let dataWeek = [...dataWeek1, ...dataWeek2]
    // console.log({ dataWeek1 })
    // console.log({ dataWeek2 })

    let arrMonth = []
    for (let i = 0; i < 40; i++) {
      let dateSubtract = moment(dateSearch).subtract(i, 'months').format('YYYY-MM')
      arrMonth.push(dateSubtract)
    }
    // console.log(arrMonth)

    let arrYear = []
    for (let i = 0; i < 10; i++) {
      let dateSubtract = moment(dateSearch).subtract(i, 'years').format('YYYY')
      arrYear.push(dateSubtract)
    }
    // console.log({ arrYear })

    const otherCondition = { deleted: { $ne: true } }
    let idCamCondition = _.isEmpty(idCam) ? {} : { $or: [{ camera: mongoose.Types.ObjectId(idCam) }] }

    const sortDateChose = _.isEmpty(_.toString(dateSearch)) ? {} : { $or: [{ vio_time: { $lte: new Date(dateSearch) } }] }
    const match = {
      $match: { $and: [otherCondition, sortDateChose, idCamCondition] },
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

    let data
    if (timeline === 'day') {
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
          { $skip: _.toNumber(config.limitStatistical) * (page - 1) },
          { $limit: _.toNumber(config.limitStatistical) },
        ])
      )
      if (errDay) throw errDay
      let arrData = []
      // const dataDay = []
      if (!_.isEmpty(timelineDay)) {
        _.forEach(timelineDay, function (item) {
          let dataFor = {
            unapproved: item.status1,
            approved: item.status2,
            finishReport: item.status3,
            finishPenal: item.status4,
            count: item.status1 + item.status2 + item.status3 + item.status4,
            time: moment(item.time).format('DD-MM-YYYY'),
          }
          arrData.push(dataFor)
        })
        data = {
          data: arrData || [],
          totalPage: Math.ceil(arrDate.length / config.limitStatistical) || 0,
        }
      }
    } else if (timeline === 'week') {
      // arrDate.push([...timelineWeek])
    } else if (timeline === 'month') {
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
          { $skip: _.toNumber(config.limitStatistical) * (page - 1) },
          { $limit: _.toNumber(config.limitStatistical) },
        ])
      )
      if (errMonth) throw errMonth

      const addStartMonth = (dateStart) => {
        // const dateSear = `${new Date(dateSearch).getFullYear()}/${new Date(dateSearch).getMonth() + 1}`
        // console.log({ dateSear })
        // console.log(moment(dateStart).isSame(dateSearch, 'month'))
        if (moment(dateStart).isSame(dateSearch, 'month')) {
          return `${new Date(dateSearch).getDate()}-${new Date(dateSearch).getMonth() + 1}-${new Date(dateSearch).getFullYear()}`
        } else return moment(dateStart).clone().endOf('month').format('DD-MM-YYYY')
      }

      if (!_.isEmpty(timelineMonth)) {
        let arrData = []
        _.forEach(timelineMonth, function (item) {
          let dataFor = {
            unapproved: item.status1,
            approved: item.status2,
            finishReport: item.status3,
            finishPenal: item.status4,
            count: item.status1 + item.status2 + item.status3 + item.status4,
            time: `${addStartMonth(item.time)} - ${moment(item.time).clone().startOf('month').format('DD-MM-YYYY')}`,
            // start: addStartMonth(item.time),
            // end: moment(item.time).clone().startOf('month').format('YYYY-MM-DD'),
          }
          arrData.push(dataFor)
        })
        data = {
          data: arrData || [],
          totalPage: Math.ceil(arrMonth.length / config.limitStatistical) || 0,
        }
      }
    } else if (timeline === 'year') {
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
          { $skip: _.toNumber(config.limitStatistical) * (page - 1) },
          { $limit: _.toNumber(config.limitStatistical) },
        ])
      )
      if (errYear) throw errYear

      const addStartYear = (dateStart) => {
        const dateSear = `${new Date(dateSearch).getFullYear()}`
        if (moment(dateStart).isSame(dateSear, 'month')) {
          return `${new Date(dateSearch).getDate()}-${new Date(dateSearch).getMonth() + 1}-${new Date(dateSearch).getFullYear()}`
        } else return moment(dateStart).clone().endOf('year').format('DD-MM-YYYY')
      }

      if (!_.isEmpty(timelineYear)) {
        let arrData = []
        _.forEach(timelineYear, function (item) {
          let dataFor = {
            unapproved: item.status1,
            approved: item.status2,
            finishReport: item.status3,
            finishPenal: item.status4,
            count: item.status1 + item.status2 + item.status3 + item.status4,
            time: `${addStartYear(item.time)} - ${moment(item.time).clone().startOf('year').format('DD-MM-YYYY')}`,
            // start: addStartYear(item.time),
            // end: moment(item.time).clone().startOf('year').format('DD-MM-YYYY'),
          }
          arrData.push(dataFor)
        })
        data = {
          data: arrData || [],
          totalPage: Math.ceil(arrYear.length / config.limitStatistical) || 0,
        }
      }
    }

    // let arrDate = []
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
        { $group: { _id: null, stats: { $push: '$$ROOT' } } },
        {
          $project: {
            stats: {
              $map: {
                input: dataWeek,
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
        // { $group: { _id: null, stats: { $push: '$$ROOT' } } },

        // { $skip: _.toNumber(config.limitPerPage) * (page - 1) },
        // { $limit: _.toNumber(config.limitPerPage) },
      ])
    )
    if (errWeek) throw errWeek

    return timelineWeek
  }
}
