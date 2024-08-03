import {
    Dispatch,
    SetStateAction,
} from 'react';


import {
    Node,
    Edge,
    OnNodesChange,
    OnEdgesChange
} from '@xyflow/react';


interface ModelBuilderControlsProps {
    graphNodes: Node[],
    setGraphNodes: Dispatch<SetStateAction<Node[]>>,
    onGraphNodesChange: OnNodesChange<Node>,
    graphEdges: Edge[],
    setGraphEdges: Dispatch<SetStateAction<Edge[]>>,
    onGraphEdgesChange: OnEdgesChange<Edge>,
    getNodeId: () => string,
    getEdgeId: () => string
}

export {
    ModelBuilderControlsProps
}
