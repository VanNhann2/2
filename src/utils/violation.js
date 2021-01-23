import { config } from '../configs'
import _ from 'lodash'

export const replacePath = (path) => {
  return _.replace(path, config.pathImage, config.replacePathImage)
}

export const replaceImage = (image) =>{
  let arrayImage = []
  _.forEach(image, function (item) {
    arrayImage.push(replacePath(item))
  })
  return arrayImage
}