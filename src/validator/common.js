import mongoose from 'mongoose'
import _ from 'lodash'
import moment from 'moment'

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

export const isValidVehicleType = (object) => {
  if (object) {
    let arrayObject = ['all', 'bike', 'bus', 'car', 'miniBus', 'truck']
    return _.includes(arrayObject, object)
  }
  return true
}

export const defineVehicleType = (object) => {
  let defineVehicleType = { 0: 'Mô tô', 1: 'Ô tô khách trên 16 chỗ', 2: 'Ô tô con', 3: 'Ô tô khách 16 chỗ', 4: 'Ô tô tải' }
  return defineVehicleType[object]
}

export const isValidTimelineType = (timeline) => {
  let arrayTimeline = ['day', 'week', 'month', 'year']
  return _.includes(arrayTimeline, timeline)
}

export const defineTimeline = (timeline) => {
  let arrTimelineDefine = { day: 'ngay', week: 'tuan', month: 'thang', year: 'nam' }
  return arrTimelineDefine[timeline]
}

// export const inStatusStatistical = (status) => {
//   if (status) {
//     let arrayStatus = ['synthetic', 'finishPenal', 'finishReport']
//     return _.includes(arrayStatus, status)
//   }
// }

export const isValidStatusType = (status) => {
  if (status) {
    let arrayStatus = ['all', 'unapproved', 'approved', 'finishReport', 'finishPenal', 'expired']
    return _.includes(arrayStatus, status)
  }
  return true
}

export const defineStatusType = (status) => {
  let defineStatusType = { 0: '', 1: 'Chưa duyệt', 2: 'Đã duyệt', 3: 'Đã xuất biên bản', 4: 'Đã hoàn thành xử phạt', 5: 'Quá hạn' }
  return defineStatusType[status]
}

export const verifyEmail = (email) => {
  var reg = /^([A-Za-z0-9_\-\.])+\@([A-Za-z0-9_\-\.])+\.([A-Za-z]{2,4})$/

  return reg.test(email)
}

export const verifyPhone = (phone) => {
  var reg = /^[\+]?[(]?[0-9]{3}[)]?[-\s\.]?[0-9]{3}[-\s\.]?[0-9]{4,6}$/im

  return reg.test(phone)
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
