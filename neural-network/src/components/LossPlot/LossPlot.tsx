import { useRef } from 'react';
import * as d3 from 'd3';


const LossPlot = ({ costData }: { costData: number[] }) => {
    const lossPlotRef = useRef(null);
    let lossPlotSize: [number, number] = [300, 300];

    function lossPlot(data: [number, number][]) {
        d3.selectAll("#loss-plot > svg > *").remove();
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

        let xScale = d3.scaleLinear().domain([0, data.length]).range([0, width]),
            yScale = d3.scaleLinear().domain([0, yMax]).range([height, 0]);

        svg.append("g")
            .attr("transform", "translate(0," + height + ")")
            .call(d3.axisBottom(xScale));

        svg.append("g")
            .call(d3.axisLeft(yScale));

        let line = d3.line()
            .x(function (d: [number, number]) { return xScale(d[0]); })
            .y(function (d: [number, number]) { return yScale(d[1]); })
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
            .text("Average Mean Squared Error")
    }

    lossPlot(costData.map((loss, i) => [i, loss]));

    return (
        <>
            <svg width={lossPlotSize[0]} height={lossPlotSize[1]} id="loss-plot" ref={lossPlotRef} />
        </>
    );
};

export default LossPlot;