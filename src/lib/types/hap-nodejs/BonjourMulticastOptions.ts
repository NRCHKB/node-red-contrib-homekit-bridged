type BonjourMulticastOptions = {
    multicast?: boolean
    interface?: string
    port?: number
    ip?: string
    ttl?: number
    loopback?: boolean
    reuseAddr?: boolean
}

export default BonjourMulticastOptions
