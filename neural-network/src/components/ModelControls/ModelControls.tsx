import { useState } from 'react';
import { ModelControlsProps } from './ModelControls.types';

import { replaceAll } from '../utils';

import {
    Node,
    Edge
} from '@xyflow/react';

import {
    activations,
    activationDerivatives,
    costFunctions,
    costFunctionDerivatives,
    inference,
    backprop,
    train
} from '../ModelEngine/ModelEngine';

import './ModelControls.css';

const ModelControls = ({
    graphNodes, setGraphNodes, graphEdges, setGraphEdges,
    functionString, setFunctionString, points, setPoints, costs, setCosts,
    domain, setDomain, activation, setActivation
}: ModelControlsProps) => {
    const [learningRate, setLearningRate] = useState<number>(0.01);
    const [epochs, setEpochs] = useState<number>(30);

    const [variance, setVariance] = useState<number>(0.3);
    const [numPoints, setNumPoints] = useState<number>(128);

    const [point, setPoint] = useState<[number, number]>([1, 2]);

    function graphInference() {
        let [nodes, value] = inference(graphNodes, point[0], activations[activation]);
        setGraphNodes(nodes as Node[]);
    }

    function graphBackprop() {
        const [nodes, edges, cost]: (Node[] | Edge[] | number)[] = backprop(
            graphNodes,
            point[0],
            point[1],
            activations[activation],
            activationDerivatives[activation],
            costFunctions['mse'],
            costFunctionDerivatives['mse'],
            learningRate
        );
        setGraphNodes(nodes as Node[]);
        setGraphEdges(edges as Edge[]);
    }

    function trainModel() {
        const newCosts: number[] = [];
        let nodes: Node[] = graphNodes;
        let edges: Edge[] = [];
        let newPoints: [number, number][] = [];

        for (let i = 0; i < numPoints; i++) {
            let x = Math.random() * (domain[1] - domain[0]) + domain[0];
            let y = eval(replaceAll(functionString, 'x', x.toString())) + Math.random() * variance - variance / 2;
            newPoints.push([x, y]);
        }

        for (let e = 0; e < epochs; e++) {
            let newCost: number = 0;

            for (let i = 0; i < numPoints; i++) {
                let point = newPoints[Math.floor(Math.random() * numPoints)];

                const [newNodes, newEdges, cost] = backprop(
                    nodes, point[0], point[1],
                    activations[activation], activationDerivatives[activation],
                    costFunctions['mse'], costFunctionDerivatives['mse'], learningRate
                );
                nodes = newNodes as Node[];
                edges = newEdges as Edge[];
                newCost += cost as number;
            }

            newCosts.push(newCost / numPoints);
        }

        setGraphNodes(nodes);
        setGraphEdges(edges);
        setCosts(costs.concat(newCosts));
        setPoints(newPoints);
    }


    return (
        <>
            <div id='model-controls-container'>
                <div className='model-controls-section' id='hyperparameters'>
                    <div className='model-controls-section-header'>Hyperparameters</div>
                    <div className='model-controls-item'>
                        Learning Rate: <input name='learning-rate' type='number' style={{ width: 60 }} value={learningRate} onChange={e => setLearningRate(Number(e.target.value))} />
                    </div>
                    <div className='model-controls-item'>
                        Activation: &nbsp;
                        <select name='activation' value={activation} onChange={e => setActivation(e.target.value)}>
                            <option value='sigmoid'>Sigmoid</option>
                            <option value='relu'>ReLU</option>
                        </select>
                    </div>
                    <div className='model-controls-item'>
                        Batch Size: <input name='dataset-size' type='number' style={{ width: 60 }} value={numPoints} onChange={e => setNumPoints(Number(e.target.value))} />
                    </div>
                    <div className='model-controls-item'>
                        Epochs: <input name='epochs' type='number' style={{ width: 60 }} value={epochs} onChange={e => setEpochs(Number(e.target.value))} />
                    </div>
                </div>
                <div className='model-controls-section' id='train'>
                    <div className='model-controls-section-header'>Train Model</div>
                    <div className='model-controls-item'>
                        Function: f(x) = <input name='function' type='text' value={functionString} onChange={e => setFunctionString(e.target.value)} />
                    </div>
                    <div className='model-controls-item'>
                        Domain: [&nbsp;
                        <input name='domainmin' type='number' style={{ width: 60 }} value={domain[0]} onChange={e => setDomain([Number(e.target.value), domain[1]])} />&nbsp;,&nbsp;
                        <input name='domainmax' type='number' style={{ width: 60 }} value={domain[1]} onChange={e => setDomain([domain[0], Number(e.target.value)])} />&nbsp;
                        ]
                    </div>
                    <div className='model-controls-item'>
                        Variance: <input name='variance' type='number' style={{ width: 60 }} value={variance} onChange={e => setVariance(Number(e.target.value))} />
                    </div>

                    <div className='model-controls-item'>
                        <button className='model-controls-button' onClick={trainModel}>Train</button>
                    </div>
                </div>
                <div className='model-controls-section' id='run'>
                    <div className='model-controls-section-header'>Run Model</div>
                    <div className='model-controls-item'>
                        Point: (&nbsp;
                        <input name='pointx' type='number' style={{ width: 60 }} value={point[0]} onChange={e => setPoint([Number(e.target.value), point[1]])} />&nbsp;,&nbsp;
                        <input name='pointy' type='number' style={{ width: 60 }} value={point[1]} onChange={e => setPoint([point[0], Number(e.target.value)])} />&nbsp;
                        )
                    </div>
                    <div className='model-controls-item'>
                        <button className='model-controls-button' onClick={graphInference}>Inference</button>
                        <button className='model-controls-button' onClick={graphBackprop}>Backprop</button>
                    </div>
                </div>
            </div>
        </>
    );
}

export default ModelControls;