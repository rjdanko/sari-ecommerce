# UI/UX Refinements Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILLS: 
> - Use `superpowers:subagent-driven-development` to implement this plan task-by-task.
> - For any visual, styling, or UI changes (like the Footer and Logo replacements), you MUST use the `frontend-design` plugin/skill.
> Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace placeholder Sari icons with the `Sari_Logo` picture and implement the new styling for the global footer design.

**Architecture:** Next.js Frontend with Tailwind/CSS styling.

**Tech Stack:** React, Next.js, TailwindCSS

---

### Task 1: Update Sari Logo Across the Platform

**Goal:** Ensure the actual `Sari_Logo` image is used on the Navbar, Login, and Signup pages instead of placeholder icons.

**Files:**
- Modify: `frontend/src/components/layout/Navbar.tsx`
- Modify: `frontend/src/app/(auth)/login/page.tsx`
- Modify: `frontend/src/app/(auth)/register/page.tsx`

- [ ] **Step 1: Replace Logo in Navbar.tsx**
  - Use `frontend-design` to locate the old logo placeholder within `Navbar.tsx`.
  - Identify where the user uploaded the `Sari_Logo` picture (likely inside `frontend/public/`). If the file is not there, request the exact path/file from the user.
  - Update the `<img />`, `<Image />` or `<svg>` tags to point to the `Sari_Logo` picture.
  - Verify that the layout and sizing of the navbar remain proportional and unbroken.

- [ ] **Step 2: Replace Logo in Authentication Pages**
  - Open `frontend/src/app/(auth)/login/page.tsx` and `frontend/src/app/(auth)/register/page.tsx` (or `signup` equivalent).
  - Swap the existing placeholder logos for the `Sari_Logo` image.
  - Adjust styling to ensure the logo is properly aligned and sized according to the form layout.

- [ ] **Step 3: Test Logo Replacements**
  - Start the frontend dev server (`npm run dev` or `npm run start`).
  - Verify that the Navbar, Login, and Register pages display the new logo.

- [ ] **Step 4: Commit**
  ```bash
  cd frontend
  git add src/components/layout/Navbar.tsx src/app/\(auth\)/login/page.tsx src/app/\(auth\)/register/page.tsx
  git commit -m "feat: replace placeholder logos with Sari_Logo picture on navbar and auth pages"
  ```

### Task 2: Implement New Footer Design

**Goal:** Build a new footer component according to the provided reference design.

**Files:**
- Create: `frontend/src/components/layout/Footer.tsx`
- Modify: `frontend/src/app/layout.tsx`

- [ ] **Step 1: Scaffold Footer Component**
  - Run the `frontend-design` plugin and instruct it to build identical styling to the provided mockup image.
  - Create the `Footer.tsx` component with 4 main columns:
    1. Logo area: "SARI" logo and Tagline ("Your one-stop shop for fashion and style.")
    2. "Shop" navigation: Home, Men, Women, Bottoms, Outerwear
    3. "Customer Service" navigation: Contact Us, Shipping Info, Returns, FAQ
    4. "Follow Us" navigation: Facebook, Instagram, Twitter, TikTok
  - Include the bottom copyright section bordered above by a subtle line ("© 2026 SARI. All rights reserved.").
  - Implement this using Tailwind CSS mapping closely to the font weights, spacing, and subtle color treatments in the image.

- [ ] **Step 2: Add Footer to Global Layout**
  - Import the new `Footer` into `frontend/src/app/layout.tsx`.
  - Append it to the bottom of the main body (e.g. at the bottom of the main container inside `<body>`) so that it appears globally across the application.

- [ ] **Step 3: Verify and Adjust Design**
  - Run the browser preview natively using the frontend-design guidelines.
  - Validate padding, typography (e.g. text sizes, colors like cool grays vs. dark grays), and grid alignment.

- [ ] **Step 4: Commit**
  ```bash
  cd frontend
  git add src/components/layout/Footer.tsx src/app/layout.tsx
  git commit -m "feat: implement new global footer design"
  ```

---
