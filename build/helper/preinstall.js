'use strict'
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { 'default': mod }
}
Object.defineProperty(exports, '__esModule', { value: true })
const semver_1 = __importDefault(require('semver'))
const requiredNodeVersion = '10.22.1'
const nodeVersion = process.version
if (semver_1.default.gte(nodeVersion, requiredNodeVersion)) {
    console.log('Node.js version requirement met. Required ' + requiredNodeVersion + '. Installed ' + nodeVersion)
}
else {
    throw new RangeError('Node.js version requirement not met. Required ' + requiredNodeVersion + '. Installed ' + nodeVersion)
}
