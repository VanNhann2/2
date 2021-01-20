import { Router } from 'express'
import { violationRouter } from './router/violation'
import { statisticalRouter } from './router/statistical'

export const apis = () => {
  const router = Router()

  violationRouter(router)
  statisticalRouter(router)
  return router
}
