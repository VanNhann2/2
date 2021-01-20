import { Violation } from './violation'
import { Statistical } from './statistical'

class App {

  /** @type {Violation} */
  violation = undefined

  /** @type {Statistical} */
  statistical = undefined

  constructor() {
    this.violation = new Violation()
    this.statistical = new Statistical()
  }
}

const app = new App()

export { app }
