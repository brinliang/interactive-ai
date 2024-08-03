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


interface ModelControlsProps {
    graphNodes: Node[],
    setGraphNodes: Dispatch<SetStateAction<Node[]>>,
    graphEdges: Edge[],
    setGraphEdges: Dispatch<SetStateAction<Edge[]>>,
    functionString: string,
    setFunctionString: Dispatch<SetStateAction<string>>,
    points: [number, number][],
    setPoints: Dispatch<SetStateAction<[number, number][]>>,
    costs: number[],
    setCosts: Dispatch<SetStateAction<number[]>>,
    domain: [number, number],
    setDomain: Dispatch<SetStateAction<[number, number]>>,
    activation: string,
    setActivation: Dispatch<SetStateAction<string>>
}

export {
    ModelControlsProps
}
