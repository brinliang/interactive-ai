import { useRef } from 'react';

import * as d3 from 'd3';

import {
    Node,
} from '@xyflow/react';

import { inference, activations } from '../ModelEngine/ModelEngine';
import { replaceAll } from '../utils';


const ModelPlot = ({ nodes, points, domain, activation, functionString }: {
    nodes: Node[],
    points: [number, number][],
    domain: [number, number],
    activation: string,
    functionString: string
}) => {
    d3.selectAll("#function-plot > svg > *").remove();

    const functionPlotRef = useRef(null);
    let functionPlotSize: [number, number] = [300, 300];

    function modelPlot() {
        let trueFx: Array<[number, number]> = [];
        let predictedFx: Array<[number, number]> = [];
        let yMin = Infinity;
        let yMax = -Infinity;

        for (let i = domain[0]; i <= domain[1]; i += ((domain[1] - domain[0]) / 100)) {
            let trueY = eval(replaceAll(functionString, 'x', i.toString()));
            let [_, predictedY] = inference(nodes, i, activations[activation]);
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
            .data(points)
            .enter()
            .append("circle")
            .attr("cx", function (d: any) { return xScale(d[0]); })
            .attr("cy", function (d: any) { return yScale(d[1]); })
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

    modelPlot();


    return (
        <>
            <svg width={functionPlotSize[0]} height={functionPlotSize[1]} id="function-plot" ref={functionPlotRef} />
        </>
    )
}

export default ModelPlot;