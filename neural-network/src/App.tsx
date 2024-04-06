import { useState, useRef, useCallback } from 'react';
import ReactFlow, {
    ReactFlowProvider,
    Controls,
    Node,
    Edge,
    useNodesState,
    useEdgesState,
    Position,
    addEdge
} from 'reactflow';
import * as d3 from 'd3';

import 'reactflow/dist/style.css';
import './index.css';

let nodeSpacing = 100;

const initialNodes: Array<Node> = [
    {
        id: 'input',
        type: 'input',
        data: { label: 'input' },
        targetPosition: Position['Left'],
        sourcePosition: Position['Right'],
        position: { x: 0, y: 0 },
    },
    {
        id: 'bias',
        type: 'input',
        data: { label: 'bias' },
        targetPosition: Position['Left'],
        sourcePosition: Position['Right'],
        position: { x: 0, y: nodeSpacing },
    },
    {
        id: 'output',
        type: 'output',
        data: { label: 'output' },
        targetPosition: Position['Left'],
        sourcePosition: Position['Right'],
        position: { x: nodeSpacing * 3, y: 0 },
    },
];

let nodeId = 0;
const getNodeId = () => `h${nodeId++}`;
let edgeId = 0;
const getEdgeId = () => `w${edgeId++}`;

class GraphEdge {
    id: string;
    source: GraphNode;
    target: GraphNode;
    value: number;

    constructor(id: string, source: GraphNode, target: GraphNode, value: number) {
        this.id = id;
        this.source = source;
        this.target = target;
        this.value = value;
    }
}

class GraphNode {
    id: string;
    inputs: Array<[GraphEdge, GraphNode]> = [];
    outputs: Array<[GraphEdge, GraphNode]> = [];
    value: number;
    type: string;
    position: { x: number, y: number };

    constructor(node: Node, value: number) {
        this.id = node.id;
        this.type = node.type as string;
        this.position = node.position;
        this.value = value;
    }
}

const activations = {
    'sigmoid': (x: number) => 1 / (1 + Math.exp(-x)),
    'relu': (x: number) => Math.max(0, x)
}

const activationDerivatives = {
    'sigmoid': (x: number) => activations['sigmoid'](x) * (1 - activations['sigmoid'](x)),
    'relu': (x: number) => x > 0 ? 1 : 0
}

const costFunctions = {
    'mse': (y: number, yHat: number) => (y - yHat) ** 2
}

const costFunctionDerivatives = {
    'mse': (y: number, yHat: number) => 2 * (yHat - y)
}

function replaceAll(str, find, replace) {
    return str.replace(new RegExp(find, 'g'), replace);
}

const App = () => {
    // react flow
    const reactFlowWrapper = useRef(null);
    const [reactFlowInstance, setReactFlowInstance] = useState(null);
    const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
    const [edges, setEdges, onEdgesChange] = useEdgesState([]);

    // data generation
    const [functionString, setFunctionString] = useState('2*x');
    const [domain, setDomain] = useState([-1, 1]);
    const [variance, setVariance] = useState(0.3);
    const [datasetSize, setDatasetSize] = useState(100);

    // hyperparameters
    const [learningRate, setLearningRate] = useState(0.01);
    const [epochs, setEpochs] = useState(50);
    const [activation, setActivation] = useState('sigmoid');
    const [gradientThreshold, setGradientThreshold] = useState(1);

    // run
    const [point, setPoint] = useState([1, 2]);

    // set network
    const [networkString, setNetworkString] = useState('3x3');

    // computation graph
    const [graphNodes, setGraphNodes] = useState<Map<string, GraphNode>>(new Map());
    const [graphEdges, setGraphEdges] = useState<Map<string, GraphEdge>>(new Map());

    // create edges
    const onConnect = useCallback((params) => {

        const newEdge = {
            type: 'straight',
            source: params.source,
            target: params.target,
            id: getEdgeId(),
            label: `${params.source}->${params.target}`
        };

        setEdges((eds) => addEdge(newEdge, eds))
    }, []);

    // drag behavior from sidebar
    const onDragStart = (event, nodeType) => {
        event.dataTransfer.setData('application/reactflow', nodeType);
        event.dataTransfer.effectAllowed = 'move';
    };

    // drag behavior to editor
    const onDragOver = useCallback((event) => {
        event.preventDefault();
        event.dataTransfer.dropEffect = 'move';
    }, []);

    // drop behavior to editor
    const onDrop = useCallback(
        (event) => {
            event.preventDefault();

            const type = event.dataTransfer.getData('application/reactflow');

            if (typeof type === 'undefined' || !type) {
                return;
            }

            // @ts-ignore
            const position = reactFlowInstance.screenToFlowPosition({
                x: event.clientX - 30,
                y: event.clientY - 30,
            });

            let nodeId = getNodeId();

            const newNode: Node = {
                id: nodeId,
                type,
                position,
                data: { label: `${nodeId}` },
                targetPosition: Position['Left'],
                sourcePosition: Position['Right'],
            };

            setNodes((nds) => nds.concat(newNode));
        },
        [reactFlowInstance],
    );

    // set to fully connected layers based on networkString
    function addLayers() {
        let layers: Array<number> = networkString.split('x').map(Number);
        let newNodes: Array<Node> = [
            {
                id: 'input',
                type: 'input',
                data: { label: 'input' },
                targetPosition: Position['Left'],
                sourcePosition: Position['Right'],
                position: { x: 0, y: 0 },
            },
            {
                id: 'bias',
                type: 'input',
                data: { label: 'bias' },
                targetPosition: Position['Left'],
                sourcePosition: Position['Right'],
                position: { x: 0, y: nodeSpacing },
            },
            {
                id: 'output',
                type: 'output',
                data: { label: 'output' },
                targetPosition: Position['Left'],
                sourcePosition: Position['Right'],
                position: { x: nodeSpacing + nodeSpacing * layers.length, y: 0 },
            }
        ];
        let newEdges: Array<Edge> = [
            {
                type: 'straight',
                source: 'bias',
                target: 'output',
                id: getEdgeId(),
                label: `bias->output`
            }
        ];
        let sourceNodes: Array<Node> = [newNodes[0]];

        // loop through layers
        for (let i = 0; i < layers.length; i++) {
            let newSourceNodes: Array<Node> = [];

            // loop through layer and add nodes
            for (let j = 0; j < layers[i]; j++) {
                let nodeId: string = getNodeId();
                let newNode: Node = {
                    id: nodeId,
                    type: 'default',
                    data: { label: `${nodeId}` },
                    targetPosition: Position['Left'],
                    sourcePosition: Position['Right'],
                    position: { x: nodeSpacing + i * nodeSpacing, y: j * nodeSpacing },
                };
                newNodes.push(newNode);

                // add bias edge
                newEdges.push({
                    type: 'straight',
                    source: newNodes[1].id,
                    target: nodeId,
                    id: getEdgeId(),
                    label: `${newNodes[1].id}->${nodeId}`
                });;

                // loop through previous layer and add edges
                for (let k = 0; k < sourceNodes.length; k++) {
                    let newEdge: Edge = {
                        type: 'straight',
                        source: sourceNodes[k].id,
                        target: nodeId,
                        id: getEdgeId(),
                        label: `${sourceNodes[k].id}->${nodeId}`
                    };
                    newEdges.push(newEdge);
                }
                newSourceNodes.push(newNode);
            }
            sourceNodes = newSourceNodes;
        }

        // add output edges
        for (let i = 0; i < sourceNodes.length; i++) {
            let newEdge: Edge = {
                type: 'straight',
                source: sourceNodes[i].id,
                target: newNodes[2].id,
                id: getEdgeId(),
                label: `${sourceNodes[i].id}->${newNodes[2].id}`
            };
            newEdges.push(newEdge);
        }

        setNodes(newNodes);
        setEdges(newEdges);
    }

    // create a graph for neural network procedures from flow nodes and edges
    function getUpdatedComputationGraph(nodeList: Array<Node>, edgeList: Array<Edge>): [Map<string, GraphNode>, Map<string, GraphEdge>, Array<string>, Array<string>] {
        let newGraphNodes: Map<string, GraphNode> = new Map();
        let newGraphEdges: Map<string, GraphEdge> = new Map();

        // update nodes
        for (let node of nodeList) {
            if (graphNodes.has(node.id)) {
                newGraphNodes.set(node.id, new GraphNode(node, graphNodes.get(node.id)!.value));
            } else {
                newGraphNodes.set(node.id, new GraphNode(node, 1));
            }
        }

        // update edges
        for (let edge of edgeList) {
            let sourceNode: GraphNode = newGraphNodes.get(edge.source)!;
            let targetNode: GraphNode = newGraphNodes.get(edge.target)!;
            if (graphEdges.has(edge.id)) {
                newGraphEdges.set(edge.id, new GraphEdge(edge.id, sourceNode, targetNode, graphEdges.get(edge.id)!.value));
            } else {
                newGraphEdges.set(edge.id, new GraphEdge(edge.id, sourceNode, targetNode, Math.random() * 2 - 1));
            }
            sourceNode.outputs.push([newGraphEdges.get(edge.id)!, targetNode]);
            targetNode.inputs.push([newGraphEdges.get(edge.id)!, sourceNode]);
        }

        // get forward order
        let visitedForward: Map<string, boolean> = new Map();
        let newForwardOrder: Array<string> = [];

        function forwardStep(node: GraphNode) {
            for (let [inputEdge, inputNode] of node.inputs) {
                if (!visitedForward.get(inputNode.id)) {
                    forwardStep(inputNode);
                }
            }
            visitedForward.set(node.id, true);
            newForwardOrder.push(node.id);
        }

        forwardStep(newGraphNodes.get('output')!);

        // get backward order
        let visitedBackward: Map<string, boolean> = new Map();
        let newBackwardOrder: Array<string> = [];

        function backwardStep(node: GraphNode) {
            for (let [outputEdge, outputNode] of node.outputs) {
                if (!visitedBackward.get(outputNode.id)) {
                    backwardStep(outputNode);
                }
            }
            visitedBackward.set(node.id, true);
            newBackwardOrder.push(node.id);
        }

        backwardStep(newGraphNodes.get('input')!);

        return [newGraphNodes, newGraphEdges, newForwardOrder, newBackwardOrder];
    }

    // update flow from computation graph
    function updateFlow(newGraphNodes: Map<string, GraphNode>, newGraphEdges: Map<string, GraphEdge>) {
        let newNodes: Array<Node> = [];
        let newEdges: Array<Edge> = [];

        for (let [id, node] of newGraphNodes) {
            let newNode: Node = {
                id: node.id,
                type: node.type,
                position: node.position,
                data: { label: node.value.toFixed(1) },
                targetPosition: Position['Left'],
                sourcePosition: Position['Right'],
            };
            newNodes.push(newNode);
        }

        for (let [id, edge] of newGraphEdges) {
            let newEdge: Edge = {
                id: edge.id,
                type: 'straight',
                source: edge.source.id,
                target: edge.target.id,
                label: edge.value.toFixed(1)
            };
            newEdges.push(newEdge);
        }

        setNodes(newNodes);
        setEdges(newEdges);
    }

    // compute output from input
    function inference(x: number, newGraphNodes: Map<string, GraphNode>, newForwardOrder: Array<string>): Map<string, GraphNode> {
        for (let id of newForwardOrder) {
            let node: GraphNode = newGraphNodes.get(id)!;
            if (node.id === 'input') {
                node.value = x;
            }
            else if (node.id === 'bias') {
                node.value = 1;
            }
            else if (node.id === 'output') {
                let sum = 0;
                for (let [inputEdge, inputNode] of node.inputs) {
                    sum += inputEdge.value * inputNode.value;
                }
                node.value = sum;
            }
            else {
                let sum = 0;
                for (let [inputEdge, inputNode] of node.inputs) {
                    sum += inputEdge.value * inputNode.value;
                }
                node.value = activations[activation](sum);
            }
        }

        return newGraphNodes;
    }

    // run forward pass
    function forward() {
        let [newGraphNodes, newGraphEdges, newForwardOrder, newBackwardOrder] = getUpdatedComputationGraph(nodes, edges);
        newGraphNodes = inference(point[0], newGraphNodes, newForwardOrder);
        updateFlow(newGraphNodes, newGraphEdges);
        setGraphNodes(newGraphNodes);
        setGraphEdges(newGraphEdges);
    }

    // run forward propagation and backward propagation
    function backpropagation(x: number, y: number, newGraphNodes: Map<string, GraphNode>, newGraphEdges: Map<string, GraphEdge>, newForwardOrder: Array<string>, newBackwardOrder: Array<string>): [Map<string, GraphNode>, Map<string, GraphEdge>, number] {
        // run forward propagation
        let updatedGraphNodes = inference(x, newGraphNodes, newForwardOrder);
        let cost = costFunctions['mse'](y, updatedGraphNodes.get('output')!.value);
        let updatedGraphEdges = newGraphEdges;
        let savedValues: Map<string, number> = new Map();

        // run backward propagation
        for (let id of newBackwardOrder) {
            if (id === 'input' || id === 'bias') {
                continue;
            }

            let node: GraphNode = updatedGraphNodes.get(id)!;

            // 1. get the derivative of the cost function with respect to the output of the node
            let dcdo: number;
            if (id === 'output') {
                dcdo = costFunctionDerivatives['mse'](y, node.value);
            } else {
                // dc/do = sum(dc_i/do)
                dcdo = 0;
                for (let [outputEdge, outputNode] of node.outputs) {
                    dcdo += savedValues.get(`dcdo_${outputNode.id}`)! * savedValues.get(`dodn_${outputNode.id}`)! * outputEdge.value;
                }
            }

            // clip gradient
            if (dcdo > Math.abs(gradientThreshold)) {
                dcdo = gradientThreshold;
            } else if (dcdo < -Math.abs(gradientThreshold)) {
                dcdo = -gradientThreshold;
            }

            savedValues.set(`dcdo_${id}`, dcdo);

            // 2. get the derivative of the output of the node with respect to the input of the node
            let dodn: number;
            if (id === 'output') {
                dodn = 1;
            } else {
                dodn = activationDerivatives[activation](node.value);
            }

            // clip gradients
            if (dodn > Math.abs(gradientThreshold)) {
                dodn = gradientThreshold;
            } else if (dodn < -Math.abs(gradientThreshold)) {
                dodn = -gradientThreshold;
            }

            savedValues.set(`dodn_${id}`, dodn);

            // 3. get the derivative of the input of the node with respect to the weight of the edge
            for (let [inputEdge, inputNode] of node.inputs) {
                let edge = updatedGraphEdges.get(inputEdge.id)!;
                let dndw = inputNode.value;
                let dcdw = dcdo * dodn * dndw;

                // clip gradients
                if (dcdw > Math.abs(gradientThreshold)) {
                    dcdw = gradientThreshold;
                } else if (dcdw < -Math.abs(gradientThreshold)) {
                    dcdw = -gradientThreshold;
                }

                savedValues.set(`dcdw_${inputEdge.id}`, dcdw);
                edge.value -= learningRate * dcdw;
            }
        }

        return [updatedGraphNodes, updatedGraphEdges, cost];
    }

    function backward() {
        let [newGraphNodes, newGraphEdges, newForwardOrder, newBackwardOrder] = getUpdatedComputationGraph(nodes, edges);
        let [updatedGraphNodes, updatedGraphEdges, loss] = backpropagation(point[0], point[1], newGraphNodes, newGraphEdges, newForwardOrder, newBackwardOrder);

        updateFlow(updatedGraphNodes, updatedGraphEdges);
        setGraphNodes(updatedGraphNodes);
        setGraphEdges(updatedGraphEdges);
    }

    function train(): [Array<number>, Map<string, GraphNode>, Array<string>, Array<[number, number]>] {
        // create dataset
        let dataset: Array<[number, number]> = [];
        for (let i = 0; i < datasetSize; i++) {
            let x = Math.random() * (domain[1] - domain[0]) + domain[0];
            let y = eval(replaceAll(functionString, 'x', x.toString())) + Math.random() * variance - variance / 2;
            dataset.push([x, y]);
        }

        // train
        let losses: Array<number> = [];
        let loss: number;
        let [newGraphNodes, newGraphEdges, newForwardOrder, newBackwardOrder] = getUpdatedComputationGraph(nodes, edges);
        for (let i = 0; i < epochs; i++) {
            let avgLoss = 0;
            for (let [x, y] of dataset) {
                [newGraphNodes, newGraphEdges, loss] = backpropagation(x, y, newGraphNodes, newGraphEdges, newForwardOrder, newBackwardOrder);
                avgLoss += loss;
            }
            avgLoss /= datasetSize;
            losses.push(avgLoss);
        }

        updateFlow(newGraphNodes, newGraphEdges);
        setGraphNodes(newGraphNodes);
        setGraphEdges(newGraphEdges);

        return [losses, newGraphNodes, newForwardOrder, dataset];
    }

    // plot losses
    const lossPlotRef = useRef(null);
    let lossPlotSize: [number, number] = [300, 300];

    function lossPlot(data: Array<[number, number]>) {
        let yMax = Math.ceil(Math.max(...data.map((d) => d[1])));

        let margin = { top: 50, right: 20, bottom: 50, left: 50 };
        let width = lossPlotSize[0] - margin.left - margin.right;
        let height = lossPlotSize[1] - margin.top - margin.bottom;

        let svg = d3.select(lossPlotRef.current)
            .append("svg")
            .attr("width", width + margin.left + margin.right)
            .attr("height", height + margin.top + margin.bottom)
            .append("g")
            .attr("transform",
                "translate(" + margin.left + "," + margin.top + ")");

        let xScale = d3.scaleLinear().domain([0, epochs]).range([0, width]),
            yScale = d3.scaleLinear().domain([0, yMax]).range([height, 0]);

        svg.append("g")
            .attr("transform", "translate(0," + height + ")")
            .call(d3.axisBottom(xScale));

        svg.append("g")
            .call(d3.axisLeft(yScale));

        let line = d3.line()
            .x(function (d) { return xScale(d[0]); })
            .y(function (d) { return yScale(d[1]); })
            .curve(d3.curveMonotoneX)

        svg.append("path")
            .datum(data)
            .attr("class", "line")
            .attr("d", line)
            .style("fill", "none")
            .style("stroke", "#000000")
            .style("stroke-width", "2");

        svg.append("text")
            .attr("x", (width / 2))
            .attr("y", 0 - (margin.top / 2))
            .attr("text-anchor", "middle")
            .style("font-size", "12px")
            .text("Training Loss");

        svg.append("text")
            .attr("text-anchor", "end")
            .attr("x", width - 20)
            .attr("y", height + margin.top - 20)
            .style("font-size", "10px")
            .text("Epoch");

        svg.append("text")
            .attr("text-anchor", "end")
            .attr("transform", "rotate(-90)")
            .attr("y", -margin.left + 20)
            .attr("x", -margin.top + 20)
            .style("font-size", "10px")
            .text("Loss")
    }

    // plot function
    const functionPlotRef = useRef(null);
    let functionPlotSize: [number, number] = [300, 300];

    function functionPlot(plotNodes: Map<string, GraphNode>, forwardOrder: Array<string>, dataset: Array<[number, number]>) {
        let trueFx: Array<[number, number]> = [];
        let predictedFx: Array<[number, number]> = [];
        let yMin = Infinity;
        let yMax = -Infinity;

        for (let i = domain[0]; i <= domain[1]; i += ((domain[1] - domain[0]) / 100)) {
            let trueY = eval(replaceAll(functionString, 'x', i.toString()));
            let predictedY = inference(i, plotNodes, forwardOrder).get('output')!.value;
            trueFx.push([i, trueY]);
            predictedFx.push([i, predictedY]);
            yMin = Math.min(yMin, trueY, predictedY);
            yMax = Math.max(yMax, trueY, predictedY);
        }

        let margin = { top: 50, right: 20, bottom: 50, left: 50 };
        let width = functionPlotSize[0] - margin.left - margin.right;
        let height = functionPlotSize[1] - margin.top - margin.bottom;

        let svg = d3.select(functionPlotRef.current)
            .append("svg")
            .attr("width", width + margin.left + margin.right)
            .attr("height", height + margin.top + margin.bottom)
            .append("g")
            .attr("transform",
                "translate(" + margin.left + "," + margin.top + ")");

        let xScale = d3.scaleLinear().domain([domain[0], domain[1]]).range([0, width]),
            yScale = d3.scaleLinear().domain([Math.floor(yMin), Math.ceil(yMax)]).range([height, 0]);

        svg.append("g")
            .attr("transform", "translate(0," + height + ")")
            .call(d3.axisBottom(xScale));

        svg.append("g")
            .call(d3.axisLeft(yScale));

        let line = d3.line()
            .x(function (d) { return xScale(d[0]); })
            .y(function (d) { return yScale(d[1]); })
            .curve(d3.curveMonotoneX)

        svg.append("path")
            .datum(trueFx)
            .attr("class", "line")
            .attr("d", line)
            .style("fill", "none")
            .style("stroke", "#0000ff")
            .style("stroke-width", "2");

        svg.append("path")
            .datum(predictedFx)
            .attr("class", "line")
            .attr("d", line)
            .style("fill", "none")
            .style("stroke", "#ff0000")
            .style("stroke-width", "2");

        svg.append('g')
            .selectAll("dot")
            .data(dataset)
            .enter()
            .append("circle")
            .attr("cx", function (d) { return xScale(d[0]); })
            .attr("cy", function (d) { return yScale(d[1]); })
            .attr("r", 1)
            .style("fill", "#800080");

        svg.append("text")
            .attr("x", (width / 2))
            .attr("y", 0 - (margin.top / 2))
            .attr("text-anchor", "middle")
            .style("font-size", "12px")
            .text("Results");

        svg.append("text")
            .attr("text-anchor", "end")
            .attr("x", width - 20)
            .attr("y", height + margin.top - 20)
            .style("font-size", "10px")
            .text("x");

        svg.append("text")
            .attr("text-anchor", "end")
            .attr("transform", "rotate(-90)")
            .attr("y", -margin.left + 20)
            .attr("x", -margin.top + 20)
            .style("font-size", "10px")
            .text("f(x)")


        svg.append("circle").attr("cx", 180).attr("cy", -30).attr("r", 2).style("fill", "#0000ff")
        svg.append("text").attr("x", 190).attr("y", -30).text("ground truth").style("font-size", "8px").attr("alignment-baseline", "middle")
        svg.append("circle").attr("cx", 180).attr("cy", -20).attr("r", 2).style("fill", "#800080")
        svg.append("text").attr("x", 190).attr("y", -20).text("data points").style("font-size", "8px").attr("alignment-baseline", "middle")
        svg.append("circle").attr("cx", 180).attr("cy", -10).attr("r", 2).style("fill", "#ff0000")
        svg.append("text").attr("x", 190).attr("y", -10).text("network").style("font-size", "8px").attr("alignment-baseline", "middle")
    }

    function trainVisualize() {
        let [losses, trainedGraphNodes, forwardOrder, dataset] = train();
        d3.selectAll("#plot-container > svg > *").remove();
        lossPlot(losses.map((loss, i) => [i, loss]));
        functionPlot(trainedGraphNodes, forwardOrder, dataset);
    }

    function reset() {
        let newGraphNodes: Map<string, GraphNode> = new Map();
        let newGraphEdges: Map<string, GraphEdge> = new Map();

        for (let node of nodes) {
            newGraphNodes.set(node.id, new GraphNode(node, 1));
        }

        for (let edge of edges) {
            let sourceNode: GraphNode = newGraphNodes.get(edge.source)!;
            let targetNode: GraphNode = newGraphNodes.get(edge.target)!;
            newGraphEdges.set(edge.id, new GraphEdge(edge.id, sourceNode, targetNode, Math.random() * 2 - 1));
            sourceNode.outputs.push([newGraphEdges.get(edge.id)!, targetNode]);
            targetNode.inputs.push([newGraphEdges.get(edge.id)!, sourceNode]);
        }
        console.log(newGraphNodes);
        updateFlow(newGraphNodes, newGraphEdges);
        setGraphNodes(newGraphNodes);
        setGraphEdges(newGraphEdges);
    }

    return (
        <div id='container'>
            <div id='editor-title'>Neural Network Editor</div>
            <div id='sidebar-title'>Editor Tools</div>
            <ReactFlowProvider>
                <div id='editor' ref={reactFlowWrapper}>
                    <ReactFlow
                        nodes={nodes}
                        edges={edges}
                        onNodesChange={onNodesChange}
                        onEdgesChange={onEdgesChange}
                        onConnect={onConnect}
                        onDrop={onDrop}
                        onDragOver={onDragOver}
                        onInit={setReactFlowInstance}
                        fitView
                    >
                        <Controls />
                    </ReactFlow>
                </div>
                <div id='sidebar'>
                    <div className='editor-section'>
                        Drag and drop
                        <div className='editor-item'>
                            <div id='new-node' className="dndnode" onDragStart={(event) => onDragStart(event, 'default')} draggable>
                                neuron
                            </div>
                        </div>
                    </div>
                    <div className='editor-section'>
                        Set layers
                        <div className='editor-item'>
                            <input name='function' type='text' value={networkString} onChange={e => setNetworkString(e.target.value)} />
                        </div>
                        <div className='editor-item'>
                            <button onClick={addLayers}>Set</button>
                        </div>
                    </div>
                    <div className='editor-section'>
                        Reset all values
                        <div className='editor-item'>
                            <button onClick={reset}>Reset</button>
                        </div>
                    </div>
                </div>
            </ReactFlowProvider>
            <div id='controls-title'>
                Controls
            </div>
            <div id='controls'>
                <div className='control-section'>
                    Hyperparameters
                    <div className='control-item'>
                        Learning Rate: <input name='learning-rate' type='number' style={{ width: 60 }} value={learningRate} onChange={e => setLearningRate(Number(e.target.value))} />
                    </div>
                    <div className='control-item'>
                        Epochs: <input name='epochs' type='number' style={{ width: 60 }} value={epochs} onChange={e => setEpochs(Number(e.target.value))} />
                    </div>
                    <div className='control-item'>
                        Activation: &nbsp;
                        <select name='activation' value={activation} onChange={e => setActivation(e.target.value)}>
                            <option value='sigmoid'>Sigmoid</option>
                            <option value='relu'>ReLU</option>
                        </select>
                    </div>
                    <div className='control-item'>
                        Gradient Threshold: <input name='gradient-threshold' type='number' style={{ width: 60 }} value={gradientThreshold} onChange={e => setGradientThreshold(Number(e.target.value))} />
                    </div>
                </div>
                <div className='control-section'>
                    Data Generation
                    <div className='control-item'>
                        Function: f(x) = <input name='function' type='text' value={functionString} onChange={e => setFunctionString(e.target.value)} />
                    </div>
                    <div className='control-item'>
                        Domain: [&nbsp;
                        <input name='domainmin' type='number' style={{ width: 60 }} value={domain[0]} onChange={e => setDomain([Number(e.target.value), domain[1]])} />&nbsp;,&nbsp;
                        <input name='domainmax' type='number' style={{ width: 60 }} value={domain[1]} onChange={e => setDomain([domain[0], Number(e.target.value)])} />&nbsp;
                        ]
                    </div>
                    <div className='control-item'>
                        Variance: <input name='variance' type='number' style={{ width: 60 }} value={variance} onChange={e => setVariance(Number(e.target.value))} />
                    </div>
                    <div className='control-item'>
                        Dataset Size: <input name='dataset-size' type='number' style={{ width: 60 }} value={datasetSize} onChange={e => setDatasetSize(Number(e.target.value))} />
                    </div>
                </div>
                <div className='control-section'>
                    Run
                    <div className='control-item'>
                        Test Point: (&nbsp;
                        <input name='pointx' type='number' style={{ width: 60 }} value={point[0]} onChange={e => setPoint([Number(e.target.value), point[1]])} />&nbsp;,&nbsp;
                        <input name='pointy' type='number' style={{ width: 60 }} value={point[1]} onChange={e => setPoint([point[0], Number(e.target.value)])} />&nbsp;
                        )
                    </div>
                    <div>
                        <button className='control-item' onClick={forward}>Forward</button>
                        <button className='control-item' onClick={backward}>Backward</button>
                        <button className='control-item' onClick={trainVisualize}>Train</button>
                    </div>
                </div>
            </div>
            <div id='plot-container'>
                <svg width={lossPlotSize[0]} height={lossPlotSize[1]} id="loss-plot" ref={lossPlotRef} />
                <svg width={functionPlotSize[0]} height={functionPlotSize[1]} id="function-plot" ref={functionPlotRef} />
            </div>
        </div>
    );
}

export default App;
