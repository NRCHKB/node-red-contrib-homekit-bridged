import { Service } from '@homebridge/hap-nodejs'

import type { EveHistoryData } from './eve-app/EveServices'

class HAPService extends Service {
    static EveHistoryData: typeof EveHistoryData
}

export default HAPService
