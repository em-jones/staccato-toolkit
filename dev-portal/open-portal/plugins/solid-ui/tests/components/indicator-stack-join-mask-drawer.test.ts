import { expect, test } from "vite-plus/test";
import { Indicator, type IndicatorProps } from "../../src/components/Indicator";
import { Stack, type StackProps } from "../../src/components/Stack";
import { Join, type JoinProps } from "../../src/components/Join";
import { Mask, type MaskProps } from "../../src/components/Mask";
import { Drawer, type DrawerProps } from "../../src/components/Drawer";

test("Indicator type structure with all props", () => {
  const props: IndicatorProps = {
    position: "top-right",
    alignment: "center",
    variant: "primary",
    class: "custom",
    children: "Content",
  };
  expect(props.position).toBe("top-right");
  expect(props.alignment).toBe("center");
  expect(props.variant).toBe("primary");
});

test("Indicator with position options", () => {
  const topLeft: IndicatorProps = { position: "top-left" };
  const topRight: IndicatorProps = { position: "top-right" };
  const bottomLeft: IndicatorProps = { position: "bottom-left" };
  const bottomRight: IndicatorProps = { position: "bottom-right" };

  expect(topLeft.position).toBe("top-left");
  expect(topRight.position).toBe("top-right");
  expect(bottomLeft.position).toBe("bottom-left");
  expect(bottomRight.position).toBe("bottom-right");
});

test("Indicator with alignment options", () => {
  const start: IndicatorProps = { alignment: "start" };
  const center: IndicatorProps = { alignment: "center" };
  const end: IndicatorProps = { alignment: "end" };

  expect(start.alignment).toBe("start");
  expect(center.alignment).toBe("center");
  expect(end.alignment).toBe("end");
});

test("Indicator with variant options", () => {
  const primary: IndicatorProps = { variant: "primary" };
  const success: IndicatorProps = { variant: "success" };
  const warning: IndicatorProps = { variant: "warning" };
  const error: IndicatorProps = { variant: "error" };

  expect(primary.variant).toBe("primary");
  expect(success.variant).toBe("success");
  expect(warning.variant).toBe("warning");
  expect(error.variant).toBe("error");
});

test("Stack type structure with all props", () => {
  const props: StackProps = {
    direction: "row",
    gap: "md",
    alignment: "center",
    justify: "between",
    class: "custom",
    children: "Stack content",
  };
  expect(props.direction).toBe("row");
  expect(props.gap).toBe("md");
  expect(props.alignment).toBe("center");
  expect(props.justify).toBe("between");
});

test("Stack with direction options", () => {
  const row: StackProps = { direction: "row" };
  const column: StackProps = { direction: "column" };

  expect(row.direction).toBe("row");
  expect(column.direction).toBe("column");
});

test("Stack with gap options", () => {
  const xs: StackProps = { gap: "xs" };
  const sm: StackProps = { gap: "sm" };
  const md: StackProps = { gap: "md" };
  const lg: StackProps = { gap: "lg" };

  expect(xs.gap).toBe("xs");
  expect(sm.gap).toBe("sm");
  expect(md.gap).toBe("md");
  expect(lg.gap).toBe("lg");
});

test("Stack with alignment options", () => {
  const start: StackProps = { alignment: "start" };
  const center: StackProps = { alignment: "center" };
  const end: StackProps = { alignment: "end" };
  const stretch: StackProps = { alignment: "stretch" };

  expect(start.alignment).toBe("start");
  expect(center.alignment).toBe("center");
  expect(end.alignment).toBe("end");
  expect(stretch.alignment).toBe("stretch");
});

test("Stack with justify options", () => {
  const start: StackProps = { justify: "start" };
  const center: StackProps = { justify: "center" };
  const end: StackProps = { justify: "end" };
  const between: StackProps = { justify: "between" };

  expect(start.justify).toBe("start");
  expect(center.justify).toBe("center");
  expect(end.justify).toBe("end");
  expect(between.justify).toBe("between");
});

test("Join type structure with all props", () => {
  const props: JoinProps = {
    direction: "horizontal",
    class: "custom",
    children: "Join items",
  };
  expect(props.direction).toBe("horizontal");
});

test("Join with direction options", () => {
  const horizontal: JoinProps = { direction: "horizontal" };
  const vertical: JoinProps = { direction: "vertical" };

  expect(horizontal.direction).toBe("horizontal");
  expect(vertical.direction).toBe("vertical");
});

test("Mask type structure with all props", () => {
  const props: MaskProps = {
    shape: "circle",
    class: "custom",
    children: "Masked content",
  };
  expect(props.shape).toBe("circle");
});

test("Mask with shape options", () => {
  const circle: MaskProps = { shape: "circle" };
  const square: MaskProps = { shape: "square" };
  const rounded: MaskProps = { shape: "rounded" };

  expect(circle.shape).toBe("circle");
  expect(square.shape).toBe("square");
  expect(rounded.shape).toBe("rounded");
});

test("Drawer type structure with all props", () => {
  const props: DrawerProps = {
    open: false,
    side: "left",
    size: "md",
    class: "custom",
    children: "Drawer content",
  };
  expect(props.open).toBe(false);
  expect(props.side).toBe("left");
  expect(props.size).toBe("md");
});

test("Drawer states", () => {
  const open: DrawerProps = { open: true };
  const closed: DrawerProps = { open: false };

  expect(open.open).toBe(true);
  expect(closed.open).toBe(false);
});

test("Drawer with side options", () => {
  const left: DrawerProps = { side: "left" };
  const right: DrawerProps = { side: "right" };

  expect(left.side).toBe("left");
  expect(right.side).toBe("right");
});

test("Drawer with size options", () => {
  const sm: DrawerProps = { size: "sm" };
  const md: DrawerProps = { size: "md" };
  const lg: DrawerProps = { size: "lg" };

  expect(sm.size).toBe("sm");
  expect(md.size).toBe("md");
  expect(lg.size).toBe("lg");
});
