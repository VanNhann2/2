import { Violation } from './violation'

class App {

  /** @type {Violation} */
  violation = undefined


  constructor() {
    this.violation = new Violation()
  }
}

const app = new App()

export { app }
