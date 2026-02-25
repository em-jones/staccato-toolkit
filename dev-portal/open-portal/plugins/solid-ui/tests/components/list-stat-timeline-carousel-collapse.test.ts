import { expect, test } from "vite-plus/test";
import { List, type ListProps } from "../../src/components/List";
import { Stat, type StatProps } from "../../src/components/Stat";
import { Timeline, type TimelineProps } from "../../src/components/Timeline";
import { Carousel, type CarouselProps } from "../../src/components/Carousel";
import { Collapse, type CollapseProps } from "../../src/components/Collapse";

test("List type structure with all props", () => {
  const props: ListProps = {
    class: "custom",
    children: "List items",
  };
  expect(props.class).toBe("custom");
});

test("Stat type structure with all props", () => {
  const props: StatProps = {
    title: "Stat Title",
    value: "42",
    description: "Stat description",
    class: "custom",
  };
  expect(props.title).toBe("Stat Title");
  expect(props.value).toBe("42");
  expect(props.description).toBe("Stat description");
});

test("Stat with different values", () => {
  const numeric: StatProps = { value: "100" };
  const percentage: StatProps = { value: "75%" };
  const text: StatProps = { value: "Active" };

  expect(numeric.value).toBe("100");
  expect(percentage.value).toBe("75%");
  expect(text.value).toBe("Active");
});

test("Timeline type structure with all props", () => {
  const props: TimelineProps = {
    vertical: true,
    class: "custom",
    children: "Timeline content",
  };
  expect(props.vertical).toBe(true);
});

test("Timeline with orientation options", () => {
  const vertical: TimelineProps = { vertical: true };
  const horizontal: TimelineProps = { vertical: false };

  expect(vertical.vertical).toBe(true);
  expect(horizontal.vertical).toBe(false);
});

test("Carousel type structure with all props", () => {
  const props: CarouselProps = {
    autoplay: true,
    interval: 3000,
    indicators: true,
    class: "custom",
    children: "Carousel content",
  };
  expect(props.autoplay).toBe(true);
  expect(props.interval).toBe(3000);
  expect(props.indicators).toBe(true);
});

test("Carousel states", () => {
  const autoplay: CarouselProps = { autoplay: true };
  const manual: CarouselProps = { autoplay: false };
  const withIndicators: CarouselProps = { indicators: true };
  const withoutIndicators: CarouselProps = { indicators: false };

  expect(autoplay.autoplay).toBe(true);
  expect(manual.autoplay).toBe(false);
  expect(withIndicators.indicators).toBe(true);
  expect(withoutIndicators.indicators).toBe(false);
});

test("Carousel with different intervals", () => {
  const fast: CarouselProps = { interval: 1000 };
  const medium: CarouselProps = { interval: 3000 };
  const slow: CarouselProps = { interval: 5000 };

  expect(fast.interval).toBe(1000);
  expect(medium.interval).toBe(3000);
  expect(slow.interval).toBe(5000);
});

test("Collapse type structure with all props", () => {
  const props: CollapseProps = {
    title: "Collapse Title",
    open: false,
    class: "custom",
    children: "Collapse content",
  };
  expect(props.title).toBe("Collapse Title");
  expect(props.open).toBe(false);
});

test("Collapse states", () => {
  const open: CollapseProps = { open: true };
  const closed: CollapseProps = { open: false };

  expect(open.open).toBe(true);
  expect(closed.open).toBe(false);
});

test("Collapse with different titles", () => {
  const section1: CollapseProps = { title: "Section 1" };
  const section2: CollapseProps = { title: "Section 2" };
  const section3: CollapseProps = { title: "Section 3" };

  expect(section1.title).toBe("Section 1");
  expect(section2.title).toBe("Section 2");
  expect(section3.title).toBe("Section 3");
});
