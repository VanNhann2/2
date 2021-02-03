import { config } from '../configs'
import _, { isEmpty } from 'lodash'

const replacePath = (path) => {
  return _.replace(path, config.pathImage, config.replacePathImage)
}

export const replaceImage = (image, platform) => {
  let arrayImage = []
  if (platform === 'mobile') {
    _.forEach(image, function (item) {
      arrayImage.push(config.linkImageMobile + replacePath(item))
    })
  } else {
    _.forEach(image, function (item) {
      arrayImage.push(replacePath(item))
    })
  }
  return arrayImage
}
