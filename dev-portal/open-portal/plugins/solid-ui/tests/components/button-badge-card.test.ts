import { expect, test } from "vite-plus/test";
import { Button, type ButtonProps } from "../../src/components/Button";
import { Badge, type BadgeProps } from "../../src/components/Badge";
import { Card, type CardProps } from "../../src/components/Card";

test("Button type structure with all props", () => {
  const props: ButtonProps = {
    color: "primary",
    size: "lg",
    variant: "outline",
    shape: "circle",
    disabled: false,
    block: true,
    class: "custom",
    children: "Click me",
  };
  expect(props.color).toBe("primary");
  expect(props.size).toBe("lg");
  expect(props.variant).toBe("outline");
  expect(props.shape).toBe("circle");
  expect(props.disabled).toBe(false);
  expect(props.block).toBe(true);
});

test("Button with variant options", () => {
  const solid: ButtonProps = { variant: "solid" };
  const outline: ButtonProps = { variant: "outline" };
  const ghost: ButtonProps = { variant: "ghost" };
  const link: ButtonProps = { variant: "link" };

  expect(solid.variant).toBe("solid");
  expect(outline.variant).toBe("outline");
  expect(ghost.variant).toBe("ghost");
  expect(link.variant).toBe("link");
});

test("Button with size options", () => {
  const xs: ButtonProps = { size: "xs" };
  const sm: ButtonProps = { size: "sm" };
  const md: ButtonProps = { size: "md" };
  const lg: ButtonProps = { size: "lg" };
  const xl: ButtonProps = { size: "xl" };

  expect(xs.size).toBe("xs");
  expect(sm.size).toBe("sm");
  expect(md.size).toBe("md");
  expect(lg.size).toBe("lg");
  expect(xl.size).toBe("xl");
});

test("Button with color options", () => {
  const primary: ButtonProps = { color: "primary" };
  const secondary: ButtonProps = { color: "secondary" };
  const accent: ButtonProps = { color: "accent" };
  const warning: ButtonProps = { color: "warning" };
  const error: ButtonProps = { color: "error" };
  const green: ButtonProps = { color: "green" };

  expect(primary.color).toBe("primary");
  expect(secondary.color).toBe("secondary");
  expect(accent.color).toBe("accent");
  expect(warning.color).toBe("warning");
  expect(error.color).toBe("error");
  expect(green.color).toBe("green");
});

test("Button with shape options", () => {
  const defaultShape: ButtonProps = { shape: "default" };
  const circle: ButtonProps = { shape: "circle" };
  const square: ButtonProps = { shape: "square" };

  expect(defaultShape.shape).toBe("default");
  expect(circle.shape).toBe("circle");
  expect(square.shape).toBe("square");
});

test("Badge type structure with all props", () => {
  const props: BadgeProps = {
    color: "primary",
    size: "md",
    outline: false,
    class: "custom",
    children: "Badge",
  };
  expect(props.color).toBe("primary");
  expect(props.size).toBe("md");
  expect(props.outline).toBe(false);
});

test("Badge with size options", () => {
  const xs: BadgeProps = { size: "xs" };
  const sm: BadgeProps = { size: "sm" };
  const md: BadgeProps = { size: "md" };
  const lg: BadgeProps = { size: "lg" };

  expect(xs.size).toBe("xs");
  expect(sm.size).toBe("sm");
  expect(md.size).toBe("md");
  expect(lg.size).toBe("lg");
});

test("Badge with color options", () => {
  const primary: BadgeProps = { color: "primary" };
  const secondary: BadgeProps = { color: "secondary" };
  const accent: BadgeProps = { color: "accent" };
  const warning: BadgeProps = { color: "warning" };
  const error: BadgeProps = { color: "error" };
  const green: BadgeProps = { color: "green" };

  expect(primary.color).toBe("primary");
  expect(secondary.color).toBe("secondary");
  expect(accent.color).toBe("accent");
  expect(warning.color).toBe("warning");
  expect(error.color).toBe("error");
  expect(green.color).toBe("green");
});

test("Badge with outline", () => {
  const outlined: BadgeProps = { outline: true };
  const solid: BadgeProps = { outline: false };

  expect(outlined.outline).toBe(true);
  expect(solid.outline).toBe(false);
});

test("Card type structure with all props", () => {
  const props: CardProps = {
    class: "custom",
    children: "Card content",
  };
  expect(props.class).toBe("custom");
});
