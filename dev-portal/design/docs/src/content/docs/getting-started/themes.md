---
title: Themes
description: Switching and customizing themes
---

## Built-in themes

Staccato ships with several themes out of the box. Apply a theme by setting `data-theme` on any
ancestor element — typically `<html>` or `<body>`.

```html
<html data-theme="dark">
  ...
</html>
```

| Theme     | Description                              |
| --------- | ---------------------------------------- |
| `light`   | High-contrast light background           |
| `dark`    | Deep dark background with muted surfaces |
| `dim`     | Softer dark, less contrast               |
| `nord`    | Cool blue-grey palette                   |
| `dracula` | Purple-accented dark theme               |

## Runtime switching

Set the `data-theme` attribute in JavaScript to switch themes without a page reload:

```typescript
document.documentElement.setAttribute("data-theme", "dracula");
```

## Custom themes

Define a theme using CSS custom properties inside a `[data-theme="my-theme"]` selector. All
semantic tokens must be provided for the theme to render correctly.

```css
[data-theme="brand"] {
  --color-surface-0: oklch(0.18 0.02 250);
  --color-surface-1: oklch(0.22 0.02 250);
  --color-theme: oklch(0.92 0.01 250);
  --color-primary: oklch(0.65 0.18 30);
  /* ... remaining tokens */
}
```
