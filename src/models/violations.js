import mongoose from 'mongoose'
import to from 'await-to-js'
import _ from 'lodash'
import { violationsSchema, schemaOptions } from './define'
import { BaseModel, BaseSchema } from './base'
import moment from 'moment'
import PDFDocument from 'pdfkit'
import fs from 'fs'
import { ObjectId } from 'mongodb'

export class ViolationModel extends BaseModel {

  constructor() {
    super('Violations', new BaseSchema(violationsSchema, schemaOptions))
  }

  /** Get all province */
  getAll = async (objectS, statusS, plateS, sDay, eDay, page) => {
    let perPage = 20
    let pag = page || 1

    const objectCondition = _.isEmpty(_.toString(objectS)) ? {} : { $or: [{ object: objectS }] }
    const statusCondition = _.isEmpty(_.toString(statusS)) ? {} : { $or: [{ status: statusS }] }
    const plateCondition = _.isEmpty(plateS) ? {} : { $or: [{ plate: plateS }] }
    const searchDayCondition = (_.isEmpty(sDay) || _.isEmpty(eDay)) ? {} : { $or: [{ vio_time: { $gte: new Date(sDay), $lte: new Date(eDay) } }] }
    const otherCondition = { deleted: { $ne: true } }

    const match = { $match: { $and: [objectCondition, statusCondition, plateCondition, searchDayCondition, otherCondition] } }
    const project = {
      $project: {
        _id: 0
      }
    }
    const lookup = [
      { $lookup: { from: 'cameras', localField: 'camera', foreignField: 'code', as: 'camera' } },
    ]
    //// tim cai thoi gian cuoi limit (tuc la cai thu 20) query theo id ,  bo cai time do cai $sort,  ==> lay tu 20 cai cuoi len  
    let [err, result] = await to(this.model.aggregate([match, project, ...lookup, { $limit: perPage }, { $sort: { vio_time: -1 } }]))
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

    const lookup = [
      { $lookup: { from: 'cameras', localField: 'camera', foreignField: 'code', as: 'camera' } },
    ]
    const project = {
      $project: {
        _id: 0
      },
    }
    let [err, result] = await to(this.model.aggregate([match, ...lookup, { $addFields: { id: '$_id' } }, project]))
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

  // pagination = async (page) => {

  //   // for (let i = 0; i++; i < 3) {
  //   //   await this.model.create[{
  //   //     actions: 3,
  //   //     object: _.sample([1, 2, 3, 4]),
  //   //     status: _.sample([0, 1, 2]),
  //   //     plate: _.sample(["43A-21542", '43B-25499', "43A-54821", "43A-87458"]),
  //   //     camera: ObjectId("5fdabc16ad8bca1db8581ee1"),
  //   //     time: "",
  //   //     images: [],
  //   //     object_images: [],
  //   //     plate_images: [],
  //   //     vio_time: ISODate("2020-12-28T02:01:38.473Z"),
  //   //     owner: "Nguyen Van B",
  //   //     phone: "02315469845",
  //   //     email: "ACNBH@gmail.com"
  //   //   }]
  //   // }

  //   let perPage = 10
  //   let pag = page || 1

  //   const match = { $match: {} }
  //   const project = {
  //     $project: {
  //       _id: 0
  //     }
  //   }
  //   const data = await to(this.model.aggregate([match, project, fetch]))
  //   const result = {
  //     $facet: {
  //       // metadata: [{ $count: "total" }, { $addFields: { page: pag } }],
  //       data: [{ $skip: ((pag - 1) * perPage) }, { $limit: perPage }]
  //     }
  //   }
  //   return result
  //   // result.sor
  // }

  report = async (id, addressOwnerReport, ownerReport) => {
    if (_.isEmpty(ownerReport)) ownerReport = ' '

    if (_.isEmpty(addressOwnerReport)) addressOwnerReport = ' '
    let [err, result] = await to(this.model.findOne({ _id: mongoose.Types.ObjectId(id) }))
    if (err) {
      throw new Error('Đọc thông tin vi phạm thất bại')
    }

    if (_.isEmpty(result)) {
      throw new Error('Vi phạm không tồn tại')
    }
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
