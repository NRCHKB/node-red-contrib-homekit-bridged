import * as net from 'net'
import * as os from 'os'

const MdnsUtils = () => {
    let availableInterfaces: string[]

    const checkIp = function (value: string) {
        return value.length > 0 && net.isIP(value)
    }

    const checkInterface = function (value: string) {
        if (value.length < 1) {
            return false
        }

        if (!availableInterfaces) {
            availableInterfaces = []

            const networkInterfaces = os.networkInterfaces()

            Object.keys(networkInterfaces).forEach((ifaceArr) =>
                networkInterfaces[ifaceArr].forEach((iface) =>
                    availableInterfaces.push(iface.address)
                )
            )
        }

        return availableInterfaces.indexOf(value) > -1
    }

    const checkMulticast = function (value: any) {
        return checkBoolean(value)
    }

    const checkPort = function (value: string) {
        return value.length > 0 && checkNumber(value)
    }

    const checkLoopback = function (value: any) {
        return checkBoolean(value)
    }

    const checkReuseAddr = function (value: any) {
        return checkBoolean(value)
    }

    const checkTtl = function (value: string) {
        if (value.length > 0 && checkNumber(value)) {
            const ttlInt = parseInt(value)
            return ttlInt >= 0 && ttlInt <= 255
        } else return false
    }

    const checkBoolean = function (value: any) {
        return typeof value === 'boolean'
    }

    const checkNumber = function (value: any) {
        return !isNaN(value)
    }

    return {
        checkInterface,
        checkIp,
        checkMulticast,
        checkPort,
        checkLoopback,
        checkReuseAddr,
        checkTtl,
    }
}

module.exports = MdnsUtils
