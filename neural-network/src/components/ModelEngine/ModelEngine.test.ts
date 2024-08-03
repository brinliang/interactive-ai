import {
    Node,
    Edge
} from '@xyflow/react';

import { 
    inference,
    backprop,
    activations,
    activationDerivatives,
    costFunctions,
    costFunctionDerivatives
} from './ModelEngine';

function createNode(nodeId: string, value: number, inputs: Node[], outputs: Node[]) {
    const newNode: Node = {
        id: nodeId,
        position: { x: 0, y: 0 },
        data: {
            value: value,
            inputs: inputs,
            outputs: outputs
        },
    };
    
    return newNode;
}

function createEdge(edgeId: string, startNode: Node, endNode: Node, weight: number) {
    const newEdge: Edge = {
        type: 'straight',
        source: startNode.id,
        target: endNode.id,
        id: edgeId,
        label: `${startNode.id}->${endNode.id}`,
        data: {
            weight: weight,
            source: startNode,
            target: endNode
        }
    };

    (startNode.data.outputs as [Node, Edge][]).push([endNode, newEdge]);
    (endNode.data.inputs as [Node, Edge][]).push([startNode, newEdge]);

    return newEdge;
}

describe('inference', () => {
    test('1x1', () => {
        let nodes = [
            createNode('input', 1, [], []),
            createNode('output', NaN, [], [])
        ];
        createEdge('e1', nodes[0], nodes[1], 1);
        let [testNodes, value] = inference(nodes, 1, activations['relu']);

        expect(value).toBe(1);
    });
    test('2x1', () => {
        const nodes = [
            createNode('input', 1, [], []),
            createNode('bias', 1, [], []),
            createNode('output', NaN, [], [])
        ]
        createEdge('e1', nodes[0], nodes[2], 1);
        createEdge('e2', nodes[1], nodes[2], 1);

        let [testNodes, value] = inference(nodes, 1, activations['relu']);

        expect(value).toBe(2);
    });
    test('1x2x1', () => {
        const nodes = [
            createNode('input', 1, [], []), 
            createNode('h1', NaN, [], []),
            createNode('h2', NaN, [], []),
            createNode('output', NaN, [], [])
        ];
        createEdge('e1', nodes[0], nodes[1], 1);
        createEdge('e2', nodes[0], nodes[2], 1);
        createEdge('e3', nodes[1], nodes[3], 1);
        createEdge('e4', nodes[2], nodes[3], 1);
        
        let [testNodes, value] = inference(nodes, 1, activations['relu']);

        expect(value).toBe(2);
    });
    test('2x2x1', () => {
        const nodes = [
            createNode('input', 1, [], []), 
            createNode('bias', 1, [], []), 
            createNode('h1', 0, [], []),
            createNode('h2', 0, [], []),
            createNode('output', 0, [], [])
        ];
        createEdge('e1', nodes[0], nodes[2], 1);
        createEdge('e2', nodes[1], nodes[2], 1);
        createEdge('e3', nodes[0], nodes[3], 1);
        createEdge('e4', nodes[1], nodes[3], 1);
        createEdge('e5', nodes[2], nodes[4], 1);
        createEdge('e6', nodes[3], nodes[4], 1);

        let [testNodes, value] = inference(nodes, 1, activations['relu']);

        expect(value).toBe(4);
    });
});

describe('backprop', () => {
    test('2x2x2x1', () => {
        const nodes = [
            createNode('input', 1, [], []), 
            createNode('bias', 1, [], []), 
            createNode('h1', NaN, [], []),
            createNode('h2', NaN, [], []),
            createNode('h3', NaN, [], []),
            createNode('h4', NaN, [], []),
            createNode('output', NaN, [], [])
        ];
        const edges = [
            createEdge('e1', nodes[0], nodes[2], 1),
            createEdge('e2', nodes[1], nodes[2], 1),
            createEdge('e3', nodes[0], nodes[3], 1),
            createEdge('e4', nodes[1], nodes[3], 1),
            createEdge('e5', nodes[2], nodes[4], 1),
            createEdge('e6', nodes[3], nodes[4], 1),
            createEdge('e7', nodes[2], nodes[5], 1),
            createEdge('e8', nodes[3], nodes[5], 1),
            createEdge('e9', nodes[4], nodes[6], 1),
            createEdge('e10', nodes[5], nodes[6], 1),
        ];

        let [testNodes, testEdges, cost] = backprop(
            nodes,
            1,
            7,
            activations['relu'],
            activationDerivatives['relu'],
            costFunctions['mse'],
            costFunctionDerivatives['mse'],
            1
        )

        expect(
            (testEdges[0].data!.weight as number) + 
            (testEdges[1].data!.weight as number) + 
            (testEdges[2].data!.weight as number) +
            (testEdges[3].data!.weight as number) +
            (testEdges[4].data!.weight as number) +
            (testEdges[5].data!.weight as number) +
            (testEdges[6].data!.weight as number) +
            (testEdges[7].data!.weight as number) +
            (testEdges[8].data!.weight as number) +
            (testEdges[9].data!.weight as number)
        ).toBeCloseTo(-38);

    });
});
