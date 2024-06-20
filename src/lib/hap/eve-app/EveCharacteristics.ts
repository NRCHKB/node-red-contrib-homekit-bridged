import { Formats, Perms } from 'hap-nodejs/dist/lib/Characteristic'

import CustomCharacteristicType from '../../types/CustomCharacteristicType'
import HAPCharacteristic from '../HAPCharacteristic'

/**
 * Based upon
 * - https://gist.github.com/simont77/3f4d4330fa55b83f8ca96388d9004e7d
 * - https://gist.github.com/gomfunkel/b1a046d729757120907c
 * - https://github.com/simont77/fakegato-history/blob/master/fakegato-history.js
 */

const EveCharacteristics: CustomCharacteristicType[] = [
    {
        UUID: 'E863F10A-079E-48FF-8F27-9C2605A29F52',
        name: 'Eve-Volt',
        format: Formats.FLOAT,
        perms: [Perms.PAIRED_READ],
        description: 'Volt (V) value. Used by Eve.app.',
    },
    {
        UUID: 'E863F126-079E-48FF-8F27-9C2605A29F52',
        name: 'Eve-Ampere',
        format: Formats.FLOAT,
        perms: [Perms.PAIRED_READ],
        description: 'Ampere (A) value. Used by Eve.app.',
    },
    {
        UUID: 'E863F10D-079E-48FF-8F27-9C2605A29F52',
        name: 'Eve-Watt',
        format: Formats.FLOAT,
        perms: [Perms.PAIRED_READ],
        description:
            'Watt (W) value. Used by Eve.app, reported as "Consumption".',
    },
    {
        UUID: 'E863F10C-079E-48FF-8F27-9C2605A29F52',
        name: 'Eve-Kilowatt-hour',
        format: Formats.FLOAT,
        perms: [Perms.PAIRED_READ],
        description:
            'Kilowatt-hour (kWh) value. Used by Eve.app, reported as Total Consumption.',
    },
    {
        UUID: 'E863F110-079E-48FF-8F27-9C2605A29F52',
        name: 'Eve-Volt-Ampere',
        format: Formats.UINT16,
        perms: [Perms.PAIRED_READ],
        description: 'Volt-Ampere (VA) value. Used by Eve.app.',
    },
]

export class EveS2R1 extends HAPCharacteristic {
    public static readonly UUID: string = 'E863F116-079E-48FF-8F27-9C2605A29F52'

    constructor() {
        super('Eve-S2R1', EveS2R1.UUID, {
            format: Formats.DATA,
            perms: [Perms.PAIRED_READ, Perms.NOTIFY, Perms.HIDDEN],
        })
    }
}
HAPCharacteristic.EveS2R1 = EveS2R1

export class EveS2R2 extends HAPCharacteristic {
    public static readonly UUID: string = 'E863F117-079E-48FF-8F27-9C2605A29F52'

    constructor() {
        super('Eve-S2R2', EveS2R2.UUID, {
            format: Formats.DATA,
            perms: [Perms.PAIRED_READ, Perms.NOTIFY, Perms.HIDDEN],
        })
    }
}
HAPCharacteristic.EveS2R2 = EveS2R2

export class EveS2W1 extends HAPCharacteristic {
    public static readonly UUID: string = 'E863F11C-079E-48FF-8F27-9C2605A29F52'

    constructor() {
        super('Eve-S2W1', EveS2W1.UUID, {
            format: Formats.DATA,
            perms: [Perms.PAIRED_WRITE, Perms.HIDDEN],
        })
    }
}
HAPCharacteristic.EveS2W1 = EveS2W1

export class EveS2W2 extends HAPCharacteristic {
    public static readonly UUID: string = 'E863F121-079E-48FF-8F27-9C2605A29F52'

    constructor() {
        super('Eve-S2W2', EveS2W2.UUID, {
            format: Formats.DATA,
            perms: [Perms.PAIRED_WRITE, Perms.HIDDEN],
        })
    }
}
HAPCharacteristic.EveS2W2 = EveS2W2

export default EveCharacteristics
