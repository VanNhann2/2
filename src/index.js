import { logger } from './utils'
import { Root } from './root'

const main = async () => {
  const root = new Root()
  try {
    await root.start()
  } catch (error) {
    logger.error('Failed to start main', error)
    await root.stop()
  }
}

main()
