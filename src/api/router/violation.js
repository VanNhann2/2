import _ from 'lodash'
import StatusCodes from 'http-status-codes'
import { RequestError } from '../../utils'
import { app } from '../../app'
import * as validator from '../../validator'

/**
 * @typedef {import('express').Router} Router
 * @param {Router} router
 */

export const violationRouter = (router) => {
  router.post('/violations', async (req, res, next) => {
    try {
      const { idsCamera, object, status, plate, startDate, endDate, page } = req.body
      const { platform } = req.query
      //check page
      if (_.isEmpty(_.toString(page))) {
        throw new RequestError({ code: StatusCodes.BAD_REQUEST, message: 'Số trang không hợp lệ' })
      }

      if (idsCamera) {
        if (!validator.isMongoIdArray(idsCamera)) {
          throw new RequestError({ code: StatusCodes.BAD_REQUEST, message: 'idsCamera vi phạm phải là một mảng' })
        }
      }

      if (object && !_.isEmpty(object)) {
        if (!validator.inObject(object)) {
          throw new RequestError({ code: StatusCodes.BAD_REQUEST, message: 'Loại xe không hợp lệ' })
        }
      }

      if (status && !_.isEmpty(status)) {
        if (!validator.inStatus(status)) {
          throw new RequestError({ code: StatusCodes.BAD_REQUEST, message: 'Trạng thái không hợp lệ' })
        }
      }

      const result = await app.violation.getAll(idsCamera, object, status, plate, startDate, endDate, page, platform)
      res.json(result)
    } catch (error) {
      next(error)
    }
  })

  router.post('/public/violations', async (req, res, next) => {
    try {
      const { idsCamera, object, status, plate, startDate, endDate, page } = req.body
      const { platform } = req.query

      if (platform) {
        if (_.isEmpty(plate)) {
          throw new RequestError({ code: StatusCodes.BAD_REQUEST, message: 'Nhập biển số' })
        }
      }

      if (_.isEmpty(_.toString(page))) {
        throw new RequestError({ code: StatusCodes.BAD_REQUEST, message: 'Số trang không hợp lệ' })
      }

      if (idsCamera) {
        if (!validator.isMongoIdArray(idsCamera)) {
          throw new RequestError({ code: StatusCodes.BAD_REQUEST, message: 'idsCamera vi phạm phải là một mảng' })
        }
      }

      if (object && !_.isEmpty(object)) {
        if (!validator.inObject(object)) {
          throw new RequestError({ code: StatusCodes.BAD_REQUEST, message: 'Loại xe không hợp lệ' })
        }
      }

      if (status && !_.isEmpty(status)) {
        if (!validator.inStatus(status)) {
          throw new RequestError({ code: StatusCodes.BAD_REQUEST, message: 'Trạng thái không hợp lệ' })
        }
      }

      const result = await app.violation.getAll(idsCamera, object, status, plate, startDate, endDate, page, platform)
      res.json(result)
    } catch (error) {
      next(error)
    }
  })

  router.get('/violations/:id', async (req, res, next) => {
    try {
      const { id } = req.params
      if (!validator.isMongoId(id)) {
        throw new RequestError({ code: StatusCodes.BAD_REQUEST, message: 'Vi phạm không hợp lệ' })
      }
      const result = await app.violation.getById(id)
      res.json(result)
    } catch (error) {
      next(error)
    }
  })

  router.put('/violations/approved', async (req, res, next) => {
    try {
      const { ids } = req.body
      if (!validator.isMongoIdArray(ids)) {
        throw new RequestError({ code: StatusCodes.BAD_REQUEST, message: 'Id vi phạm phải là một mảng' })
      }

      const result = await app.violation.updateApproval(ids, 'approved')
      res.json(result)
    } catch (error) {
      next(error)
    }
  })

  router.put('/violations/unapproved', async (req, res, next) => {
    try {
      const { ids } = req.body
      if (!validator.isMongoIdArray(ids)) {
        throw new RequestError({ code: StatusCodes.BAD_REQUEST, message: 'Id vi phạm phải là một mảng' })
      }

      const result = await app.violation.updateApproval(ids, 'unapproved')
      res.json(result)
    } catch (error) {
      next(error)
    }
  })

  // router hoàn thành xử phạt
  // router.put('/violation/:id/finishPenal', async (req, res, next) => {
  //   try {
  //     const { id } = req.params
  //     if (!validator.isMongoId(id)) {
  //       throw new RequestError({ code: StatusCodes.BAD_REQUEST, message: 'Id vi phạm không hợp lệ' })
  //     }
  //     let ids = [id]
  //     const result = await app.violation.updateApproval(ids, 'finishPenal')
  //     res.json(result)
  //   } catch (error) {
  //     next(error)
  //   }
  // })

  router.put('/violations/:id', async (req, res, next) => {
    try {
      const { id } = req.params
      const { status, object, plate, owner, phone, email } = req.body

      if (status || _.isEmpty(status)) {
        if (!validator.inStatus(status)) {
          throw new RequestError({ code: StatusCodes.BAD_REQUEST, message: 'Trạng thái không hợp lệ' })
        }
      }

      if (plate && _.isEmpty(plate)) {
        throw new RequestError({ code: StatusCodes.BAD_REQUEST, message: 'Yêu cầu nhập biển số xe' })
      }

      if (object && !_.isEmpty(object)) {
        if (!validator.inObject(object)) {
          throw new RequestError({ code: StatusCodes.BAD_REQUEST, message: 'Loại xe không hợp lệ' })
        }
      }

      if (!validator.isMongoId(id)) {
        throw new RequestError({ code: StatusCodes.BAD_REQUEST, message: 'Vi phạm không hợp lệ' })
      }

      if (email && !_.isEmpty(email)) {
        if (!validator.verifyEmail(email)) {
          throw new RequestError({ code: StatusCodes.BAD_REQUEST, message: 'Email không hợp lệ' })
        }
      }

      if (phone && !_.isEmpty(phone)) {
        if (!validator.verifyPhone(phone)) {
          throw new RequestError({ code: StatusCodes.BAD_REQUEST, message: 'Số điện thoại không hợp lệ' })
        }
      }

      const result = await app.violation.editViolation(id, status, object, plate, owner, phone, email)
      res.json(result)
    } catch (error) {
      next(error)
    }
  })

  router.post('/violations/:id/report', async (req, res, next) => {
    try {
      const { id } = req.params
      const { vioAddress, vioOwner, addressOwner, sovlingDate } = req.body

      if (!validator.isMongoId(id)) {
        throw new RequestError({ code: StatusCodes.BAD_REQUEST, message: 'Vi phạm không hợp lệ' })
      }
      await app.violation.report(id, vioAddress, vioOwner, addressOwner, res, sovlingDate)
    } catch (error) {
      next(error)
    }
  })

  router.delete('/violations/delete', async (req, res, next) => {
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

  router.post('/statistical', async (req, res, next) => {
    try {
      const { date, timeline } = req.body

      // if (timeline && !_.isEmpty(timeline)) {
      //   if (!validator.inTimeline(timeline)) {
      //     throw new RequestError({ code: StatusCodes.BAD_REQUEST, message: 'TimeLine không hợp lệ ' })
      //   }
      // }

      const result = await app.violation.getStatistical(date, timeline)

      res.json(result)
    } catch (error) {
      next(error)
    }
  })
}
