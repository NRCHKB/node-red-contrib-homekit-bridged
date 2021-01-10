import { Node } from 'node-red'

// Print node.status (in UI) and to console and sidebar tab at once!
class UnifiedLogger {
    static error = (node: Node, text: string, error?: string | Error): void => {
        node.status({
            fill: 'red',
            shape: 'ring',
            text,
        })

        node.error(text)

        if (error) {
            node.error(error)
        }
    }
}

export default UnifiedLogger
