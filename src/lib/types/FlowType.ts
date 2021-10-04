enum FlowTypeType {
    Subflow = 'subflow',
    Flow = 'flow',
}

type FlowType = {
    TYPE: FlowTypeType
    path: string
}

export { FlowType, FlowTypeType }
