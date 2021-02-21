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

export const vehicleTypes = ['all', 'bike', 'bus', 'car', 'miniBus', 'truck']
export const statusTypes = ['all', 'unapproved', 'approved', 'finishReport', 'finishPenal', 'expired']
export const timelineTypes = ['day', 'week', 'month', 'year']
export const vehiclesTrans = { 0: 'Mô tô', 1: 'Ô tô khách trên 16 chỗ', 2: 'Ô tô con', 3: 'Ô tô khách 16 chỗ', 4: 'Ô tô tải' }
export const statusTrans = { 0: '', 1: 'Chưa duyệt', 2: 'Đã duyệt', 3: 'Đã xuất biên bản', 4: 'Đã hoàn thành xử phạt', 5: 'Quá hạn' }

export const timelineTrans = { day: 'ngay', week: 'tuan', month: 'thang', year: 'nam' }

export const isValidVehicleType = (object) => {
  if (object) {
    return _.includes(vehicleTypes, object)
  }
  return true
}

export const defineVehicleType = (object) => {
  return vehiclesTrans[object]
}

export const isValidTimelineType = (timeline) => {
  if (timeline) {
    return _.includes(timelineTypes, timeline)
  }

  return false
}

export const defineTimeline = (timeline) => {
  return timelineTrans[timeline]
}

export const isValidStatusType = (status) => {
  if (status) {
    return _.includes(statusTypes, status)
  }
  return false
}

export const defineStatusType = (status) => {
  return statusTrans[status]
}

export const verifyEmail = (email) => {
  if (email) {
    var reg = /^([A-Za-z0-9_\-\.])+\@([A-Za-z0-9_\-\.])+\.([A-Za-z]{2,4})$/
    return reg.test(email)
  }

  return true
}

export const verifyPhone = (phone) => {
  if (phone) {
    var reg = /^[\+]?[(]?[0-9]{3}[)]?[-\s\.]?[0-9]{3}[-\s\.]?[0-9]{4,6}$/im
    return reg.test(phone)
  }

  return true
}

export const verifyPlate = (plate) => {
  // if (plate) {
  //   let patternCar = /[0-9]{2}[A-Z]-[0-9]{5}$/i
  //   let patternBike = /[0-9]{2}-[A-Z][0-9][0-9]{5}$/i
  //   if (plate.match(patternCar) || plate.match(patternBike) ) {
  //     return true
  //   }
  //   return false
  // }
  if (_.toString(plate).length > 12) {
    return false
  }
  return true
}
