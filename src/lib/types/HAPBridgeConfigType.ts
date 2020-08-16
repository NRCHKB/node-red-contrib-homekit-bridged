type HAPBridgeConfigType = {
    bridgeName: string,
    pinCode: string,
    port: number,
    allowInsecureRequest: boolean,
    manufacturer: string,
    model: string,
    serialNo: string,
    firmwareRev: string,
    hardwareRev: string,
    softwareRev: string,
    customMdnsConfig: boolean,
    mdnsMulticast: boolean,
    mdnsInterface: string,
    mdnsPort: number,
    mdnsIp: string,
    mdnsTtl: number,
    mdnsLoopback: boolean,
    mdnsReuseAddr: boolean,
    allowMessagePassthrough: boolean,
}

export default HAPBridgeConfigType