import {
    useRef,
    useState,
    useCallback
} from 'react';

import {
    ReactFlowInstance,
    Connection,
    Node,
    Edge,
    addEdge,
    ReactFlowProvider,
    ReactFlow,
    Controls,
    Position,
} from '@xyflow/react';

import ModelBuilderControls from './ModelBuilderControls/ModelBuilderControls';

import {
    ModelBuilderProps
} from './ModelBuilder.types';

import './ModelBuilder.styles.css';

let nodeId = 0;
let edgeId = 0;
const getNodeId = () => `n${nodeId++}`;
const getEdgeId = () => `e${edgeId++}`;

const ModelBuilder = ({ graphNodes, setGraphNodes, onGraphNodesChange, graphEdges, setGraphEdges, onGraphEdgesChange }: ModelBuilderProps) => {
    const reactFlowWrapper = useRef(null);
    const [reactFlowInstance, setReactFlowInstance] = useState<ReactFlowInstance>();

    const weight: number = (Math.random() * 2 - 1) as number;

    function onNodeConnect(params: Connection) {
        console.log(params);
        console.log(graphNodes);
        const newEdge: Edge = {
            type: 'straight',
            source: params.source,
            target: params.target,
            id: `${getEdgeId()}`,
            label: `${weight.toFixed(2)}`,
            data: {
                weight: weight,
                source: null,
                target: null
            }
        };

        // add connection information to connected nodes
        let inputNode: Node;
        let outputNode: Node;

        for (const node of graphNodes) {
            if (node.id === params.source) {
                inputNode = node;
                newEdge.data!.source = node;
            }
            if (node.id === params.target) {
                outputNode = node;
                newEdge.data!.target = node;
            }
        }

        (inputNode!.data.outputs as [Node, Edge][]).push([outputNode!, newEdge]);
        (outputNode!.data.inputs as [Node, Edge][]).push([inputNode!, newEdge]);

        setGraphEdges((eds: Edge[]) => addEdge(newEdge, eds))
    };


    const onNodeDrag = useCallback((event: React.DragEvent<HTMLDivElement>) => {
        event.preventDefault();
        event.dataTransfer.dropEffect = 'move';
    }, []);

    function onNodeDrop(event: React.DragEvent<HTMLDivElement>) {
        event.preventDefault();
        const type = event.dataTransfer.getData('application/reactflow');

        if (typeof type === undefined || !type) {
            return;
        }

        if (reactFlowInstance === undefined) {
            return;
        }

        // center node on mouse position
        let offset = 30;
        const position = reactFlowInstance.screenToFlowPosition({
            x: event.clientX - offset,
            y: event.clientY - offset,
        });

        const newNodeId = getNodeId();

        const newNode: Node = {
            id: `${newNodeId}`,
            type,
            position,
            data: {
                label: `${newNodeId}` as string,
                value: (Math.random() * 2 - 1) as number,
                inputs: [] as [Node, Edge][],
                outputs: [] as [Node, Edge][]
            },
            targetPosition: Position['Left'],
            sourcePosition: Position['Right']
        };

        setGraphNodes((nds: Node[]) => nds.concat(newNode));
    };

    function onDelete({ nodes, edges }: { nodes: Node[], edges: Edge[] }) {
        for (const node of graphNodes) {
            const initialInputs: [Node, Edge][] = (node.data.inputs as [Node, Edge][]);
            const initialOutputs: [Node, Edge][] = (node.data.outputs as [Node, Edge][]);
            const newInputs: [Node, Edge][] = [];
            const newOutputs: [Node, Edge][] = [];

            for (const [n, e] of initialInputs) {
                if (nodes.includes(n) || edges.includes(e)) {
                    continue;
                }
                newInputs.push([n, e]);
            }

            for (const [n, e] of initialOutputs) {
                if (nodes.includes(n) || edges.includes(e)) {
                    continue;
                }
                newOutputs.push([n, e]);
            }

            node.data.inputs = newInputs;
            node.data.outputs = newOutputs;
        }
    };

    return (
        <div id='model-builder-container'>
            <ReactFlowProvider>
                <div id='model-builder' ref={reactFlowWrapper}>
                    <ReactFlow
                        nodes={graphNodes}
                        edges={graphEdges}
                        onNodesChange={onGraphNodesChange}
                        onEdgesChange={onGraphEdgesChange}
                        onConnect={onNodeConnect}
                        onDrop={onNodeDrop}
                        onDragOver={onNodeDrag}
                        onInit={setReactFlowInstance}
                        onDelete={onDelete}
                        fitView
                    >
                        <Controls />
                    </ReactFlow>
                </div>
                <div id='model-builder-controls'>
                    <ModelBuilderControls
                        graphNodes={graphNodes}
                        setGraphNodes={setGraphNodes}
                        onGraphNodesChange={onGraphNodesChange}
                        graphEdges={graphEdges}
                        setGraphEdges={setGraphEdges}
                        onGraphEdgesChange={onGraphEdgesChange}
                        getNodeId={getNodeId}
                        getEdgeId={getEdgeId}
                    />
                </div>
            </ReactFlowProvider>
        </div>
    )

}

export default ModelBuilder;