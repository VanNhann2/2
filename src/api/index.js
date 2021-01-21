import { Router } from 'express'
import { violationRouter } from './router/violation'

export const apis = () => {
  const router = Router()

  violationRouter(router)
  return router
}
