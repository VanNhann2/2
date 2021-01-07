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
  router.get('/violation', async (req, res, next) => {
    try {
      const { object, status, plate, startDay, endDay, page } = req.query
      //check page
      if (_.isEmpty(page)) {
        throw new RequestError({ code: StatusCodes.BAD_REQUEST, message: 'số trang không hợp lệ' })
      }

      if (object) {
        if (!validator.inObject(object)) {
          throw new RequestError({ code: StatusCodes.BAD_REQUEST, message: 'loại xe không hợp lệ' })
        }
      }
      
      if (status) {
        if (!validator.inStatus(status)) {
          throw new RequestError({ code: StatusCodes.BAD_REQUEST, message: 'trạng thái không hợp lệ' })
        }
      }

      const result = await app.violation.getAll(object, status, plate, startDay, endDay, page)
      res.json(result)
    } catch (error) {
      next(error)
    }
  })

  router.get('/violation/:id', async (req, res, next) => {
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

  router.put('/violation/approved', async (req, res, next) => {
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

  router.put('/violation/unapproved', async (req, res, next) => {
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

  router.put('/violation/:id', async (req, res, next) => {
    try {
      const { id } = req.params
      const { object, plate, owner, phone, email } = req.query
      if (!validator.isMongoId(id)) {
        throw new RequestError({ code: StatusCodes.BAD_REQUEST, message: 'Vi phạm không hợp lệ' })
      }

      const result = await app.violation.editViolation(id, object, plate, owner, phone, email)
      res.json(result)
    } catch (error) {
      next(error)
    }
  })

  router.get('/violation/:id/report', async (req, res, next) => {
    try {
      const { id } = req.params
      const { address, owner } = req.query

      if (!validator.isMongoId(id)) {
        throw new RequestError({ code: StatusCodes.BAD_REQUEST, message: 'Vi phạm không hợp lệ' })
      }
      await app.violation.report(id, address, owner, res)
    } catch (error) {
      next(error)
    }
  })

  router.delete('/violation/delete', async (req, res, next) => {
    try {
      const { id } = req.query
      if (!validator.isMongoIdArray(id)) {
        throw new RequestError({ code: StatusCodes.BAD_REQUEST, message: 'Id vi phạm phải là một mảng' })
      }

      const result = await app.violation.delete(id)
      res.json(result)
    } catch (error) {
      next(error)
    }
  })
}
