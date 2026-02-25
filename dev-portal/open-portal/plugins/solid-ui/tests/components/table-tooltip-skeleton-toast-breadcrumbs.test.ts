import { expect, test } from "vite-plus/test";
import type { TableProps } from "../../src/components/Table";
import type { TooltipProps } from "../../src/components/Tooltip";
import type { SkeletonProps } from "../../src/components/Skeleton";
import type { ToastProps } from "../../src/components/Toast";
import type { BreadcrumbsProps } from "../../src/components/Breadcrumbs";

test("Table type structure with all props", () => {
  const props: TableProps = {
    class: "custom",
    children: "Table content",
  };
  expect(props.class).toBe("custom");
});

test("Tooltip type structure with all props", () => {
  const props: TooltipProps = {
    content: "Tooltip text",
    position: "top",
    color: "primary",
    class: "custom",
    children: "Hover me",
  };
  expect(props.content).toBe("Tooltip text");
  expect(props.position).toBe("top");
  expect(props.color).toBe("primary");
});

test("Tooltip with position options", () => {
  const top: TooltipProps = { position: "top" };
  const bottom: TooltipProps = { position: "bottom" };
  const left: TooltipProps = { position: "left" };
  const right: TooltipProps = { position: "right" };

  expect(top.position).toBe("top");
  expect(bottom.position).toBe("bottom");
  expect(left.position).toBe("left");
  expect(right.position).toBe("right");
});

test("Tooltip with color options", () => {
  const primary: TooltipProps = { color: "primary" };
  const secondary: TooltipProps = { color: "secondary" };
  const accent: TooltipProps = { color: "accent" };
  const success: TooltipProps = { color: "success" };

  expect(primary.color).toBe("primary");
  expect(secondary.color).toBe("secondary");
  expect(accent.color).toBe("accent");
  expect(success.color).toBe("success");
});

test("Skeleton type structure with all props", () => {
  const props: SkeletonProps = {
    variant: "circle",
    size: "md",
    class: "custom",
  };
  expect(props.variant).toBe("circle");
  expect(props.size).toBe("md");
});

test("Skeleton with variant options", () => {
  const circle: SkeletonProps = { variant: "circle" };
  const rect: SkeletonProps = { variant: "rect" };
  const text: SkeletonProps = { variant: "text" };

  expect(circle.variant).toBe("circle");
  expect(rect.variant).toBe("rect");
  expect(text.variant).toBe("text");
});

test("Skeleton with size options", () => {
  const xs: SkeletonProps = { size: "xs" };
  const sm: SkeletonProps = { size: "sm" };
  const md: SkeletonProps = { size: "md" };
  const lg: SkeletonProps = { size: "lg" };
  const xl: SkeletonProps = { size: "xl" };

  expect(xs.size).toBe("xs");
  expect(sm.size).toBe("sm");
  expect(md.size).toBe("md");
  expect(lg.size).toBe("lg");
  expect(xl.size).toBe("xl");
});

test("Toast type structure with all props", () => {
  const props: ToastProps = {
    position: "top-right",
    alignment: "start",
    class: "custom",
    children: "Toast message",
  };
  expect(props.position).toBe("top-right");
  expect(props.alignment).toBe("start");
});

test("Toast with position options", () => {
  const topLeft: ToastProps = { position: "top-left" };
  const topRight: ToastProps = { position: "top-right" };
  const bottomLeft: ToastProps = { position: "bottom-left" };
  const bottomRight: ToastProps = { position: "bottom-right" };
  const topCenter: ToastProps = { position: "top-center" };

  expect(topLeft.position).toBe("top-left");
  expect(topRight.position).toBe("top-right");
  expect(bottomLeft.position).toBe("bottom-left");
  expect(bottomRight.position).toBe("bottom-right");
  expect(topCenter.position).toBe("top-center");
});

test("Toast with alignment options", () => {
  const start: ToastProps = { alignment: "start" };
  const center: ToastProps = { alignment: "center" };
  const end: ToastProps = { alignment: "end" };

  expect(start.alignment).toBe("start");
  expect(center.alignment).toBe("center");
  expect(end.alignment).toBe("end");
});

test("Breadcrumbs type structure with all props", () => {
  const props: BreadcrumbsProps = {
    size: "md",
    class: "custom",
    children: "Breadcrumbs content",
  };
  expect(props.size).toBe("md");
});

test("Breadcrumbs with size options", () => {
  const sm: BreadcrumbsProps = { size: "sm" };
  const md: BreadcrumbsProps = { size: "md" };
  const lg: BreadcrumbsProps = { size: "lg" };

  expect(sm.size).toBe("sm");
  expect(md.size).toBe("md");
  expect(lg.size).toBe("lg");
});
