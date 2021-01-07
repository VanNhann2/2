import to from 'await-to-js'
import StatusCodes from 'http-status-codes'
import { model } from '../models'
import { AppError, logger } from '../utils'
import mongoose from 'mongoose'
import PDFDocument from 'pdfkit'
import fs from 'fs'
import path from 'path'

export class Violation {
  constructor() { }

  /** Get all violations */
  /**
   * 
   * @param {Number} object 
   * @param {Number} status 
   * @param {String} plate 
   * @param {Date} startDay 
   * @param {Date} endDay 
   * @param {Number} page 
   */
  getAll = async (object, status, plate, startDay, endDay, page) => {
    try {
      let perPage = 10
      const vehicle = object === 'loai1' ? 0 : object === 'loai2' ? 1 : object === 'loai3' ? 2 : undefined
      // const searchStatus = status === 'approved' ? 1 : ('unapproved' ? 0 : 2)
      const searchStatus = status === "approved" ? 1 : status === "unapproved" ? 2 : undefined

      const vioObject = vehicle
      const vioStatus = searchStatus
      const vioPlate = plate ? plate : undefined
      const startSearchDay = startDay ? (new Date(startDay).toISOString()) : undefined
      const endSearchDay = endDay ? (new Date(endDay).toISOString()) : undefined

      let [err, conditions] = await to(model.violation.conditions(vioObject, vioStatus, vioPlate, startSearchDay, endSearchDay, page))
      if (err) throw err

      const dataPromise = model.violation.getDataAll(conditions.conditionsData)
      const countPromise = model.violation.getCount(conditions.conditionsCount)

      let pageData = [], total = 0
      let [errPromise, results] = await to(Promise.all([dataPromise, countPromise]))
      if (errPromise) throw errPromise

      pageData = results[0]
      total = results[1]

      const totalRecord = total[0]?.myCount
      const totalPage = Math.ceil(totalRecord / perPage)

      return {
        pageData,
        totalRecord,
        totalPage
      }
    } catch (error) {
      logger.error('Violations.getAll() error:', error)
      throw new AppError({ code: StatusCodes.INTERNAL_SERVER_ERROR, message: 'Lấy danh sách vi phạm thất bại' })
    }
  }

  /**
   * 
   * @param {mongoose.Types.ObjectId} id 
   */
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

  /**
   * Update approval status
   * @param {string[]} ids 
   * @param {('approved'|'unapproved')} action 
   */
  updateApproval = async (ids, action) => {
    try {
      if (action !== 'approved' && action !== 'unapproved') {
        throw new AppError('invalid action')
      }

      await to(model.violation.updatedStatus(ids, action))
      if (err) throw err

      return action === 'approved' ? 'Duyệt vi phạm thành công' : 'Bỏ duyệt vi phạm thành công'
    } catch (error) {
      logger.error('Violations.updateApproval() error:', error)
      throw new AppError({ code: StatusCodes.INTERNAL_SERVER_ERROR, message: 'Thay đổi trạng thái duyệt vi phạm thất bại' })
    }
  }

  /**
   * 
   * @param {import('mongoObjectId} id 
   * @param {Number} object 
   * @param {String} plate 
   * @param {String} owner 
   * @param {Number} phone 
   * @param {String} email 
   */
  editViolation = async (id, object, plate, owner, phone, email) => {
    try {
      const vioObject = object ? object : ''
      const vioPlate = plate ? plate : ''
      const vioOwner = owner ? owner : ''
      const vioPhone = phone ? phone : ''
      const vioEmail = email ? email : ''

      let [err, result] = await to(model.violation.editViolation(id, vioObject, vioPlate, vioOwner, vioPhone, vioEmail))
      if (err) throw err

      return result
    } catch (error) {
      logger.error('Violations.editViolation() error:', error)
      throw new AppError({ code: StatusCodes.INTERNAL_SERVER_ERROR, message: 'Thay đổi thông tin vi phạm thất bại' })
    }
  }

  /**
   * 
   * @param {import('mongoObjectId} id 
   * @param {String} address 
   * @param {String} owner 
   * @param {Response} res 
   */
  report = async (id, address, owner, res) => {
    try {
      const ownerReport = owner ? owner : ""
      const addressOwnerReport = address ? address : ""

      let [err, violation] = await to(model.violation.getById(id))
      // let [err, violation] = await to(model.violation.report(id, ownerReport, addressOwnerReport))
      if (err) throw err

      const date = new Date(violation.vio_time)
      const getHour = date.getHours()
      const vio_Hour = ("0" + getHour).slice(-2);
      const getMinutes = date.getMinutes()
      const vio_Minutes = ("0" + getMinutes).slice(-2);
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
        layout: "landscape",
        margins: {
          // by default, all are 72
          top: 60,
          bottom: 60,
          left: 60,
          right: 60
        }
      })
      // doc.polygon([100, 0], [50, 100], [150, 200], [200, 100]);
      // doc.stroke();
      doc.lineWidth(3);
      doc.lineJoin('miter')
        .rect(35, 40, 520, 340)
        .stroke();

      doc.lineWidth(1);
      doc.lineJoin('miter')
        .rect(39, 44, 512, 332)
        .stroke();

      const font_path = path.join(__dirname, '..', 'fonts')
      doc.registerFont('regular', font_path + '/times.ttf')
      doc.registerFont('italic', font_path + '/times_italic.ttf')
      doc.registerFont('bold', font_path + '/times_bold.ttf')
      doc.registerFont('bold_italic', font_path + '/times_bolditalic.ttf')

      doc.fontSize(12)
      doc.font('regular').text('SỞ GTVT THÀNH PHỐ ĐÀ NẴNG', 75, doc.y, { continued: true })
      doc.font('bold').text('CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM', { align: 'right' })

      doc.fontSize(13)
      doc.font('bold').text('THANH TRA SỞ', 90, doc.y, { align: 'left', continued: true })
        .underline(115, doc.y + 15, 45, 2)

      doc
        .font('bold')
        .text('Độc lập - Tự do - Hạnh phúc', 40, doc.y, { align: 'right' })
        .underline(315, doc.y, 155, 2)

      doc.fontSize(11)
      doc.moveDown(0.3)
      doc.font('regular')
        .text('Số .........', 90, doc.y, { align: 'left' })

      doc.moveDown(2)
      doc.font('bold')
        .fontSize(14)
        .text('THANH TRA SỞ GIAO THÔNG VẬN TẢI THÀNH PHỐ ĐÀ NẴNG', 85, doc.y)

      doc.moveDown(0.3)
      doc.fontSize(18)
      doc.font('bold').text('THÔNG BÁO', 258, doc.y)

      doc.moveDown(0.3)
      doc.fontSize(13)
        .font('regular')
        .text('Ông (bà) là chủ phương tiện (lái xe) BKS số:   ' + violation.plate, 75, doc.y)
        .moveDown(0.2)
        .text('Đã vi phạm:   Đỗ xe sai quy định ')
        .moveDown(0.2)
        .text('Thời gian:   ' + vio_Hour + '   giờ   ' + vio_Minutes + '   phút' + ',   ngày   ' + vio_Day + '   tháng   ' + vio_Month + '   năm   ' + vio_Year)
        .moveDown(0.2)
        .text('Địa điểm:   ' + violation.vio_adress + ', thành phố Đà Nẵng.')
        .moveDown(0.2)
        .text('Yêu cầu chủ phương tiện (lái xe) đến Thanh tra Sở Giao Thông vận tải thành phố Đà Nẵng để giải quyết vi phạm theo quy định.')
        .moveDown(0.2)
        .text('Vào lúc: .......... giờ .........., ngày .......... tháng .......... năm ' + (new Date().getFullYear()))
        .moveDown(0.2)
        .text('Địa điểm:  ...........................................................................')
        .moveDown(0.2)
        .text('Khi đi mang theo:  Giấy phép lái xe và các giấy tờ xe.')
        .moveDown(0.2)
        .font('italic').text('(Ghi chú: Liên hệ Đội ................................................................................................. )')

      doc.end()

      res.setHeader('Content-Type', 'application/pdf')
      res.setHeader('X-Filename', violation.plate + '.pdf')
      doc.pipe(res)
    } catch (error) {
      logger.error(error)
      throw new AppError({ code: StatusCodes.INTERNAL_SERVER_ERROR, message: 'Xuất biên bản vi phạm thất bại' })
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
      if (_.isEmpty(id)) {
        throw 'Danh sách xóa rỗng'
      }

      //validate object id
      for (const iid of id) {
        if (iid !== new mongoose.Types.ObjectId(id).toString()) {
          throw 'Có id của vi phạm không hợp lệ'
        }
      }
      let [errDelete] = await to(model.violation.delete(id))
      if (errDelete) throw errDelete

      return 'Xóa vi phạm thành công'
    } catch (error) {
      logger.error('Violations.delete() error:', error)
      throw new AppError({ code: StatusCodes.INTERNAL_SERVER_ERROR, message: 'Xóa vi phạm thất bại' })
    }
  }
}