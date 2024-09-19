import { Service } from 'hap-nodejs'

import { EveHistoryData } from './eve-app/EveServices'

class HAPService extends Service {
    static EveHistoryData: typeof EveHistoryData
}

export default HAPService
