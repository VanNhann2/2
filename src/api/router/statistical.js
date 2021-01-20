import _ from 'lodash'
import StatusCodes from 'http-status-codes'
import { RequestError } from '../../utils'
import { app } from '../../app'
import * as validator from '../../validator'

/**
 * @typedef {import('express').Router} Router
 * @param {Router} router
 */

export const statisticalRouter = (router) => {
    router.post('/statistical', async (req, res, next) => {
        try {
            const { stage, type } = req.body
            const result = await app.statistical.getStatistical(stage, type)

            res.json(result)
        } catch (error) {
            next(error)
        }
    })
}
