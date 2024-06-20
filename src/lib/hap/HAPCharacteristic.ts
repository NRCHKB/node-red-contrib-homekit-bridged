import { Characteristic } from 'hap-nodejs'

import {
    EveS2R1,
    EveS2R2,
    EveS2W1,
    EveS2W2,
} from './eve-app/EveCharacteristics'

class HAPCharacteristic extends Characteristic {
    static EveS2R1: typeof EveS2R1
    static EveS2R2: typeof EveS2R2
    static EveS2W1: typeof EveS2W1
    static EveS2W2: typeof EveS2W2
}

export default HAPCharacteristic
