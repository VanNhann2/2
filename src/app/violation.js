import to from 'await-to-js'
import StatusCodes from 'http-status-codes'
import { model } from '../models'
import { AppError, logger } from '../utils'
import mongoose from 'mongoose'
import _ from 'lodash'
import PDFDocument from 'pdfkit'
import fs, { stat } from 'fs'
import path from 'path'
import { validate } from 'uuid'
import * as validator from '../validator'

export class Violation {
  // perPage = undefined
  // arrayObject = []
  // arrayStatus = []

  constructor() {
    this.perPage = 10
    this.arrayObject = ['xemay', 'oto', 'xetai']
    this.arrayStatus = ['approved', 'unapproved', 'normal']
  }

  /**
   *
   * @param {Number} object
   * @param {Number} status
   * @param {String} plate
   * @param {Date} startDate
   * @param {Date} endDate
   * @param {Number} page
   */
  /** Get all violations */
  getAll = async (object, status, plate, startDate, endDate, page) => {
    try {
      // let perPage = 10
      let vioObject = _.includes(this.arrayObject, object) ? _.indexOf(this.arrayObject, object) : undefined
      let vioStatus = _.includes(this.arrayStatus, status) ? _.indexOf(this.arrayStatus, status) + 1 : undefined

      const vioPlate = plate ? plate : undefined
      const startSearchDate = startDate ? new Date(startDate).toISOString() : undefined
      const endSearchDate = endDate ? new Date(endDate).toISOString() : undefined

      let [err, conditions] = await to(model.violation.conditions(vioObject, vioStatus, vioPlate, startSearchDate, endSearchDate, page))
      if (err) throw err

      const dataPromise = model.violation.getAll(conditions.conditionsData)
      const countPromise = model.violation.getCount(conditions.conditionsCount)

      let pageData = [],
        total = 0
      let [errPromise, results] = await to(Promise.all([dataPromise, countPromise]))
      if (errPromise) throw errPromise

      pageData = results[0]
      total = results[1]

      const totalRecord = total[0]?.myCount
      const totalPage = Math.ceil(totalRecord / this.perPage)

      return {
        pageData,
        totalRecord,
        totalPage,
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
      if (!validator.inStatus(action)) {
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
   * @param {mongoose.Types.ObjectId} id
   * @param {Number} object
   * @param {String} plate
   * @param {String} owner
   * @param {Number} phone
   * @param {String} email
   */
  editViolation = async (id, object, plate, owner, phone, email) => {
    try {
      const vioObject = _.includes(this.arrayObject, object) ? _.indexOf(this.arrayObject, object) : undefined
      const vioPlate = plate ? plate : undefined
      const vioOwner = owner ? owner : undefined
      const vioPhone = phone ? phone : undefined
      const vioEmail = email ? email : undefined

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
   * @param {mongoose.Types.ObjectId} id
   * @param {String} address
   * @param {String} owner
   * @param {Response} res
   */
  report = async (id, address, owner, res) => {
    try {
      const ownerReport = owner ? owner : ''
      const addressOwnerReport = address ? address : ''

      let [err, violation] = await to(model.violation.getById(id))
      if (err) throw err

      let vioObject = _.indexOf(this.arrayObject, violation.object)

      const date = new Date(violation.vio_time)
      const getHour = date.getHours()
      const vio_Hour = ('0' + getHour).slice(-2)
      const getMinutes = date.getMinutes()
      const vio_Minutes = ('0' + getMinutes).slice(-2)
      const vio_Date = date.getDate()
      const vio_Month = date.getMonth()
      const vio_Year = date.getFullYear()

      const doc = new PDFDocument({
        size: 'A5',
        layout: 'landscape',
        margins: {
          // by default, all are 72
          top: 60,
          bottom: 60,
          left: 60,
          right: 60,
        },
      })
      // doc.polygon([100, 0], [50, 100], [150, 200], [200, 100]);
      // doc.stroke();
      doc.lineWidth(3)
      doc.lineJoin('miter').rect(35, 40, 520, 340).stroke()

      doc.lineWidth(1)
      doc.lineJoin('miter').rect(39, 44, 512, 332).stroke()

      const font_path = path.join(__dirname, '..', 'fonts')
      doc.registerFont('regular', font_path + '/times.ttf')
      doc.registerFont('italic', font_path + '/times_italic.ttf')
      doc.registerFont('bold', font_path + '/times_bold.ttf')
      doc.registerFont('bold_italic', font_path + '/times_bolditalic.ttf')

      doc.fontSize(12)
      doc.font('regular').text('SỞ GTVT THÀNH PHỐ ĐÀ NẴNG', 75, doc.y, { continued: true })
      doc.font('bold').text('CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM', { align: 'right' })

      doc.fontSize(13)
      doc
        .font('bold')
        .text('THANH TRA SỞ', 90, doc.y, { align: 'left', continued: true })
        .underline(115, doc.y + 15, 45, 2)

      doc.font('bold').text('Độc lập - Tự do - Hạnh phúc', 40, doc.y, { align: 'right' }).underline(315, doc.y, 155, 2)

      doc.fontSize(11)
      doc.moveDown(0.3)
      doc.font('regular').text('Số .........', 90, doc.y, { align: 'left' })

      doc.moveDown(2)
      doc.font('bold').fontSize(14).text('THANH TRA SỞ GIAO THÔNG VẬN TẢI THÀNH PHỐ ĐÀ NẴNG', 85, doc.y)

      doc.moveDown(0.3)
      doc.fontSize(18)
      doc.font('bold').text('THÔNG BÁO', 258, doc.y)

      doc.moveDown(0.3)
      doc
        .fontSize(13)
        .font('regular')
        .text('Ông (bà) là chủ phương tiện (lái xe) BKS số:   ' + violation.plate, 75, doc.y)
        .moveDown(0.2)
        .text('Đã vi phạm:   Đỗ xe sai quy định ')
        .moveDown(0.2)
        .text(
          'Thời gian:   ' + vio_Hour + '   giờ   ' + vio_Minutes + '   phút' + ',   ngày   ' + vio_Date + '   tháng   ' + vio_Month + '   năm   ' + vio_Year
        )
        .moveDown(0.2)
        .text('Địa điểm:   ' + violation.vio_adress + ', thành phố Đà Nẵng.')
        .moveDown(0.2)
        .text('Yêu cầu chủ phương tiện (lái xe) đến Thanh tra Sở Giao Thông vận tải thành phố Đà Nẵng để giải quyết vi phạm theo quy định.')
        .moveDown(0.2)
        .text('Vào lúc: .......... giờ .........., ngày .......... tháng .......... năm ' + new Date().getFullYear())
        .moveDown(0.2)
        .text('Địa điểm:  ...........................................................................')
        .moveDown(0.2)
        .text('Khi đi mang theo:  Giấy phép lái xe và các giấy tờ xe.')
        .moveDown(0.2)
        .font('italic')
        .text('(Ghi chú: Liên hệ Đội ................................................................................................. )')

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
  delete = async (ids) => {
    //////// session dung de xoa CA 2 table khac nhau neu ben table A get thuoc tinh table B
    // let session = undefined
    try {
      // let [errSession, newSession] = await to(mongoose.startSession())
      // if (errSession) throw errSession
      // session = newSession
      // session.startTransaction()

      // let [errDelete] = await to(model.violation.delete(ids, session))
      // if (errDelete) throw errDelete

      // session.endSession()
      //validate object ids
      let [errDelete] = await to(model.violation.delete(ids))
      if (errDelete) throw errDelete

      return 'Xóa vi phạm thành công'
    } catch (error) {
      logger.error('Violations.delete() error:', error)
      throw new AppError({ code: StatusCodes.INTERNAL_SERVER_ERROR, message: 'Xóa vi phạm thất bại' })
    }
  }
}
