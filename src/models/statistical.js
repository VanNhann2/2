import mongoose from 'mongoose'
import to from 'await-to-js'
import _ from 'lodash'
import { statisticalSchema, schemaOptions } from './define'
import { BaseModel, BaseSchema } from './base'

export class StatisticalModel extends BaseModel {
    constructor() {
        super('Statistical', new BaseSchema(statisticalSchema, schemaOptions))
    }

    /**
     *
     * @param {mongoose.Types.ObjectId} id
     */
    getStatistical = async (stage, type) => {
        const idCondition = { _id: mongoose.Types.ObjectId(id) }
        const match = {
            // $match: { _id: mongoose.Types.ObjectId(id), deleted: { $ne: true } },
            // {age: { $ne: 12} =>>>>>>>>>>>>>>> WHERE age != 12
            $match: { $and: [otherCondition, idCondition] },
        }

        const project = {
            $project: {
            },
        }

        let [err, result] = await to(this.model.aggregate([match, project]))
        if (err) throw err

        if (_.isEmpty(result)) return {}
        return result[0]
    }
}
