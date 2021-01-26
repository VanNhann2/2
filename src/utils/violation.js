import { config } from '../configs'
import _, { isEmpty } from 'lodash'

const replacePath = (path) => {
  return _.replace(path, config.pathImage, config.replacePathImage)
}

export const replaceImage = (image, platform) => {
  console.log({ platform })
  let arrayImage = []
  if (platform && !isEmpty(platform)) {
    _.forEach(image, function (item) {
      arrayImage.push(config.LinkImageMobile + replacePath(item))
    })
  } else {
    _.forEach(image, function (item) {
      arrayImage.push(replacePath(item))
    })
  }
  return arrayImage
}
