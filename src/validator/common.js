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

export const inObject = (object) => {
  if (object) {
    let arrayObject = ['bike', 'car', 'bus', 'truck']
    return _.includes(arrayObject, object)
  }
}

export const inStatus = (status) => {
  if (status) {
    let arrayStatus = ['approved', 'unapproved', 'normal', 'finishReport', 'finishPenal', 'expired']
    return _.includes(arrayStatus, status)
  }
  return true
}

export const verifyEmail = (email) => {
  var reg = /^([A-Za-z0-9_\-\.])+\@([A-Za-z0-9_\-\.])+\.([A-Za-z]{2,4})$/

  return reg.test(email)
}

export const verifyPhone = (phone) => {
  var reg = /^[\+]?[(]?[0-9]{3}[)]?[-\s\.]?[0-9]{3}[-\s\.]?[0-9]{4,6}$/im

  return reg.test(phone)
}
