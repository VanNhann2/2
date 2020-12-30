import _ from 'lodash'
import * as StatusCodes from 'http-status-codes'
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
            const { object, status, plate, startDay, endDay } = req.query
            if (object) {
                if (object !== 'loai1' && object !== 'loai2' && object !== 'loai3') {
                    throw new RequestError({ code: StatusCodes.BAD_REQUEST, message: 'loại xe không hợp lệ' })
                }
            }
            if (status) {
                if (status !== 'enabled' && status !== 'disabled' && status !== 'all') {
                    throw new RequestError({ code: StatusCodes.BAD_REQUEST, message: 'status không hợp lệ' })
                }
            }
            const startSearch = new Date(startDay).toISOString()
            const endSearch = new Date(endDay).toISOString()
            console.log(startSearch + endSearch)
            const result = await app.violation.getAll(object, status, plate, startSearch, endSearch)
            res.json(result)
            console.log(result)
        } catch (error) {
            console.log(error)
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

    router.put('/violation/:id/approved', async (req, res, next) => {
        try {
            const { id } = req.params
            if (!validator.isMongoId(id)) {
                throw new RequestError({ code: StatusCodes.BAD_REQUEST, message: 'Vi phạm không hợp lệ' })
            }

            const status = req.query.status
            if (status !== 'enabled' && status !== 'disabled') {
                throw new RequestError({ code: StatusCodes.BAD_REQUEST, message: 'status không hợp lệ' })
            }

            const result = await app.violation.changeApproved(id, status)
            res.json(result)

        } catch (error) {
            console.log(error)
            next(error)
        }
    })

    router.put('/violation/:id', async (req, res, next) => {
        try {
            const { id } = req.params
            const { object, plate } = req.query
            if (!validator.isMongoId(id)) {
                throw new RequestError({ code: StatusCodes.BAD_REQUEST, message: 'Vi phạm không hợp lệ' })
            }

            const result = await app.violation.editViolation(id, object, plate)
            res.json(result)
        } catch (error) {
            next(error)
        }
    })

    router.delete('/violation/:id', async (req, res, next) => {
        try {
            const { id } = req.params
            if (!validator.isMongoId(id)) {
                throw new RequestError({ code: StatusCodes.BAD_REQUEST, message: 'Vi phạm không hợp lệ' })
            }

            const result = await app.violation.delete(id)
            res.json(result)
        } catch (error) {
            next(error)
        }
    })
}