import {
    useState,
} from 'react';

import {
    Node,
    Edge,
    useNodesState,
    useEdgesState,
    Position,
} from '@xyflow/react';

import ModelBuilder from './components/ModelBuilder/ModelBuilder';
import ModelControls from './components/ModelControls/ModelControls';
import LossPlot from './components/LossPlot/LossPlot';
import ModelPlot from './components/ModelPlot/ModelPlot';

import '@xyflow/react/dist/style.css';
import './index.css';

const nodeSpacing = 100;

const initialNodes: Node[] = [
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


const App = () => {
    const [graphNodes, setGraphNodes, onGraphNodesChange] = useNodesState<Node>(initialNodes);
    const [graphEdges, setGraphEdges, onGraphEdgesChange] = useEdgesState<Edge>([]);
    const [points, setPoints] = useState<[number, number][]>([]);
    const [costs, setCosts] = useState<number[]>([]);
    const [functionString, setFunctionString] = useState<string>('2*x');
    const [domain, setDomain] = useState<[number, number]>([-1, 1]);
    const [activation, setActivation] = useState<string>('sigmoid');

    return (
        <>
            <div id='app-container'>
                <ModelBuilder
                    graphNodes={graphNodes}
                    setGraphNodes={setGraphNodes}
                    onGraphNodesChange={onGraphNodesChange}
                    graphEdges={graphEdges}
                    setGraphEdges={setGraphEdges}
                    onGraphEdgesChange={onGraphEdgesChange}
                />
                <ModelControls
                    graphNodes={graphNodes}
                    setGraphNodes={setGraphNodes}
                    graphEdges={graphEdges}
                    setGraphEdges={setGraphEdges}
                    functionString={functionString}
                    setFunctionString={setFunctionString}
                    points={points}
                    setPoints={setPoints}
                    costs={costs}
                    setCosts={setCosts}
                    domain={domain}
                    setDomain={setDomain}
                    activation={activation}
                    setActivation={setActivation}
                />
                <div id='plot-container'>
                    <LossPlot
                        costData={costs}
                    />
                    <ModelPlot
                        nodes={graphNodes}
                        points={points}
                        domain={domain}
                        functionString={functionString}
                        activation={activation}
                    />
                </div>
            </div>
        </>
    );
}

export default App;
