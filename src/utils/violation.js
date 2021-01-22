import { config } from '../configs'
import _ from 'lodash'

export const replacePath = (path) => {
  return _.replace(path, config.pathImage, config.replacePathImage)
}
