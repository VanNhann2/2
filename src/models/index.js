import { StatisticalModel } from './statistical'
import { ViolationModel } from './violations'

class Model {
    /** @type {ViolationModel} */
    violation = undefined

    /** @type {StatisticalModel} */
    statistical = undefined

    constructor() {
        this.violation = new ViolationModel()
        this.statistical = new StatisticalModel()
    }

    /**
     * in transaction mode, mongoose can not create collection,
     * so they need to be created first
     */
    createRequiredCollections = async () => {

    }
}

const model = new Model()

export { model }
