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


interface ModelBuilderProps {
    graphNodes: Node[],
    setGraphNodes: Dispatch<SetStateAction<Node[]>>,
    onGraphNodesChange: OnNodesChange<Node>,
    graphEdges: Edge[],
    setGraphEdges: Dispatch<SetStateAction<Edge[]>>,
    onGraphEdgesChange: OnEdgesChange<Edge>
}

export {
    ModelBuilderProps
}
