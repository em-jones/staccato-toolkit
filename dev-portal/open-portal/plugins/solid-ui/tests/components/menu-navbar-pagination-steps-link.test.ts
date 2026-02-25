import { expect, test } from "vite-plus/test";
import { Menu, type MenuProps } from "../../src/components/Menu";
import { Navbar, type NavbarProps } from "../../src/components/Navbar";
import { Pagination, type PaginationProps } from "../../src/components/Pagination";
import { Steps, type StepsProps } from "../../src/components/Steps";
import { Link, type LinkProps } from "../../src/components/Link";

test("Menu type structure with all props", () => {
  const props: MenuProps = {
    class: "custom",
    children: "Menu items",
  };
  expect(props.class).toBe("custom");
});

test("Navbar type structure with all props", () => {
  const props: NavbarProps = {
    class: "custom",
    children: "Navbar content",
  };
  expect(props.class).toBe("custom");
});

test("Pagination type structure with all props", () => {
  const props: PaginationProps = {
    class: "custom",
    children: "Pagination content",
  };
  expect(props.class).toBe("custom");
});

test("Steps type structure with all props", () => {
  const props: StepsProps = {
    step: 2,
    class: "custom",
    children: "Steps content",
  };
  expect(props.step).toBe(2);
});

test("Steps with different step values", () => {
  const step1: StepsProps = { step: 1 };
  const step2: StepsProps = { step: 2 };
  const step3: StepsProps = { step: 3 };

  expect(step1.step).toBe(1);
  expect(step2.step).toBe(2);
  expect(step3.step).toBe(3);
});

test("Link type structure with all props", () => {
  const props: LinkProps = {
    href: "/path",
    target: "_blank",
    rel: "noopener",
    class: "custom",
    children: "Click me",
  };
  expect(props.href).toBe("/path");
  expect(props.target).toBe("_blank");
  expect(props.rel).toBe("noopener");
});

test("Link with target options", () => {
  const self: LinkProps = { target: "_self" };
  const blank: LinkProps = { target: "_blank" };
  const parent: LinkProps = { target: "_parent" };
  const top: LinkProps = { target: "_top" };

  expect(self.target).toBe("_self");
  expect(blank.target).toBe("_blank");
  expect(parent.target).toBe("_parent");
  expect(top.target).toBe("_top");
});

test("Link with different href values", () => {
  const internal: LinkProps = { href: "/dashboard" };
  const external: LinkProps = { href: "https://example.com" };
  const hash: LinkProps = { href: "#section" };

  expect(internal.href).toBe("/dashboard");
  expect(external.href).toBe("https://example.com");
  expect(hash.href).toBe("#section");
});
