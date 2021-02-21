import _ from 'lodash'
import StatusCodes from 'http-status-codes'
import { logger, RequestError } from '../../utils'
import { app } from '../../app'
import * as validator from '../../validator'
import moment from 'moment'

/**
 * @typedef {import('express').Router} Router
 * @param {Router} router
 */

export const violationRouter = (router) => {
  router.post('/violations', async (req, res, next) => {
    try {
      const { idsCamera, object, status, plate, startDate, endDate, page, plateOnly } = req.body
      const platform = 'admin'

      if (!page) {
        throw new RequestError({ code: StatusCodes.BAD_REQUEST, message: 'Số trang không hợp lệ' })
      }

      if (!validator.isMongoIdArray(idsCamera)) {
        throw new RequestError({ code: StatusCodes.BAD_REQUEST, message: 'idsCamera vi phạm phải là một mảng' })
      }

      if (!validator.isValidVehicleType(object)) {
        throw new RequestError({ code: StatusCodes.BAD_REQUEST, message: 'Loại xe không hợp lệ' })
      }

      if (!validator.isValidStatusType(status)) {
        throw new RequestError({ code: StatusCodes.BAD_REQUEST, message: 'Trạng thái không hợp lệ' })
      }

      const result = await app.violation.getAll(idsCamera, object, status, plate, startDate, endDate, page, platform, plateOnly)
      res.json(result)
    } catch (error) {
      next(error)
    }
  })

  router.post('/public/violations', async (req, res, next) => {
    try {
      const idsCamera = []
      const { object, status, plateOnly, startDate, endDate } = ''
      const { plate, page } = req.body
      const { platform } = req.query

      if (!validator.verifyPlate(plate)) {
        throw new RequestError({ code: StatusCodes.BAD_REQUEST, message: 'Biển số xe không hợp lệ' })
      }

      if (_.toString(platform) !== 'mobile' && _.toString(platform) !== 'web') {
        throw new RequestError({ code: StatusCodes.BAD_REQUEST, message: 'Platform không hợp lệ' })
      }

      if (!page) {
        throw new RequestError({ code: StatusCodes.BAD_REQUEST, message: 'Số trang không hợp lệ' })
      }

      const result = await app.violation.getAll(idsCamera, object, status, plate, startDate, endDate, page, platform, plateOnly)
      res.json(result)
    } catch (error) {
      next(error)
    }
  })

  // router.get('/violations/:id', async (req, res, next) => {
  //   try {
  //     const { id } = req.params
  //     const { platform } = null

  //     if (!validator.isMongoId(id)) {
  //       throw new RequestError({ code: StatusCodes.BAD_REQUEST, message: 'Vi phạm không hợp lệ' })
  //     }
  //     const result = await app.violation.getById(id, platform)
  //     res.json(result)
  //   } catch (error) {
  //     next(error)
  //   }
  // })

  router.get('/public/violations/:id', async (req, res, next) => {
    try {
      const { id } = req.params
      const { platform } = req.query

      if (!validator.isMongoId(id)) {
        throw new RequestError({ code: StatusCodes.BAD_REQUEST, message: 'Vi phạm không hợp lệ' })
      }

      if (_.toString(platform) !== 'mobile' || _.toString(platform) !== 'web') {
        throw new RequestError({ code: StatusCodes.BAD_REQUEST, message: 'Platform không hợp lệ' })
      }

      const result = await app.violation.getById(id, platform)
      res.json(result)
    } catch (error) {
      next(error)
    }
  })

  router.post('/violations/statistical', async (req, res, next) => {
    try {
      const { day, timeline, page, idCam } = req.body

      if (!validator.isValidTimelineType(timeline)) {
        throw new RequestError({ code: StatusCodes.BAD_REQUEST, message: 'Timeline không hợp lệ' })
      }

      if (!page) {
        throw new RequestError({ code: StatusCodes.BAD_REQUEST, message: 'page không hợp lệ' })
      }

      if (idCam) {
        if (!validator.isMongoId(idCam)) {
          throw new RequestError({ code: StatusCodes.BAD_REQUEST, message: 'Vi phạm không hợp lệ' })
        }
      }

      const result = await app.violation.getStatistical(day, timeline, page, idCam)

      res.json(result)
    } catch (error) {
      next(error)
    }
  })

  router.post('/violations/statistical/exportReport', async (req, res, next) => {
    try {
      const { day, timeline, page, idCam, nameCam } = req.body

      if (!validator.isValidTimelineType(timeline)) {
        throw new RequestError({ code: StatusCodes.BAD_REQUEST, message: 'Timeline không hợp lệ' })
      }

      if (!page) {
        throw new RequestError({ code: StatusCodes.BAD_REQUEST, message: 'page không hợp lệ' })
      }

      if (!validator.isMongoId(idCam)) {
        throw new RequestError({ code: StatusCodes.BAD_REQUEST, message: 'Vi phạm không hợp lệ' })
      }

      const workbook = await app.violation.reportStatisticalExcel(day, timeline, page, idCam, nameCam)

      res.setHeader('Access-Control-Expose-Headers', 'Content-Disposition') //////// IMPORTANT FOR React.js content-disposition get Name
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
      res.setHeader(
        'Content-Disposition',
        `Bao_cao_thong_ke_${validator.defineTimeline(timeline)}_${timeline === 'day'
          ? moment(day).format('DD/MM/YYYY')
          : timeline === 'month'
            ? moment(day).format('MM/YYYY')
            : timeline === 'week'
              ? `${moment(day, 'YYYYMMDD').isoWeek()}_${moment(day).format('YYYY')}`
              : moment(day).format('YYYY')
        }.xlsx`
      )

      workbook.xlsx.write(res).then(() => {
        res.status(200).end()
      })
    } catch (error) {
      next(error)
    }
  })

  router.post('/violations/:id/report', async (req, res, next) => {
    try {
      const { id } = req.params
      const { vioAddress, vioOwner, addressOwner, solvingDate } = req.body

      if (!validator.isMongoId(id)) {
        throw new RequestError({ code: StatusCodes.BAD_REQUEST, message: 'Vi phạm không hợp lệ' })
      }

      await app.violation.report(id, vioAddress, vioOwner, addressOwner, res, solvingDate)
    } catch (error) {
      next(error)
    }
  })

  router.put('/violations/:id', async (req, res, next) => {
    try {
      const { id } = req.params
      const { status, object, plate, owner, phone, email } = req.body

      if (!validator.isMongoId(id)) {
        throw new RequestError({ code: StatusCodes.BAD_REQUEST, message: 'Vi phạm không hợp lệ' })
      }

      if (!validator.isValidStatusType(status)) {
        throw new RequestError({ code: StatusCodes.BAD_REQUEST, message: 'Trạng thái không hợp lệ' })
      }

      if (!validator.verifyPlate(plate)) {
        throw new RequestError({ code: StatusCodes.BAD_REQUEST, message: 'Biển số xe không hợp lệ ' })
      }

      if (!validator.isValidVehicleType(object)) {
        throw new RequestError({ code: StatusCodes.BAD_REQUEST, message: 'Loại xe không hợp lệ' })
      }

      if (!validator.verifyEmail(email)) {
        throw new RequestError({ code: StatusCodes.BAD_REQUEST, message: 'Email không hợp lệ' })
      }

      if (!validator.verifyPhone(phone)) {
        throw new RequestError({ code: StatusCodes.BAD_REQUEST, message: 'Số điện thoại không hợp lệ' })
      }

      const result = await app.violation.editViolation(id, status, object, plate, owner, phone, email)
      res.json(result)
    } catch (error) {
      next(error)
    }
  })

  router.delete('/violations', async (req, res, next) => {
    try {
      const { ids } = req.body

      if (!validator.isMongoIdArray(ids)) {
        throw new RequestError({ code: StatusCodes.BAD_REQUEST, message: 'Id vi phạm phải là một mảng' })
      }

      const result = await app.violation.delete(ids)
      res.json(result)
    } catch (error) {
      next(error)
    }
  })
}
