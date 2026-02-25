---
title: Overview
description: Introduction to the Staccato design system
---

## What is Staccato UI?

Staccato UI is a design system built on [Tailwind CSS v4](https://tailwindcss.com) with a custom
plugin that provides themeable, DaisyUI-style utility classes. Components are defined as CSS class
sets — no JavaScript component library required.

## Installation

Add the Tailwind plugin to your project:

```bash
pnpm add @op/tailwind-config
```

Then import it in your CSS:

```css
@import "tailwindcss";
@plugin "@oqa/tailwind-config";
```

## Design tokens

All visual properties are expressed as CSS custom properties. Override them per-theme using the
`[data-theme]` selector. See the [Themes](/getting-started/themes) page for available themes and how
to switch between them at runtime.

## Usage philosophy

- **Utility-first** — class names compose directly in markup, no JSX wrapper components.
- **Semantic tokens** — colors like `bg-surface-0`, `text-theme`, `border-theme` adapt to the active
  theme automatically.
- **No framework lock-in** — works with any framework that supports Tailwind, including SolidJS,
  React, Vue, and plain HTML.
