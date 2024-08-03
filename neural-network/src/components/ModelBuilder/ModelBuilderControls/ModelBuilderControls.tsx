import {
    useCallback,
    useState
} from 'react';

import {
    Node,
    Edge,
    Position
} from '@xyflow/react';

import { ModelBuilderControlsProps } from './ModelBuilderControls.types';

import './ModelBuilderControls.css';

const ModelBuilderControls = ({
    graphNodes, setGraphNodes, onGraphNodesChange,
    graphEdges, setGraphEdges, onGraphEdgesChange,
    getNodeId, getEdgeId
}: ModelBuilderControlsProps) => {
    const [networkString, setNetworkString] = useState<string>('3x3');

    function addLayers() {
        let nodeSpacing = 100;
        let layers: number[] = networkString.split('x').map(Number);

        const newNodes: Node[] = [
            {
                id: 'input',
                type: 'input',
                data: {
                    label: 'input',
                    value: 0,
                    inputs: [],
                    outputs: []
                },
                targetPosition: Position['Left'],
                sourcePosition: Position['Right'],
                position: { x: 0, y: 0 },
            },
            {
                id: 'bias',
                type: 'input',
                data: {
                    label: 'bias',
                    value: 1,
                    inputs: [],
                    outputs: []
                },
                targetPosition: Position['Left'],
                sourcePosition: Position['Right'],
                position: { x: 0, y: nodeSpacing },
            },
            {
                id: 'output',
                type: 'output',
                data: {
                    label: 'output',
                    value: 0,
                    inputs: [],
                    outputs: []
                },
                targetPosition: Position['Left'],
                sourcePosition: Position['Right'],
                position: { x: nodeSpacing * 3, y: 0 },
            },
        ];

        let weight: number;
        let newEdges: Edge[] = [];
        let sourceNodes: Node[] = [newNodes[0]];

        // loop through layers
        for (let i = 0; i < layers.length; i++) {
            let newSourceNodes: Node[] = [];

            // loop through layer and add nodes
            for (let j = 0; j < layers[i]; j++) {
                let newNodeId = getNodeId();

                const newNode: Node = {
                    id: `${newNodeId}`,
                    type: 'default',
                    position: { x: nodeSpacing + i * nodeSpacing, y: j * nodeSpacing },
                    data: {
                        label: `${newNodeId}` as string,
                        value: (Math.random() * 2 - 1) as number,
                        inputs: [] as [Node, Edge][],
                        outputs: [] as [Node, Edge][]
                    },
                    targetPosition: Position['Left'],
                    sourcePosition: Position['Right']
                };
                newNodes.push(newNode);

                // add bias edge
                weight = (Math.random() * 2 - 1) as number;
                const biasEdge: Edge = {
                    type: 'straight',
                    source: 'bias',
                    target: `${newNodeId}`,
                    id: `${getEdgeId()}`,
                    label: weight.toFixed(2),
                    data: {
                        weight: weight,
                        source: newNodes[1],
                        target: newNode
                    }
                };
                (newNodes[1].data.outputs as [Node, Edge][]).push([newNode, biasEdge]);
                (newNode.data.inputs as [Node, Edge][]).push([newNodes[1], biasEdge]);
                newEdges.push(biasEdge);

                // loop through previous layer and add edges
                for (let k = 0; k < sourceNodes.length; k++) {
                    weight = (Math.random() * 2 - 1) as number;

                    const newEdge: Edge = {
                        type: 'straight',
                        source: sourceNodes[k].id,
                        target: newNode.id,
                        id: `${getEdgeId()}`,
                        label: weight.toFixed(2),
                        data: {
                            weight: weight,
                            source: sourceNodes[k],
                            target: newNode
                        }
                    };
                    (sourceNodes[k].data.outputs as [Node, Edge][]).push([newNode, newEdge]);
                    (newNode.data.inputs as [Node, Edge][]).push([sourceNodes[k], newEdge]);
                    newEdges.push(newEdge);
                }
                newSourceNodes.push(newNode);
            }

            // set source nodes for next layer
            sourceNodes = newSourceNodes;
        }

        // add output edges
        for (let i = 0; i < sourceNodes.length; i++) {
            weight = (Math.random() * 2 - 1) as number;
            const newEdge: Edge = {
                type: 'straight',
                source: sourceNodes[i].id,
                target: 'output',
                id: `${getEdgeId()}`,
                label: weight.toFixed(2),
                data: {
                    weight: weight,
                    source: sourceNodes[i],
                    target: newNodes[2]
                }
            };
            (sourceNodes[i].data.outputs as [Node, Edge][]).push([newNodes[2], newEdge]);
            (newNodes[2].data.inputs as [Node, Edge][]).push([sourceNodes[i], newEdge]);
            newEdges.push(newEdge);
        }

        setGraphNodes(newNodes);
        setGraphEdges(newEdges);
    };

    const onNodeDragStart = useCallback((event: React.DragEvent<HTMLDivElement>, nodeType: string) => {
        event.dataTransfer.setData('application/reactflow', nodeType);
        event.dataTransfer.effectAllowed = 'move';
    }, []);

    const reset = () => {
        let nodeSpacing = 100;

        setGraphNodes([
            {
                id: 'input',
                type: 'input',
                data: {
                    label: 'input',
                    value: 0,
                    inputs: [],
                    outputs: []
                },
                targetPosition: Position['Left'],
                sourcePosition: Position['Right'],
                position: { x: 0, y: 0 },
            },
            {
                id: 'bias',
                type: 'input',
                data: {
                    label: 'bias',
                    value: 1,
                    inputs: [],
                    outputs: []
                },
                targetPosition: Position['Left'],
                sourcePosition: Position['Right'],
                position: { x: 0, y: nodeSpacing },
            },
            {
                id: 'output',
                type: 'output',
                data: {
                    label: 'output',
                    value: 0,
                    inputs: [],
                    outputs: []
                },
                targetPosition: Position['Left'],
                sourcePosition: Position['Right'],
                position: { x: nodeSpacing * 3, y: 0 },
            },
        ]);
        setGraphEdges([]);
    };

    return (
        <>
            <div id='model-builder-controls-container'>
                <div className='model-builder-controls-item' id='drag-and-drop'>
                    <div className='model-builder-controls-header'>Drag and Drop</div>
                    <div id='model-builder-controls-new-node' className="dndnode" onDragStart={(event) => onNodeDragStart(event, 'default')} draggable>
                        neuron
                    </div>
                </div>
                <div className='model-builder-controls-item'>
                    <div className='model-builder-controls-header'>Set Layers</div>
                    <input name='function' type='text' value={networkString} onChange={e => setNetworkString(e.target.value)} />
                    <button onClick={addLayers}>Set</button>
                    {/* <button id='reset-button' onClick={reset}>Reset Nodes</button> */}
                </div>
            </div>
        </>
    )
}

export default ModelBuilderControls;