import {
    Node,
    Edge
} from '@xyflow/react';

const activations: Record<string, Function> = {
    'sigmoid': (x: number) => 1 / (1 + Math.exp(-x)),
    'relu': (x: number) => Math.max(0, x)
}

const activationDerivatives: Record<string, Function> = {
    'sigmoid': (x: number) => activations['sigmoid'](x) * (1 - activations['sigmoid'](x)),
    'relu': (x: number) => x > 0 ? 1 : 0
}

const costFunctions: Record<string, Function> = {
    'mse': (groundTruth: number, prediction: number) => (groundTruth - prediction) ** 2
}

const costFunctionDerivatives: Record<string, Function> = {
    'mse': (groundTruth: number, prediction: number) => 2 * (prediction - groundTruth)
}

function inference(
    graphNodes: Node[], 
    inputValue: number, 
    activation: Function = activations['relu']
): [Node[], number] {
    const nodes = structuredClone(graphNodes);
    const computedNodes = new Set<string>();
    let outputValue: number = NaN;

    function computeNode(node: Node) {
        let nodeValue = 0;

        for (const [n, e] of (node.data.inputs as [Node, Edge][])) {
            if (!computedNodes.has(n.id)) {
                computeNode(n);
                computedNodes.add(n.id);
            }
            nodeValue += (n.data.value as number) * ((e.data)!.weight as number);
        }

        if (node.id !== 'output') nodeValue = activation(nodeValue);
        node.data.value = nodeValue;
        node.data.label = nodeValue.toFixed(2);
    }

    if (computedNodes.size === 0) {
        let outputNode: Node | undefined = undefined;

        for (const node of nodes) {
            if (node.id === 'input') {
                node.data.value = inputValue;
                node.data.label = inputValue.toFixed(2);
                computedNodes.add(node.id);
            };
            if (node.id === 'bias') {
                node.data.value = 1;
                node.data.label = (1 as number).toFixed(2);
                computedNodes.add(node.id);
            };
            if (node.id === 'output') outputNode = node;
        }

        computeNode(outputNode!);
        console.log(nodes);
        outputValue = outputNode!.data.value as number;
    
    }
    
    return [nodes, outputValue];
};


function backprop(
    graphNodes: Node[], 
    inputValue: number, 
    trueOutput: number, 
    activation: Function = activations['relu'],
    activationDerivative: Function = activationDerivatives['relu'], 
    costFunction: Function = costFunctions['mse'], 
    costFunctionDerivative: Function = costFunctionDerivatives['mse'], 
    learningRate: number = 0.01,
): [Node[], Edge[], number] {
    const [nodes, value] = inference(graphNodes, inputValue, activation);
    const edges: Edge[] = [];
    const predictedOutput: number = (nodes.find(node => node.id === 'output')!.data.value as number);

    const cost: number = costFunction(trueOutput, predictedOutput);

    let savedValues: Map<string, number> = new Map();

    function computeDErrorDOut(edge: Edge) {
        let dErrorDOut: number = 0;

        if (edge.target === 'output') {
            dErrorDOut = costFunctionDerivative(trueOutput, predictedOutput);
        }
        else {
            // sum up all of the errors from the target node's outputs        
            for (let [n, e] of ((edge.data!.target as Node).data.outputs as [Node, Edge][])) {

                // check if outgoing edge's weight has been computed
                if (!(savedValues.has(`weight_${e.id}`))) {
                    computeDErrorDWeight(e);
                }

                dErrorDOut += (savedValues.get(`dErrorDOut_${e.id}`)! * savedValues.get(`dOutDNet_${e.id}`)! * savedValues.get(`weight_${e.id}`)!);
            }
        }

        savedValues.set(`dErrorDOut_${edge.id}`, dErrorDOut);
    }

    function computeDOutDNet(edge: Edge) {
        let dOutDNet: number = activationDerivative((edge.data!.target as Node).data.value as number);
        if (edge.target === 'output') {
            dOutDNet = 1;
        }
        savedValues.set(`dOutDNet_${edge.id}`, dOutDNet);
    }

    function computeDNetDWeight(edge: Edge) {
        let dNetDWeight: number = (edge.data!.source as Node).data.value as number;
        savedValues.set(`dNetDWeight_${edge.id}`, dNetDWeight);
    }

    function computeDErrorDWeight(edge: Edge) {
        if (!(`dErrorDOut_${edge.id}` in savedValues.keys())) {
            computeDErrorDOut(edge);
        }
        if (!(`dOutDNet_${edge.id}` in savedValues.keys())) {
            computeDOutDNet(edge);
        }
        if (!(`dNetDWeight_${edge.id}` in savedValues.keys())) {
            computeDNetDWeight(edge);
        }

        /*
        by the chain rule, the derivative of the error wrt weight is the product of
            the derivative of the error wrt the output of the target node
            the derivative of the output wrt the input of node (activation function)
            the derivative of the input of the target node wrt the weight (source node value)
        */
        const dErrorDWeight: number = savedValues.get(`dErrorDOut_${edge.id}`)! * savedValues.get(`dOutDNet_${edge.id}`)! * savedValues.get(`dNetDWeight_${edge.id}`)!;
        
        // memoize old weight
        savedValues.set(`weight_${edge.id}`, edge.data!.weight as number);

        // update edge with new weight
        const newWeight = (edge.data!.weight as number) - learningRate * dErrorDWeight;
        edge.data!.weight = newWeight;
        edge.label = newWeight.toFixed(2);
        edges.push(edge);
    }

    // start from input nodes and recursively call derivative computations
    for (let node of nodes) {
        if (node.id === 'input') {
            for (let [n, e] of (node.data.outputs as [Node, Edge][])) {
                computeDErrorDWeight(e);
            }
        }
        if (node.id === 'bias') {
            for (let [n, e] of (node.data.outputs as [Node, Edge][])) {
                computeDErrorDWeight(e);
            }
        }
    }

    return [nodes, edges, cost];
}

function train(
    graphNodes: Node[], 
    points: [number, number][],
    activation: Function = activations['relu'],
    activationDerivative: Function = activationDerivatives['relu'], 
    costFunction: Function = costFunctions['mse'], 
    costFunctionDerivative: Function = costFunctionDerivatives['mse'], 
    learningRate: number = 0.01,
    batchSize: number = 1
) {
    const costs = [];
    let nodes: Node[] = graphNodes;
    let edges: Edge[] = [];

    for (let [input, output] of points) {
        const [newNodes, newEdges, cost] = backprop(nodes, input, output, activation, activationDerivative, costFunction, costFunctionDerivative, learningRate);
        nodes = newNodes as Node[];
        edges = newEdges as Edge[];
        costs.push(cost);
    }

    return [nodes, edges, costs];
}




export {
    activations,
    activationDerivatives,
    costFunctions,
    costFunctionDerivatives,
    inference,
    backprop,
    train
}