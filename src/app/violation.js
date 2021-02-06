import to from 'await-to-js'
import StatusCodes from 'http-status-codes'
import { model } from '../models'
import { AppError, logger } from '../utils'
import mongoose, { Mongoose } from 'mongoose'
import _ from 'lodash'
import PDFDocument from 'pdfkit'
import fs, { stat } from 'fs'
import path from 'path'
import * as validator from '../validator'
import { GRpcClient } from '../services/grpc'
import { config } from '../configs'
import ExcelJs from 'exceljs'
import { replaceImage } from '../utils'

export class Violation {
  // /** @type {GRpcClient} */
  // #grpcClient = undefined

  constructor() {
    this.arrayObject = ['bike', 'bus', 'car', 'miniBus', 'truck']
    this.arrayStatus = ['unapproved', 'approved', 'finishReport', 'finishPenal', 'expired']

    // const protoFile = path.join(__dirname, config.protoFile);
    // this.#grpcClient = new GRpcClient('10.49.46.251:50052', config.protoFile, 'parking.Camera')
    // this.#grpcClient = new GRpcClient('10.49.46.23:50055', config.protoFile, 'parking.Video')
  }

  /**
   *
   * @param {[]} idsCamera
   * @param {String} object
   * @param {String} status
   * @param {String} plate
   * @param {Date} startDate
   * @param {Date} endDate
   * @param {String} page
   * @param {'web'|'mobile'} platform
   * @param {Boolean} plateOnly
   */
  /** Get all violations */
  getAll = async (idsCamera, object, status, plate, startDate, endDate, page, platform, plateOnly) => {
    try {
      let vioObject = _.includes(this.arrayObject, object) ? _.indexOf(this.arrayObject, object) : undefined
      let vioStatus
      if (status === 'all') {
        vioStatus = undefined
      } else {
        vioStatus = _.includes(this.arrayStatus, status) ? _.indexOf(this.arrayStatus, status) + 1 : undefined
      }

      let plateConverArray = _.split(plate, ',', -1)

      const vioPlate = plate ? plateConverArray : undefined
      const startSearchDate = startDate && startDate != '' && startDate != 'null' ? new Date(startDate).toISOString() : undefined
      const endSearchDate = endDate && endDate != '' && endDate != 'null' ? new Date(endDate).toISOString() : undefined
      let [err, conditions] = await to(
        model.violation.conditions(idsCamera, vioObject, vioStatus, vioPlate, startSearchDate, endSearchDate, page, platform, plateOnly)
      )
      if (err) throw err

      const dataPromise = model.violation.getAll(conditions.conditionsData)
      const countPromise = model.violation.getCount(conditions.conditionsCount)

      let pageDt = [],
        totalDt = 0
      let [errPromise, results] = await to(Promise.all([dataPromise, countPromise]))
      if (errPromise) throw errPromise

      pageDt = results[0]
      totalDt = results[1]

      const totalRecord = totalDt[0]?.myCount || 0
      const totalPage = Math.ceil(totalRecord / config.limitPerPage) || 0

      let dataResult = pageDt ? pageDt : []

      let pageData = []
      let data = []
      if (platform === 'web') {
        // data web public
        if (!_.isEmpty(dataResult)) {
          _.forEach(dataResult, function (item) {
            let dataFor = {
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
              alprTime: item.alprTime,
              email: item.email,
              owner: item.owner,
              phone: item.phone,
            }
            pageData.push(dataFor)
          })
        }
      } else if (platform === 'mobile') {
        // data mobile public  ---- Duong bat buoc phai tra ve data, perPage, total (mac dinh la pageData, totalRecord, totalPage)
        let convertData = pageDt ? pageDt : []
        if (!_.isEmpty(convertData)) {
          _.forEach(convertData, function (item) {
            let dataDetail = {
              id: item.id,
              violationType: item.action === 3 ? 'Đỗ xe sai quy định' : 'Chưa có hành động',
              vehicleType: validator.defineObject(item.object),
              numberPlate: item.plate,
              images: replaceImage(item.images, platform),
              thumbnail: replaceImage(item.objectImages, platform) ? replaceImage(item.objectImages, platform)[0] : null,
              vioTime: item.vioTime,
            }
            data.push(dataDetail)
          })
        }
      } else {
        // data trang admin//
        if (!_.isEmpty(dataResult)) {
          _.forEach(dataResult, function (item) {
            let dataFor = {
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
              alprTime: item.alprTime,
              email: item.email,
              owner: item.owner,
              phone: item.phone,
            }
            pageData.push(dataFor)
          })
        }
      }

      let perPage = totalPage
      let total = totalRecord
      page = _.toNumber(page)
      return platform === 'mobile'
        ? {
            data,
            page,
            perPage,
            total,
          }
        : {
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
   * @param {'mobile'} platform
   */
  getById = async (id, platform) => {
    try {
      let [errGet, result] = await to(model.violation.getById(id, platform))
      if (errGet) throw errGet

      // console.log(id)
      // let [err, getByIdCam] = await to(this.#grpcClient.makeRequest('get', { ids: { c1: result.camera } }))
      // if (err) throw err

      // console.log(result)

      // let [err, getVideoByDate] = await to(this.#grpcClient.makeRequest1('get', { time: { c1: result.vioTime } }))
      // if (err) throw err

      // console.log(getVideoByDate)
      // const dataResult = { ...result, ...getVideoByDate }

      return result
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
      if (!validator.isValidStatusType(action)) {
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
      // let dataChange = {}
      // if (status) dataChange.status = _.includes(this.arrayStatus, status) ? _.indexOf(this.arrayStatus, status) + 1 : undefined
      // if (object) dataChange.object = _.includes(this.arrayObject, object) ? _.indexOf(this.arrayObject, object) : undefined
      // if (plate) dataChange.plate = plate
      // if (owner) dataChange.owner = owner
      // if (phone) dataChange.phone = phone
      // if (email) dataChange.email = email
      let dataChange = {}
      dataChange.plate = plate
      dataChange.owner = owner
      dataChange.phone = phone
      dataChange.email = email
      dataChange.status = _.includes(this.arrayStatus, status) ? _.indexOf(this.arrayStatus, status) + 1 : undefined
      dataChange.object = _.includes(this.arrayStatus, status) ? _.indexOf(this.arrayStatus, status) + 1 : undefined

      let [err, result] = await to(model.violation.editViolation(id, dataChange))
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

      const date = new Date(violation.vioTime)
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
        .text('THANH TRA SỞ', 110, doc.y, { align: 'left', continued: true })
        .underline(135, doc.y + 15, 45, 2)

      doc.font('bold').text('Độc lập - Tự do - Hạnh phúc', 57, doc.y, { align: 'right' }).underline(325, doc.y, 155, 2)

      doc.fontSize(11)
      doc.moveDown(0.3)
      doc.font('regular').text('Số .........', 90, doc.y, { align: 'left' })

      doc.moveDown(2)
      doc.font('bold').fontSize(14).text('THANH TRA SỞ GIAO THÔNG VẬN TẢI THÀNH PHỐ ĐÀ NẴNG', 85, doc.y)

      doc.moveDown(0.3)
      doc.fontSize(18)
      doc.font('bold').text('THÔNG BÁO', 241, doc.y)

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
      res.setHeader('X-Filename', vioDate + '-' + vioMonth + '-' + vioYear + '_' + violation.plate + '.pdf')
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
   * @param {Date} day
   * @param {'day'|'week'|'month'|'year'} timeline
   * @param {Number} page
   * @param {String} idCam
   */
  getStatistical = async (day, timeline, page, idCam) => {
    try {
      let dateSearch = new Date(day)
      console.log({ dateSearch })
      let [err, result] = await to(model.violation.getStatistical(dateSearch, timeline, page, idCam))
      if (err) throw err

      return result
    } catch (error) {
      logger.error('Violations.getStatistical() error:', error)
      throw new AppError({ code: StatusCodes.INTERNAL_SERVER_ERROR, message: 'Lấy thông tin thống kê thất bại' })
    }
  }

  /**
   *
   * @param {Date} day
   * @param {'day'|'week'|'month'|'year'} timeline
   * @param {Number} page
   * @param {Mongoose.Types.ObjectId(string)} idCam
   * @param {String} nameCam
   * @param {*} res
   */
  reportStatisticalExcel = async (day, timeline, page, idCam, nameCam) => {
    try {
      console.log({ timeline })
      console.log({ page })

      let dateSearch = new Date(day)
      console.log({ dateSearch })

      let workbook = new ExcelJs.Workbook()
      let worksheet = workbook.addWorksheet('Báo cáo thống kê vi phạm')

      worksheet.getColumn(1).width = 10
      worksheet.getColumn(1).alignment = { horizontal: 'center', vertical: 'distributed' }
      worksheet.getCell('A1').value = 'STT'
      worksheet.getCell('A1').alignment = { horizontal: 'center', vertical: 'distributed' }

      worksheet.getColumn(2).width = 25
      worksheet.getColumn(2).alignment = { horizontal: 'center', vertical: 'distributed' }
      worksheet.getCell('B1').value = 'Thời gian'
      worksheet.getCell('B1').alignment = { horizontal: 'center', vertical: 'distributed' }

      worksheet.getColumn(3).width = 30
      worksheet.getColumn(3).alignment = { horizontal: 'center', vertical: 'distributed' }
      worksheet.getCell('C1').value = 'Camera'
      worksheet.getCell('C1').alignment = { horizontal: 'center', vertical: 'distributed' }

      worksheet.getColumn(3).width = 20
      worksheet.getColumn(3).alignment = { horizontal: 'center', vertical: 'distributed' }
      worksheet.getCell('D1').value = 'Tổng vi phạm'
      worksheet.getCell('D1').alignment = { horizontal: 'center', vertical: 'distributed' }

      worksheet.getColumn(4).width = 40
      worksheet.getColumn(4).alignment = { horizontal: 'center', vertical: 'distributed' }
      worksheet.getCell('E1').value = 'Tổng vi phạm đã gửi thông báo'
      worksheet.getCell('E1').alignment = { horizontal: 'center', vertical: 'distributed' }

      worksheet.getColumn(5).width = 35
      worksheet.getColumn(5).alignment = { horizontal: 'center', vertical: 'distributed' }
      worksheet.getCell('F1').value = 'Tổng vi phạm đã xử phạt'
      worksheet.getCell('F1').alignment = { horizontal: 'center', vertical: 'distributed' }

      let [err, data] = await to(model.violation.getStatistical(dateSearch, timeline, page, idCam))
      if (err) throw err

      let order = 1
      _.forEach(data.data, (item) => {
        let row = []
        row.push(order)
        row.push(item.time)
        row.push(nameCam ? nameCam : '')
        row.push(item.total)
        row.push(item.finishReport)
        row.push(item.finishPenal)
        worksheet.addRow(row)
        order++
      })

      return workbook
    } catch (error) {
      logger.error('Violations.getStatistical() error:', error)
      throw new AppError({ code: StatusCodes.INTERNAL_SERVER_ERROR, message: 'Xuất báo cáo thống kê thất bại' })
    }
  }
}
