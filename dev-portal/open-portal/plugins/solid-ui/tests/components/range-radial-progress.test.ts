import { expect, test } from "vite-plus/test";
import { Range, type RangeProps } from "../../src/components/Range";
import { RadialProgress, type RadialProgressProps } from "../../src/components/RadialProgress";

test("Range type structure with all props", () => {
  const props: RangeProps = {
    min: 0,
    max: 100,
    value: 50,
    step: 1,
    size: "md",
    color: "primary",
    disabled: false,
    class: "custom",
  };
  expect(props.min).toBe(0);
  expect(props.max).toBe(100);
  expect(props.value).toBe(50);
  expect(props.step).toBe(1);
  expect(props.size).toBe("md");
  expect(props.color).toBe("primary");
  expect(props.disabled).toBe(false);
});

test("Range with different value ranges", () => {
  const zero: RangeProps = { value: 0 };
  const half: RangeProps = { value: 50 };
  const max: RangeProps = { value: 100 };

  expect(zero.value).toBe(0);
  expect(half.value).toBe(50);
  expect(max.value).toBe(100);
});

test("Range with different min/max", () => {
  const small: RangeProps = { min: 0, max: 10 };
  const medium: RangeProps = { min: 0, max: 100 };
  const large: RangeProps = { min: 0, max: 1000 };

  expect(small.max).toBe(10);
  expect(medium.max).toBe(100);
  expect(large.max).toBe(1000);
});

test("Range with step options", () => {
  const unit: RangeProps = { step: 1 };
  const five: RangeProps = { step: 5 };
  const ten: RangeProps = { step: 10 };

  expect(unit.step).toBe(1);
  expect(five.step).toBe(5);
  expect(ten.step).toBe(10);
});

test("Range with size options", () => {
  const xs: RangeProps = { size: "xs" };
  const sm: RangeProps = { size: "sm" };
  const md: RangeProps = { size: "md" };
  const lg: RangeProps = { size: "lg" };
  const xl: RangeProps = { size: "xl" };

  expect(xs.size).toBe("xs");
  expect(sm.size).toBe("sm");
  expect(md.size).toBe("md");
  expect(lg.size).toBe("lg");
  expect(xl.size).toBe("xl");
});

test("Range with color options", () => {
  const primary: RangeProps = { color: "primary" };
  const secondary: RangeProps = { color: "secondary" };
  const accent: RangeProps = { color: "accent" };
  const success: RangeProps = { color: "success" };

  expect(primary.color).toBe("primary");
  expect(secondary.color).toBe("secondary");
  expect(accent.color).toBe("accent");
  expect(success.color).toBe("success");
});

test("Range states", () => {
  const enabled: RangeProps = { disabled: false };
  const disabled: RangeProps = { disabled: true };

  expect(enabled.disabled).toBe(false);
  expect(disabled.disabled).toBe(true);
});

test("RadialProgress type structure with all props", () => {
  const props: RadialProgressProps = {
    value: 75,
    max: 100,
    size: "md",
    thickness: "normal",
    color: "primary",
    class: "custom",
  };
  expect(props.value).toBe(75);
  expect(props.max).toBe(100);
  expect(props.size).toBe("md");
  expect(props.thickness).toBe("normal");
  expect(props.color).toBe("primary");
});

test("RadialProgress with different values", () => {
  const empty: RadialProgressProps = { value: 0 };
  const quarter: RadialProgressProps = { value: 25 };
  const half: RadialProgressProps = { value: 50 };
  const full: RadialProgressProps = { value: 100 };

  expect(empty.value).toBe(0);
  expect(quarter.value).toBe(25);
  expect(half.value).toBe(50);
  expect(full.value).toBe(100);
});

test("RadialProgress with size options", () => {
  const sm: RadialProgressProps = { size: "sm" };
  const md: RadialProgressProps = { size: "md" };
  const lg: RadialProgressProps = { size: "lg" };
  const xl: RadialProgressProps = { size: "xl" };

  expect(sm.size).toBe("sm");
  expect(md.size).toBe("md");
  expect(lg.size).toBe("lg");
  expect(xl.size).toBe("xl");
});

test("RadialProgress with thickness options", () => {
  const thin: RadialProgressProps = { thickness: "thin" };
  const normal: RadialProgressProps = { thickness: "normal" };
  const thick: RadialProgressProps = { thickness: "thick" };

  expect(thin.thickness).toBe("thin");
  expect(normal.thickness).toBe("normal");
  expect(thick.thickness).toBe("thick");
});

test("RadialProgress with color options", () => {
  const primary: RadialProgressProps = { color: "primary" };
  const success: RadialProgressProps = { color: "success" };
  const warning: RadialProgressProps = { color: "warning" };
  const error: RadialProgressProps = { color: "error" };

  expect(primary.color).toBe("primary");
  expect(success.color).toBe("success");
  expect(warning.color).toBe("warning");
  expect(error.color).toBe("error");
});
