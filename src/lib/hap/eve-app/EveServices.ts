import HAPCharacteristic from '../HAPCharacteristic'
import HAPService from '../HAPService'

/**
 * Based on https://github.com/simont77/fakegato-history/blob/master/fakegato-history.js
 */

export class EveHistoryData extends HAPService {
    // Custom service for meta and/or historical information. Characteristics for logging: E863F11C, E863F121, E863F116, E863F117. Used by Eve.app.
    public static readonly UUID: string = 'E863F007-079E-48FF-8F27-9C2605A29F52'

    constructor() {
        super('EveHistoryData', EveHistoryData.UUID)

        // Required Characteristics
        this.addCharacteristic(HAPCharacteristic.EveS2R1)
        this.addCharacteristic(HAPCharacteristic.EveS2R2)
        this.addCharacteristic(HAPCharacteristic.EveS2W1)
        this.addCharacteristic(HAPCharacteristic.EveS2W2)
    }
}

HAPService.EveHistoryData = EveHistoryData
