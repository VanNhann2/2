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
    let perPage = 10
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

    let [err, result] = await to(this.model.aggregate([match, project, { "$limit": 20 }]))
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

  report = async (id, addressOwnerReport, ownerReport, res) => {
    let [err, violation] = await to(this.model.aggregate({ $match: { id: mongoose.Types.ObjectId(id) } }))
    if (err) {
      throw 'Đọc thông tin vi phạm thất bại'
    }

    if (_.isEmpty(violation)) {
      throw 'Vi phạm không tồn tại'
    }

    const vio_daytime = moment(new Date(violation.vio_time)).format('DD/MM/YYYY HH:mm:ss')
    const vio_day = vio_daytime.split(' ')[0]
    const vio_time = vio_daytime.split(' ')[1]

    let vio_objectType
    switch (violation.object) {
      case 0:
        vio_objectType = 'Xe máy'
        break
      case 1:
        vio_objectType = 'Ô tô'
        break
      case 2:
        vio_objectType = 'Xe tải'
        break
      case 3:
        vio_objectType = 'Xe khách'
        break
      case 4:
        vio_objectType = 'Xe buýt'
        break
      default:
        break
    }

    if (_.isEmpty(ownerReport)) ownerReport = ' '

    if (_.isEmpty(addressOwnerReport)) addressOwnerReport = ' '

    const doc = new PDFDocument({
      size: 'A5',
      layout: "portrait",
    })
    // const font_path = config.staticFolder + '/fonts'
    // doc.registerFont('regular', font_path + '/times.ttf')
    // doc.registerFont('italic', font_path + '/times_italic.ttf')
    // doc.registerFont('bold', font_path + '/times_bold.ttf')
    // doc.registerFont('bold_italic', font_path + '/times_bolditalic.ttf')

    doc.fontSize(12)
    doc.font('regular').text('SỞ GTVT THÀNH PHỐ ĐÀ NẴNG', 30, doc.y, { continued: true })
    doc.font('bold').text('CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM', { align: 'right' })

    doc.fontSize(13)
    doc.font('bold').text('THANH TRA SỞ', 50, doc.y, { align: 'left', continued: true })
      .underline(75, doc.y + 15, 145, 2)

    doc
      .font('bold')
      .text('Độc lập - Tự do - Hạnh phúc', 0, doc.y, { align: 'right' })
      .underline(360, doc.y, 110, 2)

    doc.fontSize(11)
    doc.font('regular')
      .text('Số .........', 70, doc.y, { align: 'left' })

    doc.moveDown(0.7)
    doc.font('bold')
      .text('THANH TRA SỞ GIAO THÔNG VẬN TẢI THÀNH PHỐ ĐÀ NẴNG', 130, doc.y)

    doc.moveDown(0.3)
    doc.font('bold').text('THÔNG BÁO', 258, doc.y)

    doc.moveDown(0.2)
    doc.text('Ông (bà) là chủ phương tiện (lái xe) BKS số: ' + violation.plate, 30, doc.y, { continued: true })
      .moveDown(0.1)
      .fontSize(12)
      .moveDown(0.8)
      .text('Đã vi phạm            :  Đỗ xe sai quy định ', 20, doc.y)
      .moveDown(0.1)
      .text('Thời gian         : ' + vio_time + 'giờ ' + vio_time + ', ngày' + vio_day + 'tháng' + vio_day + 'năm ' + (new Date().getFullYear()))
      .moveDown(0.1)
      .text('địa điểm      : ' + vio_time + ', thành phố Đà Nẵng.')
      .moveDown(0.1)
      .text('Yêu cầu chủ phương tiện (lái xe) đến Thanh tra Sở Giao Thông vận tải thành phố Đà Nẵng để giải quyết vi phạm theo quy định.')
      .moveDown(0.1)
      .text('Vào Lúc : ....... giờ ........, ngày ........... tháng .......... năm ' + (new Date().getFullYear()))
      .moveDown(0.1)
      .text('Địa điểm   :  ........................')
      .moveDown(0.1)
      .text('khi đi mang theo   :  Giấy phép lái xe và các giấy tờ xe.')
      .moveDown(0.1)
      .font('italic').text('(Ghi chú: Liên hệ Đội ........................ )')


    doc.end()
    // res.setHeader('Content-Disposition', 'inline')
    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader('X-Filename', violation.plate + '_' + vio_day + '.pdf')

    doc.pipe(res)
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