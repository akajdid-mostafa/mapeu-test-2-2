import React, { useEffect, useRef, useState } from "react";
import * as d3 from "d3";
import { toPng } from "html-to-image";

interface Point {
  x: number;
  y: number;
}

const LinearRegressionChart: React.FC = () => {
  const svgRef = useRef<SVGSVGElement>(null);
  const [points, setPoints] = useState<Point[]>([]);
  const [slope, setSlope] = useState<number>(0);
  const [intercept, setIntercept] = useState<number>(0);

  // tooltip state
  const [tooltip, setTooltip] = useState<{
    visible: boolean;
    x: number;
    y: number;
    dataX: number | null;
    dataY: number | null;
  }>({ visible: false, x: 0, y: 0, dataX: null, dataY: null });

  // make some random points
  const generateData = () => {
    const newPoints = Array.from({ length: 20 }, (_, i) => {
      const x = i + 1;
      const y = 2.5 * x + 5 + Math.random() * 5 - 2.5;
      return { x, y };
    });
    setPoints(newPoints);
  };

  // do the math for line
  const calculateRegression = (data: Point[]) => {
    const n = data.length;
    const sumX = d3.sum(data, (d) => d.x);
    const sumY = d3.sum(data, (d) => d.y);
    const sumXY = d3.sum(data, (d) => d.x * d.y);
    const sumXX = d3.sum(data, (d) => d.x * d.x);

    const m = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    const b = (sumY - m * sumX) / n;

    setSlope(m);
    setIntercept(b);
    return { m, b };
  };

  // save image
  const downloadPNG = () => {
    if (svgRef.current) {
      toPng(svgRef.current as unknown as HTMLElement).then((dataUrl: string) => {
        const link = document.createElement("a");
        link.download = "chart.png";
        link.href = dataUrl;
        link.click();
      });
    }
  };

  // draw the chart
  useEffect(() => {
    if (points.length === 0) return;

    const { m, b } = calculateRegression(points);

    const width = 600;
    const height = 400;
    const margin = { top: 40, right: 30, bottom: 30, left: 40 };

    const xScale = d3
      .scaleLinear()
      .domain([0, d3.max(points, (d) => d.x)! + 1])
      .range([margin.left, width - margin.right]);

    const yScale = d3
      .scaleLinear()
      .domain([0, d3.max(points, (d) => d.y)! + 5])
      .range([height - margin.bottom, margin.top]);

    const svg = d3.select(svgRef.current!);
    svg.selectAll("*").remove();

    // zoom and move
    const zoom = d3
      .zoom<SVGSVGElement, unknown>()
      .scaleExtent([1, 5])
      .translateExtent([
        [0, 0],
        [width, height],
      ])
      .on("zoom", (event) => {
        svg.selectAll("g").attr("transform", event.transform);
      });

    svg.call(zoom);

    const g = svg.append("g");

    // make axes
    g.append("g")
      .attr("transform", `translate(0,${height - margin.bottom})`)
      .call(d3.axisBottom(xScale));
    g.append("g")
      .attr("transform", `translate(${margin.left},0)`)
      .call(d3.axisLeft(yScale));

    // make circles with animation
    g.selectAll("circle")
      .data(points)
      .join("circle")
      .attr("cx", (d) => xScale(d.x))
      .attr("cy", (d) => yScale(d.y))
      .attr("r", 0) // start small
      .attr("fill", "#3b82f6")
      .attr("stroke", "#fff")
      .attr("stroke-width", 1.5)
      // Tooltip event handlers
      .on("mouseenter", (event, d) => {
        setTooltip({
          visible: true,
          x: event.clientX,
          y: event.clientY,
          dataX: d.x,
          dataY: d.y,
        });
      })
      .on("mousemove", (event) => {
        setTooltip((prev) => ({
          ...prev,
          x: event.clientX,
          y: event.clientY,
        }));
      })
      .on("mouseleave", () => {
        setTooltip({ visible: false, x: 0, y: 0, dataX: null, dataY: null });
      })
      .transition()
      .duration(500)
      .attr("r", 6);

    // draw the red line slow point by point
    const linePoints = d3.range(0, d3.max(points, (d) => d.x)! + 1, 0.5).map(
      (x) => ({
        x,
        y: m * x + b,
      })
    );

    const lineGenerator = d3
      .line<Point>()
      .x((d) => xScale(d.x))
      .y((d) => yScale(d.y));

    const path = g
      .append("path")
      .datum([])
      .attr("fill", "none")
      .attr("stroke", "#ef4444")
      .attr("stroke-width", 2);

    linePoints.forEach((_, i) => {
      setTimeout(() => {
        const currentData = linePoints.slice(0, i + 1);
        path.datum(currentData).attr("d", lineGenerator);
      }, i * 50);
    });
  }, [points]);

  useEffect(() => {
    generateData();
  }, []);

  return (
    <div style={{ display: "flex", gap: "20px", fontFamily: "sans-serif", position: "relative" }}>
      <div>
        <button
          onClick={generateData}
          style={{
            marginBottom: "10px",
            padding: "8px 14px",
            background: "linear-gradient(to right, #4f46e5, #3b82f6)",
            color: "#fff",
            borderRadius: "8px",
            border: "none",
            cursor: "pointer",
            fontSize: "14px",
            fontWeight: "bold",
          }}
        >
          Generate Data
        </button>
        <button
          onClick={downloadPNG}
          style={{
            marginBottom: "20px",
            padding: "8px 14px",
            background: "linear-gradient(to right, #10b981, #059669)",
            color: "#fff",
            borderRadius: "8px",
            border: "none",
            cursor: "pointer",
            fontSize: "14px",
            fontWeight: "bold",
          }}
        >
          Download as PNG
        </button>
        <div
          style={{
            background: "#f9fafb",
            padding: "10px",
            borderRadius: "12px",
            boxShadow: "0 4px 8px rgba(0,0,0,0.1)",
          }}
        >
          <svg ref={svgRef} width={600} height={400}></svg>
        </div>
      </div>

      <div
        style={{
          background: "#f3f4f6",
          padding: "15px",
          borderRadius: "12px",
          minWidth: "150px",
          boxShadow: "0 4px 8px rgba(0,0,0,0.1)",
        }}
      >
        <h4 style={{ marginBottom: "10px" }}>Stats</h4>
        <p>
          <b>Slope:</b> {slope.toFixed(2)}
        </p>
        <p>
          <b>Intercept:</b> {intercept.toFixed(2)}
        </p>
        <p>
          <b>Points:</b> {points.length}
        </p>
      </div>

      {/* Tooltip */}
      {tooltip.visible && (
        <div
          style={{
            position: "fixed",
            top: tooltip.y + 10,
            left: tooltip.x + 10,
            backgroundColor: "rgba(0, 0, 0, 0.75)",
            color: "#fff",
            padding: "5px 8px",
            borderRadius: "4px",
            pointerEvents: "none",
            fontSize: "12px",
            whiteSpace: "nowrap",
            zIndex: 1000,
          }}
        >
          X: {tooltip.dataX?.toFixed(2)} <br />
          Y: {tooltip.dataY?.toFixed(2)}
        </div>
      )}
    </div>
  );
};

export default LinearRegressionChart;
