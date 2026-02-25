import * as d3 from "d3";
import type { JSX } from "solid-js";
import { createEffect, For, onMount, Show } from "solid-js";

import type { MetricSeries } from "./types.ts";

export interface MetricsChartProps {
  series: MetricSeries[];
  title?: string;
  height?: number;
  class?: string;
}

const DEFAULT_COLORS = ["#0ea5e9", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899"];

export function MetricsChart(props: MetricsChartProps): JSX.Element {
  let svgRef: SVGSVGElement | undefined;

  const height = () => props.height ?? 200;

  function render() {
    if (!svgRef) return;

    const container = svgRef.parentElement;
    const totalWidth = container?.clientWidth ?? 600;
    const margin = { top: 12, right: 16, bottom: 28, left: 44 };
    const w = totalWidth - margin.left - margin.right;
    const h = height() - margin.top - margin.bottom;

    d3.select(svgRef).selectAll("*").remove();
    svgRef.setAttribute("width", String(totalWidth));
    svgRef.setAttribute("height", String(height()));

    const svg = d3
      .select(svgRef)
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    const allPoints = props.series.flatMap((s) => s.data);
    if (allPoints.length === 0) return;

    const xExtent = d3.extent(allPoints, (d) => d.timestamp) as [number, number];
    const yMax = d3.max(allPoints, (d) => d.value) ?? 1;

    const x = d3.scaleTime().domain(xExtent).range([0, w]);
    const y = d3
      .scaleLinear()
      .domain([0, yMax * 1.1])
      .nice()
      .range([h, 0]);

    // Axes
    svg
      .append("g")
      .attr("transform", `translate(0,${h})`)
      .call(d3.axisBottom(x).ticks(5).tickSizeOuter(0))
      .call((g) => g.select(".domain").attr("stroke", "var(--color-surface1,rgba(0,0,0,0.12))"))
      .call((g) =>
        g
          .selectAll("text")
          .attr("fill", "var(--color-text-secondary,#6b7280)")
          .attr("font-size", "10"),
      );

    svg
      .append("g")
      .call(d3.axisLeft(y).ticks(4).tickSizeOuter(0))
      .call((g) => g.select(".domain").remove())
      .call((g) =>
        g
          .selectAll(".tick line")
          .clone()
          .attr("x2", w)
          .attr("stroke", "var(--color-surface1,rgba(0,0,0,0.06))"),
      )
      .call((g) =>
        g
          .selectAll("text")
          .attr("fill", "var(--color-text-secondary,#6b7280)")
          .attr("font-size", "10"),
      );

    // Lines
    const line = d3
      .line<{ timestamp: number; value: number }>()
      .x((d) => x(d.timestamp))
      .y((d) => y(d.value))
      .curve(d3.curveMonotoneX);

    props.series.forEach((s, i) => {
      const color = s.color ?? DEFAULT_COLORS[i % DEFAULT_COLORS.length];
      svg
        .append("path")
        .datum(s.data)
        .attr("fill", "none")
        .attr("stroke", color)
        .attr("stroke-width", 1.5)
        .attr("d", line);
    });
  }

  onMount(() => render());
  createEffect(() => {
    // Re-render when series data changes
    void props.series;
    void props.height;
    render();
  });

  return (
    <div
      class={`rounded-xl border border-[var(--color-surface1,rgba(0,0,0,0.1))] bg-[var(--color-bg,#fff)] p-4 ${props.class ?? ""}`}
    >
      <Show when={props.title}>
        <p class="mb-3 text-sm font-semibold text-[var(--color-text,#111)]">{props.title}</p>
      </Show>

      {/* Legend */}
      <Show when={props.series.length > 1}>
        <div class="mb-2 flex flex-wrap gap-3">
          <For each={props.series}>
            {(s, i) => {
              const color = s.color ?? DEFAULT_COLORS[i() % DEFAULT_COLORS.length];
              return (
                <span class="flex items-center gap-1 text-xs text-[var(--color-text-secondary,#6b7280)]">
                  <span style={`background:${color}`} class="inline-block h-2 w-4 rounded-sm" />
                  {s.name}
                </span>
              );
            }}
          </For>
        </div>
      </Show>

      <svg ref={svgRef} class="w-full overflow-visible" />
    </div>
  );
}
