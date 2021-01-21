import to from 'await-to-js'
import StatusCodes from 'http-status-codes'
import { model } from '../models'
import { AppError, logger } from '../utils'
import mongoose from 'mongoose'
import _ from 'lodash'
import PDFDocument from 'pdfkit'
import fs, { stat } from 'fs'
import path from 'path'
import { RequestError } from '../utils'
import { validate } from 'uuid'
import * as validator from '../validator'
import { GRpcClient } from '../services/grpc'
import { config } from '../configs'
import moment from 'moment'

export class Violation {
  /** @type {GRpcClient} */
  #grpcClient = undefined

  // perPage = undefined
  // arrayObject = []
  // arrayStatus = []

  constructor() {
    this.perPage = 10
    this.arrayObject = ['bike', 'car', 'bus', 'truck']
    this.arrayStatus = ['approved', 'unapproved', 'finishReport', 'finishPenal', 'expired']
    // const protoFile = path.join(__dirname, config.protoFile);

    // this.#grpcClient = new GRpcClient('10.49.46.251:50052', config.protoFile, 'parking.Camera')
    this.#grpcClient = new GRpcClient('10.49.46.23:50055', config.protoFile, 'parking.Video')
  }

  /**
   *
   * @param {Number} object
   * @param {Number} status
   * @param {String} plate
   * @param {Date} startDate
   * @param {Date} endDate
   * @param {String} page
   */
  /** Get all violations */
  getAll = async (object, status, plate, startDate, endDate, page) => {
    try {
      // let perPage = 10
      let vioObject = _.includes(this.arrayObject, object) ? _.indexOf(this.arrayObject, object) : undefined
      let vioStatus = _.includes(this.arrayStatus, status) ? _.indexOf(this.arrayStatus, status) + 1 : undefined

      const vioPlate = plate ? plate : undefined
      const startSearchDate = startDate && startDate != '' && startDate != 'null' ? new Date(startDate).toISOString() : undefined
      const endSearchDate = endDate && endDate != '' && endDate != 'null' ? new Date(endDate).toISOString() : undefined
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
   * @param {String} plate
   */
  getAllPublic = async (plate) => {
    try {
      let [err, result] = await to(model.violation.getAllPublic(plate))
      if (err) throw err

      return result
    } catch (error) {
      logger.error('Violations.getAllPublic() error:', error)
      throw new AppError({ code: StatusCodes.INTERNAL_SERVER_ERROR, message: 'Lấy vi phạm thất bại' })
    }
  }

  /**
   *
   * @param {mongoose.Types.ObjectId} id
   */
  getById = async (id) => {
    try {
      let [errGet, result] = await to(model.violation.getById(id))
      if (errGet) throw errGet

      // console.log(id)
      // let [err, getByIdCam] = await to(this.#grpcClient.makeRequest('get', { ids: { c1: result.camera } }))
      // if (err) throw err

      console.log(result)

      let [err, getVideoByDate] = await to(this.#grpcClient.makeRequest1('get', { time: { c1: result.vioTime } }))
      if (err) throw err

      console.log(getVideoByDate)
      const dataResult = { ...result, ...getVideoByDate }

      return dataResult
    } catch (error) {
      logger.error('Violations.getById() error:', error)
      throw new AppError({ code: StatusCodes.INTERNAL_SERVER_ERROR, message: 'Lấy thông tin vi phạm thất bại' })
    }
  }

  /**
   * Update approval status
   * @param {string[]} ids
   * @param {('approved'|'unapproved'|'finishReport'|'finishPenal'|'expired')} action
   */
  updateApproval = async (ids, action) => {
    try {
      if (!validator.inStatus(action)) {
        throw new AppError('invalid action')
      }
      console.log(ids, action)
      let [err, results] = await to(model.violation.updatedStatus(ids, action))
      if (err) throw err

      return action === 'approved'
        ? 'Duyệt vi phạm thành công'
        : action === 'finishPenal'
        ? 'Hoàn thành xử phạt'
        : action === 'finishReport'
        ? 'Đã xuất biên bản'
        : 'Bỏ duyệt vi phạm thành công'
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
  editViolation = async (id, status, object, plate, owner, phone, email) => {
    try {
      const vioStatus = _.includes(this.arrayStatus, status) ? _.indexOf(this.arrayStatus, status) + 1 : undefined
      const vioObject = _.includes(this.arrayObject, object) ? _.indexOf(this.arrayObject, object) : undefined
      const vioPlate = plate ? plate : undefined
      const vioOwner = owner ? owner : undefined
      const vioPhone = phone ? phone : undefined
      const vioEmail = email ? email : undefined

      let [err, result] = await to(model.violation.editViolation(id, vioStatus, vioObject, vioPlate, vioOwner, vioPhone, vioEmail))
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
   * @param {String} vioAddress
   * @param {String} vioOwner
   * @param {String} addressOwner
   * @param {Response} res
   * @param {Date} sovlingDate
   */
  report = async (id, vioAddress, vioOwner, addressOwner, res, sovlingDate) => {
    try {
      const ownerReport = vioOwner ? vioOwner : ''
      const addressOwnerReport = addressOwner ? addressOwner : ''
      const vioAddressReport = vioAddress ? vioAddress : ''

      let [err, violation] = await to(model.violation.getById(id))
      if (err) throw err

      let vioObject = _.indexOf(this.arrayObject, violation.object)

      const date = new Date(violation.vio_time)
      const getHour = date.getHours()
      const vioHour = ('0' + getHour).slice(-2)
      const getMinutes = date.getMinutes()
      const vioMinutes = ('0' + getMinutes).slice(-2)
      const vioDate = date.getDate()
      const vioMonth = date.getMonth() + 1
      const vioYear = date.getFullYear()

      const sovlingDateReport = new Date(sovlingDate)
      const sovlingHour = ('0' + sovlingDateReport.getHours()).slice(-2)
      const sovlingMinute = ('0' + sovlingDateReport.getMinutes()).slice(-2)
      const sovlingDay = sovlingDateReport.getDate()
      const sovlingMonth = sovlingDateReport.getMonth() + 1
      const sovlingYear = sovlingDateReport.getFullYear()

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
        .text('Thời gian:   ' + vioHour + '   giờ   ' + vioMinutes + '   phút' + ',   ngày   ' + vioDate + '   tháng   ' + vioMonth + '   năm   ' + vioYear)
        .moveDown(0.2)
        .text('Địa điểm:   ' + vioAddressReport + ', thành phố Đà Nẵng.')
        .moveDown(0.2)
        .text('Yêu cầu chủ phương tiện (lái xe) đến Thanh tra Sở Giao Thông vận tải thành phố Đà Nẵng để giải quyết vi phạm theo quy định.')
        .moveDown(0.2)
        .text(
          'Vào lúc:    ' +
            sovlingHour +
            '   giờ   ' +
            sovlingMinute +
            '   phút' +
            ',   ngày   ' +
            sovlingDay +
            '   tháng   ' +
            sovlingMonth +
            '   năm   ' +
            sovlingYear
        )
        .moveDown(0.2)
        .text('Địa điểm:  ...........................................................................')
        .moveDown(0.2)
        .text('Khi đi mang theo:  Giấy phép lái xe và các giấy tờ xe.')
        .moveDown(0.2)
        .font('italic')
        .text('(Ghi chú: Liên hệ Đội ................................................................................................. )')

      doc.end()

      res.setHeader('Content-Type', 'application/pdf')
      res.setHeader('X-Filename', +vioDate + '-' + vioMonth + '-' + vioYear + '_' + violation.plate + '.pdf')
      doc.pipe(res)

      await to(model.violation.updatedStatus(id, 'finishReport'))
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

  /**
   *
   * @param {'day'|'week'|'month'|'year'|Date()} timeline
   * @param {'synthetic'|'finishReport'|'finishPenal'} status
   */
  getStatistical = async (timeline, status) => {
    try {
      let currentDate = new Date()
      let timeEndSearch
      let statusSearch
      if (!_.isEmpty(timeline)) {
        if (timeline === 'day') {
          let lastWeek = moment().subtract(1, 'days').format('MM-DD-YYYY')
          timeEndSearch = new Date(lastWeek)
        } else if (timeline === 'week') {
          // function getLastWeek() {
          //   var today = new Date('Thu Jan 1 2021 08:56:30 GMT+0700 (Indochina Time)')
          //   var lastWeek = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 7);
          //   return lastWeek;
          // }
          // var lastWeek = getLastWeek();
          // var lastWeekMonth = lastWeek.getMonth() + 1;
          // var lastWeekDay = lastWeek.getDate();
          // var lastWeekYear = lastWeek.getFullYear();

          // result == lastWeekMonth + "/" + lastWeekDay + "/" + lastWeekYear;

          // d.setFullYear(2020, 11, 3);

          let lastWeek = moment().subtract(7, 'days').format('MM-DD-YYYY')
          timeEndSearch = new Date(lastWeek)
        } else if (timeline === 'month') {
          let lastWeek = moment().subtract(30, 'days').format('MM-DD-YYYY')
          timeEndSearch = new Date(lastWeek)
        } else if (timeline === 'year') {
          let fullYear = currentDate.getFullYear() - 1
          timeEndSearch = new Date(currentDate.setFullYear(fullYear))
        } else timeEndSearch = timeline
      }

      if (!_.isEmpty(status)) {
        if (status === 'synthetic') {
          statusSearch = 2
        } else if (status === 'finishPenal') {
          statusSearch = 4
        } else if (status === 'finishReport') {
          statusSearch = 3
        } else statusSearch = null
      }
      let [err, result] = await to(model.violation.getStatistical(timeEndSearch, statusSearch))
      if (err) throw err

      return result
    } catch (error) {
      logger.error('Violations.getStatistical() error:', error)
      throw new AppError({ code: StatusCodes.INTERNAL_SERVER_ERROR, message: 'Lấy thông tin thống kê thất bại' })
    }
  }
}
