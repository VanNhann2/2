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

export class Statistical {

    constructor() {
    }

    /**
     * 
     * @param {'date'|'week'|'month'|'year'} stage 
     * @param {'synthetic'|'finishReport'|'finishPenal'|} type 
     */
    getStatistical = async (stage, type) => {
        try {
            let [err, result] = await to(model.statistical.getStatistical(stage, type))
            if (err) throw err

            return result
        } catch (error) {
            logger.error('Violations.getStatistical() error:', error)
            throw new AppError({ code: StatusCodes.INTERNAL_SERVER_ERROR, message: 'Lấy thông tin thống kê thất bại' })
        }
    }
}
