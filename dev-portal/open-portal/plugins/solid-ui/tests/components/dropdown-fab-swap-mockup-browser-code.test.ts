import { expect, test } from "vite-plus/test";
import { Dropdown, type DropdownProps } from "../../src/components/Dropdown";
import { Fab, type FabProps } from "../../src/components/Fab";
import { Swap, type SwapProps } from "../../src/components/Swap";
import { MockupBrowser, type MockupBrowserProps } from "../../src/components/MockupBrowser";
import { MockupCode, type MockupCodeProps } from "../../src/components/MockupCode";

test("Dropdown type structure with all props", () => {
  const props: DropdownProps = {
    class: "custom",
    children: "Dropdown items",
  };
  expect(props.class).toBe("custom");
});

test("Fab type structure with all props", () => {
  const props: FabProps = {
    position: "bottom-right",
    size: "lg",
    color: "primary",
    class: "custom",
    children: "Action",
  };
  expect(props.position).toBe("bottom-right");
  expect(props.size).toBe("lg");
  expect(props.color).toBe("primary");
});

test("Fab with position options", () => {
  const topLeft: FabProps = { position: "top-left" };
  const topRight: FabProps = { position: "top-right" };
  const bottomLeft: FabProps = { position: "bottom-left" };
  const bottomRight: FabProps = { position: "bottom-right" };

  expect(topLeft.position).toBe("top-left");
  expect(topRight.position).toBe("top-right");
  expect(bottomLeft.position).toBe("bottom-left");
  expect(bottomRight.position).toBe("bottom-right");
});

test("Fab with size options", () => {
  const sm: FabProps = { size: "sm" };
  const md: FabProps = { size: "md" };
  const lg: FabProps = { size: "lg" };
  const xl: FabProps = { size: "xl" };

  expect(sm.size).toBe("sm");
  expect(md.size).toBe("md");
  expect(lg.size).toBe("lg");
  expect(xl.size).toBe("xl");
});

test("Fab with color options", () => {
  const primary: FabProps = { color: "primary" };
  const secondary: FabProps = { color: "secondary" };
  const accent: FabProps = { color: "accent" };
  const success: FabProps = { color: "success" };

  expect(primary.color).toBe("primary");
  expect(secondary.color).toBe("secondary");
  expect(accent.color).toBe("accent");
  expect(success.color).toBe("success");
});

test("Swap type structure with all props", () => {
  const props: SwapProps = {
    rotate: false,
    flip: true,
    active: false,
    class: "custom",
    children: "Swap content",
  };
  expect(props.rotate).toBe(false);
  expect(props.flip).toBe(true);
  expect(props.active).toBe(false);
});

test("Swap with transformation options", () => {
  const rotated: SwapProps = { rotate: true };
  const flipped: SwapProps = { flip: true };
  const both: SwapProps = { rotate: true, flip: true };

  expect(rotated.rotate).toBe(true);
  expect(flipped.flip).toBe(true);
  expect(both.rotate).toBe(true);
  expect(both.flip).toBe(true);
});

test("Swap with active states", () => {
  const active: SwapProps = { active: true };
  const inactive: SwapProps = { active: false };

  expect(active.active).toBe(true);
  expect(inactive.active).toBe(false);
});

test("MockupBrowser type structure with all props", () => {
  const props: MockupBrowserProps = {
    title: "Browser Title",
    url: "https://example.com",
    class: "custom",
    children: "Browser content",
  };
  expect(props.title).toBe("Browser Title");
  expect(props.url).toBe("https://example.com");
});

test("MockupBrowser with different URLs", () => {
  const local: MockupBrowserProps = { url: "http://localhost:3000" };
  const https: MockupBrowserProps = { url: "https://example.com" };
  const path: MockupBrowserProps = { url: "/dashboard" };

  expect(local.url).toBe("http://localhost:3000");
  expect(https.url).toBe("https://example.com");
  expect(path.url).toBe("/dashboard");
});

test("MockupCode type structure with all props", () => {
  const props: MockupCodeProps = {
    language: "typescript",
    class: "custom",
    children: "Code content",
  };
  expect(props.language).toBe("typescript");
});

test("MockupCode with language options", () => {
  const js: MockupCodeProps = { language: "javascript" };
  const ts: MockupCodeProps = { language: "typescript" };
  const python: MockupCodeProps = { language: "python" };
  const bash: MockupCodeProps = { language: "bash" };

  expect(js.language).toBe("javascript");
  expect(ts.language).toBe("typescript");
  expect(python.language).toBe("python");
  expect(bash.language).toBe("bash");
});
