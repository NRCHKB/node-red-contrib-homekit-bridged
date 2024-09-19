import HAPService2ConfigType from './HAPService2ConfigType'
import HAPServiceNodeType from './HAPServiceNodeType'
import NodeType from './NodeType'

type HAPService2NodeType = NodeType &
    HAPServiceNodeType & {
        config: HAPService2ConfigType
    }

export default HAPService2NodeType
