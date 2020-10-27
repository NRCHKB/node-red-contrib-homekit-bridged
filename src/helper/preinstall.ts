import semver from 'semver'

const requiredNodeVersion = "10.22.1";
const nodeVersion = process.version;

if (semver.gte(nodeVersion, requiredNodeVersion)) {
    console.log('Node.js version requirement met. Required ' + requiredNodeVersion + '. Installed ' + nodeVersion)
} else {
    throw new RangeError('Node.js version requirement not met. Required ' + requiredNodeVersion + '. Installed ' + nodeVersion)
}
