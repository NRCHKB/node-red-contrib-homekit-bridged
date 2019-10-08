module.exports = function() {
    ('use strict')
    const debug = require('debug')('NRCHKB')
    const net = require('net')
    const os = require('os')
    let availableInterfaces

    const checkIp = function(value) {
        return value.length > 0 && net.isIP(value)
    }

    const checkInterface = function(value) {
        if (value.length < 1) {
            return false
        }

        if (!availableInterfaces) {
            availableInterfaces = []

            const networkInterfaces = os.networkInterfaces()

            Object.keys(networkInterfaces).forEach(ifaceArr =>
                networkInterfaces[ifaceArr].forEach(iface =>
                    availableInterfaces.push(iface.address)
                )
            )
        }

        return availableInterfaces.indexOf(value) > -1
    }

    const checkMulticast = function(value) {
        return checkBoolean(value)
    }

    const checkPort = function(value) {
        return value.length > 0 && checkNumber(value)
    }

    const checkLoopback = function(value) {
        return checkBoolean(value)
    }

    const checkReuseAddr = function(value) {
        return checkBoolean(value)
    }

    const checkTtl = function(value) {
        if (value.length > 0 && checkNumber(value)) {
            const ttlInt = parseInt(value)
            return ttlInt >= 0 && ttlInt <= 255
        } else return false
    }

    const checkBoolean = function(value) {
        return typeof value === 'boolean'
    }

    const checkNumber = function(value) {
        return !isNaN(value)
    }

    return {
        checkInterface: checkInterface,
        checkIp: checkIp,
        checkMulticast: checkMulticast,
        checkPort: checkPort,
        checkLoopback: checkLoopback,
        checkReuseAddr: checkReuseAddr,
        checkTtl: checkTtl,
    }
}
