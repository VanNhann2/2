import to from 'await-to-js'
import StatusCodes from 'http-status-codes'
import { model } from '../models'
import { AppError, logger } from '../utils'
import mongoose from 'mongoose'
import PDFDocument from 'pdfkit'
import fs from 'fs'

export class Violation {
  constructor() { }

  /** Get all violations */
  getAll = async (object, status, plate, startDay, endDay, page) => {
    try {
      const vehicle = object === 'loai1' ? 0 : 1
      const boolStatus = status === 'enabled' ? 1 : ('disabled' ? 0 : 2)
      const objectS = object ? vehicle : []
      const statusS = status ? boolStatus : []
      const plateS = plate ? plate : []
      const sDay = startDay ? (new Date(startDay).toISOString()) : ""
      const eDay = endDay ? (new Date(endDay).toISOString()) : ""
      let [err, result] = await to(model.violation.getAll(objectS, statusS, plateS, sDay, eDay, page))
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
      logger.error('Violations.changeApproved() error:', error)
      throw new AppError({ code: StatusCodes.INTERNAL_SERVER_ERROR, message: 'Thay đổi thông tin vi phạm thất bại' })
    }
  }

  editViolation = async (id, object, plate) => {
    try {
      let [err, result] = await to(model.violation.editViolation(id, object, plate))
      if (err) throw err

      return result
    } catch (error) {
      logger.error('Violations.editViolation() error:', error)
      throw new AppError({ code: StatusCodes.INTERNAL_SERVER_ERROR, message: 'Thay đổi thông tin vi phạm thất bại' })
    }
  }

  report = async (id, address, owner, res) => {
    try {

      const ownerReport = owner ? owner : ""
      const addressOwnerReport = address ? address : ""
      console.log("Ds")

      let [err, violation] = await to(model.violation.report(id, addressOwnerReport, ownerReport))
      console.log(violation)
      if (err) throw err
      // const vio_daytime = moment(new Date(violation.vio_time)).format('DD/MM/YYYY HH:mm:ss')
      // const vio_day = vio_daytime.split(' ')[0]
      // const vio_time = vio_daytime.split(' ')[1]
      console.log("Ds")

      const date = new Date(violation.vio_time)
      const vio_Hour = date.getHours()
      const vio_Minutes = date.getMinutes()
      const vio_Day = date.getDate()
      const vio_Month = date.getMonth()
      const vio_Year = date.getFullYear()
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

      const doc = new PDFDocument({
        size: 'A5',
        layout: "portrait",
      })

      console.log("Ds")

      // const font_path = config.staticFolder + '/fonts'
      // doc.registerFont('regular', font_path + '/times.ttf')
      // doc.registerFont('italic', font_path + '/times_italic.ttf')
      // doc.registerFont('bold', font_path + '/times_bold.ttf')
      // doc.registerFont('bold_italic', font_path + '/times_bolditalic.ttf')

      // res.setHeader('Content-Disposition', 'inline')

      doc.fontSize(12)
      doc.font('regular').text('SỞ GTVT THÀNH PHỐ ĐÀ NẴNG', 30, doc.y, { continued: true })
      doc.font('bold').text('CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM', { align: 'right' })
      console.log("dddd")

      doc.fontSize(13)
      doc.font('bold').text('THANH TRA SỞ', 50, doc.y, { align: 'left', continued: true })
        .underline(75, doc.y + 15, 145, 2)
      console.log("dddd")

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
      console.log("dddd")

      doc.moveDown(0.2)
      doc.text('Ông (bà) là chủ phương tiện (lái xe) BKS số: ' + violation.plate, 30, doc.y, { continued: true })
        .moveDown(0.1)
        .fontSize(12)
        .moveDown(0.8)
        .text('Đã vi phạm            :  Đỗ xe sai quy định ', 20, doc.y)
        .moveDown(0.1)
        .text('Thời gian         : ' + vio_Hour + 'giờ ' + vio_Minutes + ', ngày' + vio_Day + 'tháng' + vio_Month + 'năm ' + vio_Year)
        .moveDown(0.1)
        .text('địa điểm      : ' + violation.vio_adress + ', thành phố Đà Nẵng.')
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
      console.log("Ds")

      doc.end()
      // res.setHeader('Content-Type', 'application/pdf')
      // res.setHeader('X-Filename', violation.plate + '_' + '.pdf')
      doc.pipe(res)
    } catch (error) {

    }
  }

  /**
   * Delete violations
   * @param {string|mongoose.Types.ObjectId}
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