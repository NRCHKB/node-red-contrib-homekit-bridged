import type { NodeDef } from 'node-red'

import type HAPServiceConfigType from './HAPServiceConfigType'

type HAPService2ConfigType = NodeDef &
  HAPServiceConfigType & {
    useEventCallback: boolean
  }

export default HAPService2ConfigType
