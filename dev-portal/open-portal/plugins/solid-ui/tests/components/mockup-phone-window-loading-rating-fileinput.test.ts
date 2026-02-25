import { expect, test } from "vite-plus/test";
import { MockupPhone, type MockupPhoneProps } from "../../src/components/MockupPhone";
import { MockupWindow, type MockupWindowProps } from "../../src/components/MockupWindow";
import { Loading, type LoadingProps } from "../../src/components/Loading";
import { Rating, type RatingProps } from "../../src/components/Rating";
import { FileInput, type FileInputProps } from "../../src/components/FileInput";

test("MockupPhone type structure with all props", () => {
  const props: MockupPhoneProps = {
    bezel: "black",
    class: "custom",
    children: "Phone content",
  };
  expect(props.bezel).toBe("black");
});

test("MockupPhone with bezel options", () => {
  const black: MockupPhoneProps = { bezel: "black" };
  const white: MockupPhoneProps = { bezel: "white" };

  expect(black.bezel).toBe("black");
  expect(white.bezel).toBe("white");
});

test("MockupWindow type structure with all props", () => {
  const props: MockupWindowProps = {
    title: "Window Title",
    class: "custom",
    children: "Window content",
  };
  expect(props.title).toBe("Window Title");
});

test("MockupWindow with different titles", () => {
  const editor: MockupWindowProps = { title: "Code Editor" };
  const browser: MockupWindowProps = { title: "Browser" };
  const terminal: MockupWindowProps = { title: "Terminal" };

  expect(editor.title).toBe("Code Editor");
  expect(browser.title).toBe("Browser");
  expect(terminal.title).toBe("Terminal");
});

test("Loading type structure with all props", () => {
  const props: LoadingProps = {
    variant: "spinner",
    size: "md",
    color: "primary",
    class: "custom",
  };
  expect(props.variant).toBe("spinner");
  expect(props.size).toBe("md");
  expect(props.color).toBe("primary");
});

test("Loading with variant options", () => {
  const spinner: LoadingProps = { variant: "spinner" };
  const dots: LoadingProps = { variant: "dots" };
  const bars: LoadingProps = { variant: "bars" };
  const ring: LoadingProps = { variant: "ring" };

  expect(spinner.variant).toBe("spinner");
  expect(dots.variant).toBe("dots");
  expect(bars.variant).toBe("bars");
  expect(ring.variant).toBe("ring");
});

test("Loading with size options", () => {
  const xs: LoadingProps = { size: "xs" };
  const sm: LoadingProps = { size: "sm" };
  const md: LoadingProps = { size: "md" };
  const lg: LoadingProps = { size: "lg" };
  const xl: LoadingProps = { size: "xl" };

  expect(xs.size).toBe("xs");
  expect(sm.size).toBe("sm");
  expect(md.size).toBe("md");
  expect(lg.size).toBe("lg");
  expect(xl.size).toBe("xl");
});

test("Loading with color options", () => {
  const primary: LoadingProps = { color: "primary" };
  const secondary: LoadingProps = { color: "secondary" };
  const accent: LoadingProps = { color: "accent" };
  const success: LoadingProps = { color: "success" };

  expect(primary.color).toBe("primary");
  expect(secondary.color).toBe("secondary");
  expect(accent.color).toBe("accent");
  expect(success.color).toBe("success");
});

test("Rating type structure with all props", () => {
  const props: RatingProps = {
    value: 4,
    max: 5,
    readonly: false,
    size: "md",
    color: "primary",
    class: "custom",
  };
  expect(props.value).toBe(4);
  expect(props.max).toBe(5);
  expect(props.readonly).toBe(false);
  expect(props.size).toBe("md");
  expect(props.color).toBe("primary");
});

test("Rating with different values", () => {
  const one: RatingProps = { value: 1 };
  const three: RatingProps = { value: 3 };
  const five: RatingProps = { value: 5 };

  expect(one.value).toBe(1);
  expect(three.value).toBe(3);
  expect(five.value).toBe(5);
});

test("Rating states", () => {
  const interactive: RatingProps = { readonly: false };
  const readonly: RatingProps = { readonly: true };

  expect(interactive.readonly).toBe(false);
  expect(readonly.readonly).toBe(true);
});

test("Rating with size options", () => {
  const sm: RatingProps = { size: "sm" };
  const md: RatingProps = { size: "md" };
  const lg: RatingProps = { size: "lg" };

  expect(sm.size).toBe("sm");
  expect(md.size).toBe("md");
  expect(lg.size).toBe("lg");
});

test("FileInput type structure with all props", () => {
  const props: FileInputProps = {
    accept: ".pdf,.doc",
    multiple: false,
    disabled: false,
    class: "custom",
  };
  expect(props.accept).toBe(".pdf,.doc");
  expect(props.multiple).toBe(false);
  expect(props.disabled).toBe(false);
});

test("FileInput states", () => {
  const single: FileInputProps = { multiple: false };
  const multiple: FileInputProps = { multiple: true };

  expect(single.multiple).toBe(false);
  expect(multiple.multiple).toBe(true);
});

test("FileInput with accept options", () => {
  const images: FileInputProps = { accept: ".jpg,.png,.gif" };
  const documents: FileInputProps = { accept: ".pdf,.doc,.docx" };
  const all: FileInputProps = { accept: "*" };

  expect(images.accept).toBe(".jpg,.png,.gif");
  expect(documents.accept).toBe(".pdf,.doc,.docx");
  expect(all.accept).toBe("*");
});
