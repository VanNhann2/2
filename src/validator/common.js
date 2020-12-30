import mongoose from 'mongoose'
import _ from 'lodash'
/**
 * Validate MongoDB ObjectID
 * @param {string} id value to check
 */
export const isMongoId = (id) => {
  return mongoose.isValidObjectId(id)
}

export const isMongoIdArray = (ids) => {
  if (!_.isArray(ids)) {
    return false
  }

  for (const id of ids) {
    if (!mongoose.isValidObjectId(id)) {
      return false
    }
  }

  return true
}
