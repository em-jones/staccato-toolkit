import { expect, test } from "vite-plus/test";
import {
  Input,
  type InputProps,
  Textarea,
  type TextareaProps,
  Select,
  type SelectProps,
  Checkbox,
  type CheckboxProps,
  Toggle,
  type ToggleProps,
} from "../../src/components/Input";
import { Tabs, type TabsProps } from "../../src/components/Tabs";

test("Input type structure with all props", () => {
  const props: InputProps = {
    placeholder: "Enter text",
    value: "test",
    disabled: false,
    readonly: false,
    class: "custom",
  };
  expect(props.placeholder).toBe("Enter text");
  expect(props.value).toBe("test");
  expect(props.disabled).toBe(false);
  expect(props.readonly).toBe(false);
});

test("Input with various states", () => {
  const enabled: InputProps = { disabled: false };
  const disabled: InputProps = { disabled: true };
  const readOnly: InputProps = { readonly: true };

  expect(enabled.disabled).toBe(false);
  expect(disabled.disabled).toBe(true);
  expect(readOnly.readonly).toBe(true);
});

test("Textarea type structure with all props", () => {
  const props: TextareaProps = {
    placeholder: "Enter text",
    value: "multiline text",
    disabled: false,
    readonly: false,
    rows: 5,
    class: "custom",
  };
  expect(props.placeholder).toBe("Enter text");
  expect(props.value).toBe("multiline text");
  expect(props.rows).toBe(5);
});

test("Select type structure with all props", () => {
  const props: SelectProps = {
    placeholder: "Select option",
    value: "option1",
    disabled: false,
    class: "custom",
  };
  expect(props.placeholder).toBe("Select option");
  expect(props.value).toBe("option1");
  expect(props.disabled).toBe(false);
});

test("Checkbox type structure with all props", () => {
  const props: CheckboxProps = {
    checked: false,
    disabled: false,
    class: "custom",
  };
  expect(props.checked).toBe(false);
  expect(props.disabled).toBe(false);
});

test("Checkbox states", () => {
  const checked: CheckboxProps = { checked: true };
  const unchecked: CheckboxProps = { checked: false };
  const disabled: CheckboxProps = { disabled: true };

  expect(checked.checked).toBe(true);
  expect(unchecked.checked).toBe(false);
  expect(disabled.disabled).toBe(true);
});

test("Toggle type structure with all props", () => {
  const props: ToggleProps = {
    checked: false,
    disabled: false,
    class: "custom",
  };
  expect(props.checked).toBe(false);
  expect(props.disabled).toBe(false);
});

test("Toggle states", () => {
  const enabled: ToggleProps = { checked: true };
  const disabled: ToggleProps = { checked: false, disabled: true };

  expect(enabled.checked).toBe(true);
  expect(disabled.disabled).toBe(true);
});

test("Tabs type structure with all props", () => {
  const props: TabsProps = {
    defaultValue: "tab1",
    value: "tab2",
    class: "custom",
  };
  expect(props.defaultValue).toBe("tab1");
  expect(props.value).toBe("tab2");
});

test("Tabs with different values", () => {
  const tab1: TabsProps = { defaultValue: "tab1" };
  const tab2: TabsProps = { value: "tab2" };
  const controlled: TabsProps = { value: "tab3" };

  expect(tab1.defaultValue).toBe("tab1");
  expect(tab2.value).toBe("tab2");
  expect(controlled.value).toBe("tab3");
});
