import { Node, Red } from 'node-red'

const EnvironmentUtils = () => {
    const evaluateProperty = (RED: Red, node: Node, propertyName: string) => {
        return RED.util.evaluateNodeProperty('NRCHKB:' + propertyName, 'env', node)
    }

    return {
        evaluateProperty: evaluateProperty,
    }
}

export = EnvironmentUtils