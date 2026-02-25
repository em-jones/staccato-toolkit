import { expect, test } from "vite-plus/test";
import { Alert, type AlertProps } from "../../src/components/Alert";
import { Modal, type ModalProps } from "../../src/components/Modal";
import { Avatar, type AvatarProps } from "../../src/components/Avatar";
import { Radio, type RadioProps } from "../../src/components/Radio";
import { Progress, type ProgressProps } from "../../src/components/Progress";

test("Alert type structure with all props", () => {
  const props: AlertProps = {
    variant: "info",
    class: "custom",
    children: "Alert message",
  };
  expect(props.variant).toBe("info");
  expect(props.class).toBe("custom");
});

test("Alert with variant options", () => {
  const info: AlertProps = { variant: "info" };
  const success: AlertProps = { variant: "success" };
  const warning: AlertProps = { variant: "warning" };
  const error: AlertProps = { variant: "error" };

  expect(info.variant).toBe("info");
  expect(success.variant).toBe("success");
  expect(warning.variant).toBe("warning");
  expect(error.variant).toBe("error");
});

test("Modal type structure with all props", () => {
  const props: ModalProps = {
    open: false,
    backdrop: false,
    class: "custom",
    children: "Modal content",
  };
  expect(props.open).toBe(false);
  expect(props.backdrop).toBe(false);
});

test("Modal states", () => {
  const open: ModalProps = { open: true };
  const closed: ModalProps = { open: false };
  const withBackdrop: ModalProps = { open: true, backdrop: true };

  expect(open.open).toBe(true);
  expect(closed.open).toBe(false);
  expect(withBackdrop.backdrop).toBe(true);
});

test("Avatar type structure with all props", () => {
  const props: AvatarProps = {
    src: "https://example.com/avatar.jpg",
    alt: "User Avatar",
    size: "md",
    class: "custom",
  };
  expect(props.src).toBe("https://example.com/avatar.jpg");
  expect(props.alt).toBe("User Avatar");
  expect(props.size).toBe("md");
});

test("Avatar with size options", () => {
  const xs: AvatarProps = { size: "xs" };
  const sm: AvatarProps = { size: "sm" };
  const md: AvatarProps = { size: "md" };
  const lg: AvatarProps = { size: "lg" };
  const xl: AvatarProps = { size: "xl" };

  expect(xs.size).toBe("xs");
  expect(sm.size).toBe("sm");
  expect(md.size).toBe("md");
  expect(lg.size).toBe("lg");
  expect(xl.size).toBe("xl");
});

test("Avatar with image", () => {
  const withImage: AvatarProps = {
    src: "https://example.com/avatar.jpg",
    alt: "Avatar",
  };
  const withPlaceholder: AvatarProps = { alt: "No image" };

  expect(withImage.src).toBe("https://example.com/avatar.jpg");
  expect(withPlaceholder.src).toBeUndefined();
});

test("Radio type structure with all props", () => {
  const props: RadioProps = {
    name: "options",
    value: "option1",
    checked: false,
    disabled: false,
    class: "custom",
  };
  expect(props.name).toBe("options");
  expect(props.value).toBe("option1");
  expect(props.checked).toBe(false);
  expect(props.disabled).toBe(false);
});

test("Radio states", () => {
  const checked: RadioProps = { value: "opt1", checked: true };
  const unchecked: RadioProps = { value: "opt2", checked: false };
  const disabled: RadioProps = { value: "opt3", disabled: true };

  expect(checked.checked).toBe(true);
  expect(unchecked.checked).toBe(false);
  expect(disabled.disabled).toBe(true);
});

test("Progress type structure with all props", () => {
  const props: ProgressProps = {
    value: 50,
    max: 100,
    color: "primary",
    size: "md",
    class: "custom",
  };
  expect(props.value).toBe(50);
  expect(props.max).toBe(100);
  expect(props.color).toBe("primary");
  expect(props.size).toBe("md");
});

test("Progress with various values", () => {
  const empty: ProgressProps = { value: 0 };
  const half: ProgressProps = { value: 50 };
  const full: ProgressProps = { value: 100 };

  expect(empty.value).toBe(0);
  expect(half.value).toBe(50);
  expect(full.value).toBe(100);
});

test("Progress with color options", () => {
  const primary: ProgressProps = { color: "primary" };
  const success: ProgressProps = { color: "success" };
  const warning: ProgressProps = { color: "warning" };
  const error: ProgressProps = { color: "error" };

  expect(primary.color).toBe("primary");
  expect(success.color).toBe("success");
  expect(warning.color).toBe("warning");
  expect(error.color).toBe("error");
});

test("Progress with size options", () => {
  const xs: ProgressProps = { size: "xs" };
  const sm: ProgressProps = { size: "sm" };
  const md: ProgressProps = { size: "md" };
  const lg: ProgressProps = { size: "lg" };

  expect(xs.size).toBe("xs");
  expect(sm.size).toBe("sm");
  expect(md.size).toBe("md");
  expect(lg.size).toBe("lg");
});
