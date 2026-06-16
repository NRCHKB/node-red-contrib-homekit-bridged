import type HAPService2ConfigType from './HAPService2ConfigType'
import type HAPServiceNodeType from './HAPServiceNodeType'
import type NodeType from './NodeType'

type HAPService2NodeType = NodeType &
    HAPServiceNodeType & {
        config: HAPService2ConfigType
        nrchkbClosing: boolean
    }

export default HAPService2NodeType
