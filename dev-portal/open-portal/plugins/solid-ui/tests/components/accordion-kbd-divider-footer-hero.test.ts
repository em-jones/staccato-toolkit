import { expect, test } from "vite-plus/test";
import { Accordion, type AccordionProps } from "../../src/components/Accordion";
import { Kbd, type KbdProps } from "../../src/components/Kbd";
import { Divider, type DividerProps } from "../../src/components/Divider";
import { Footer, type FooterProps } from "../../src/components/Footer";
import { Hero, type HeroProps } from "../../src/components/Hero";

test("Accordion type structure with all props", () => {
  const props: AccordionProps = {
    defaultValue: "item1",
    value: "item2",
    multiple: false,
    class: "custom",
    children: "Accordion items",
  };
  expect(props.defaultValue).toBe("item1");
  expect(props.value).toBe("item2");
  expect(props.multiple).toBe(false);
});

test("Accordion with single and multiple selection", () => {
  const single: AccordionProps = { multiple: false };
  const multiple: AccordionProps = { multiple: true };

  expect(single.multiple).toBe(false);
  expect(multiple.multiple).toBe(true);
});

test("Accordion with different values", () => {
  const item1: AccordionProps = { value: "item1" };
  const item2: AccordionProps = { value: "item2" };
  const item3: AccordionProps = { value: "item3" };

  expect(item1.value).toBe("item1");
  expect(item2.value).toBe("item2");
  expect(item3.value).toBe("item3");
});

test("Kbd type structure with all props", () => {
  const props: KbdProps = {
    size: "md",
    class: "custom",
    children: "Ctrl",
  };
  expect(props.size).toBe("md");
});

test("Kbd with size options", () => {
  const sm: KbdProps = { size: "sm" };
  const md: KbdProps = { size: "md" };
  const lg: KbdProps = { size: "lg" };

  expect(sm.size).toBe("sm");
  expect(md.size).toBe("md");
  expect(lg.size).toBe("lg");
});

test("Divider type structure with all props", () => {
  const props: DividerProps = {
    direction: "horizontal",
    class: "custom",
  };
  expect(props.direction).toBe("horizontal");
});

test("Divider with direction options", () => {
  const horizontal: DividerProps = { direction: "horizontal" };
  const vertical: DividerProps = { direction: "vertical" };

  expect(horizontal.direction).toBe("horizontal");
  expect(vertical.direction).toBe("vertical");
});

test("Footer type structure with all props", () => {
  const props: FooterProps = {
    class: "custom",
    children: "Footer content",
  };
  expect(props.class).toBe("custom");
});

test("Hero type structure with all props", () => {
  const props: HeroProps = {
    backgroundImage: "https://example.com/bg.jpg",
    overlay: true,
    class: "custom",
    children: "Hero content",
  };
  expect(props.backgroundImage).toBe("https://example.com/bg.jpg");
  expect(props.overlay).toBe(true);
});

test("Hero with overlay options", () => {
  const withOverlay: HeroProps = { overlay: true };
  const withoutOverlay: HeroProps = { overlay: false };

  expect(withOverlay.overlay).toBe(true);
  expect(withoutOverlay.overlay).toBe(false);
});

test("Hero with different background images", () => {
  const image1: HeroProps = { backgroundImage: "https://example.com/bg1.jpg" };
  const image2: HeroProps = { backgroundImage: "https://example.com/bg2.jpg" };

  expect(image1.backgroundImage).toBe("https://example.com/bg1.jpg");
  expect(image2.backgroundImage).toBe("https://example.com/bg2.jpg");
});
