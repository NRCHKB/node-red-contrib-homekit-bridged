import { NodeDef } from 'node-red'

import HAPServiceConfigType from './HAPServiceConfigType'

type HAPService2ConfigType = NodeDef &
    HAPServiceConfigType & {
        useEventCallback: boolean
    }

export default HAPService2ConfigType
