# Design Spec: Hero Section, CTA Button & Navbar Login Button
**Date:** 2026-04-28  
**Status:** Approved

---

## Overview

Three targeted visual improvements to the SARI storefront homepage and navbar, based on a Figma reference showing:
- A geometric amber mosaic pattern in the hero background
- Extra-bold, larger hero heading typography
- A white-fill "Shop Now" CTA button with amber text
- A yellowish-gold Login button in the navbar

All changes are frontend-only, CSS/Tailwind-only. No API calls, routing, auth, or data logic is touched.

---

## Task 1: Hero Section — Mosaic Pattern & Typography

### Scope
**File:** `frontend/src/app/page.tsx` (hero `<section>` block, lines 20–55)

### Background Pattern
Remove:
- The inline SVG `backgroundImage` style `div` (the cross/plus tile pattern at `opacity-[0.07]`)
- The two decorative blur circles (`bg-white/5` top-right, `bg-sari-900/10` bottom-left)

Replace with 8–10 absolutely positioned `div` rectangles that replicate the Figma geometric mosaic. All rectangles are:
- `absolute`, `rounded-xl` or `rounded-2xl`
- `pointer-events-none select-none`
- Scattered across the right half and corners of the section
- Colors and opacities cycle through: `bg-sari-300/40`, `bg-sari-400/35`, `bg-sari-500/25`, `bg-sari-600/30`, `bg-sari-700/20`
- Sizes vary (examples): `w-32 h-48`, `w-48 h-32`, `w-24 h-24`, `w-56 h-40`, `w-20 h-36`
- Positioned using `top-*`, `right-*`, `bottom-*`, `left-*` Tailwind utilities to recreate the layered overlap effect

The rectangles sit inside a new `absolute inset-0` wrapper `div` added directly inside the `<section>`. The parent `<section>` already has `overflow-hidden` (line 20), so no additional overflow handling is needed. The rectangles will not extend beyond section bounds.

### Typography
Change the `<h1>` classes from:
```
font-display text-5xl md:text-6xl lg:text-7xl text-white leading-[1.1] tracking-tight
```
to:
```
font-black text-6xl md:text-7xl lg:text-8xl text-white leading-[1.05] tracking-tight
```

`font-black` maps to `font-weight: 900` — extra-bold for strong emphasis matching the Figma. The size steps up one level at each breakpoint. `leading-[1.05]` tightens the line height slightly to suit the heavier, larger display text.

### Badge
In the "NEW COLLECTION" badge `<span>`, replace the plain character with:
```jsx
import { Sparkles } from 'lucide-react';
// ...
<Sparkles className="w-3.5 h-3.5" />
```
No other badge styling changes.

### Constraints
- The hero section background gradient (`from-sari-400 via-sari-500 to-sari-700`) stays unchanged.
- The content layout (`max-w-2xl`, padding, subtitle text, button row) stays unchanged.
- The `animate-slide-up` animation on the content wrapper stays unchanged.
- No new dependencies — lucide-react is already installed.

---

## Task 2: "Shop Now" CTA Button

### Scope
**File:** `frontend/src/app/page.tsx` (hero CTA buttons, lines 39–51)

### Change
The "Shop Now" `Link` button classes change from:
```
bg-gray-900 hover:bg-gray-800 text-white font-medium px-8 py-3.5 rounded-full
transition-all duration-200 shadow-lg shadow-gray-900/30 hover:shadow-xl hover:shadow-gray-900/40
```
to:
```
bg-white hover:bg-sari-50 text-sari-700 font-medium px-8 py-3.5 rounded-full
transition-all duration-200 shadow-lg shadow-white/30 hover:shadow-xl hover:shadow-white/40
```

White fill with amber text matches the Figma reference exactly. The hover shifts to `sari-50` (very light amber) for a subtle warmth effect.

### Unchanged
- The arrow character and `group-hover:translate-x-0.5` animation stay.
- The `group` class on the outer `Link` stays.
- The "Try AI Comparison" secondary button is not touched.

---

## Task 3: Navbar Login Button

### Scope
**File:** `frontend/src/components/layout/Navbar.tsx` (login link, lines 153–158)

### Change
The Login `Link` classes change from:
```
bg-gradient-to-r from-sari-500 to-sari-600 hover:from-sari-600 hover:to-sari-700
text-white text-sm font-medium px-5 py-2 rounded-full shadow-sm hover:shadow-md
transition-all duration-200
```
to:
```
bg-amber-400 hover:bg-amber-500 text-gray-900 text-sm font-medium px-5 py-2
rounded-full shadow-sm hover:shadow-md transition-all duration-200
```

`bg-amber-400` produces a true yellowish-gold tone. `text-gray-900` ensures strong contrast (amber-400 is a light color — white text would fail contrast). The gradient is replaced with a flat color for a cleaner, more distinctly "gold" appearance.

### Unchanged
- All other navbar elements (links, search, icons, user menu, mobile nav) are not touched.
- The user avatar/initials button (shown when logged in) is not touched.

---

## Implementation Instructions

### Plugin Usage
- Use **superpowers** workflow: `superpowers:writing-plans` → `superpowers:executing-plans` → `superpowers:verification-before-completion`
- Use **frontend-design** (`frontend-design:frontend-design`) when implementing the mosaic rectangle layout — this is a new decorative UI component that benefits from design quality guidance to ensure the Figma aesthetic is faithfully reproduced

### Safety Requirements
- No existing functionality, routing, or data logic is altered.
- Changes are isolated to two files: `page.tsx` and `Navbar.tsx`.
- Must be verified visually in the browser at multiple viewport widths (mobile, tablet, desktop) before marking complete.
- The mosaic rectangles must not overflow the hero section bounds — verify `overflow-hidden` is set on the section.

---

## Files Changed Summary

| File | Change |
|---|---|
| `frontend/src/app/page.tsx` | Hero mosaic pattern, h1 typography, badge icon, Shop Now button |
| `frontend/src/components/layout/Navbar.tsx` | Login button color |
