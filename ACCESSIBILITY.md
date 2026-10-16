# Accessibility checks

## Purpose

The assignment asks for relevant WCAG 2.2 AA basics. This file is a record of checks to perform on the Accessibility Issue Tracker. A checklist item is not evidence that the feature passed: update each result only after testing it in the browser.

## Manual keyboard and interface checks

Replace `Not tested` with `Pass`, `Issue found`, or `Not applicable` after checking each item. Add a short note when needed.

- [ ] **Not tested** — The skip link can be reached and takes the user to the main content.
- [ ] **Not tested** — Sign-in controls work using only the keyboard.
- [ ] **Not tested** — Every form field has a visible label.
- [ ] **Not tested** — Focus is visible on interactive controls.
- [ ] **Not tested** — Tab order follows the visual order of the page.
- [ ] **Not tested** — Creating, editing, filtering, and changing status work without a mouse.
- [ ] **Not tested** — Submitting an invalid form shows clear text errors and moves focus to the error summary.
- [ ] **Not tested** — Save and status messages are announced without moving focus.
- [ ] **Not tested** — Status and severity are conveyed in text, not by color alone.
- [ ] **Not tested** — Headings are in a logical order and each view has an appropriate page title.
- [ ] **Not tested** — At 320 CSS pixels and 200% zoom, content remains usable without being cut off or requiring horizontal scrolling.

## Automated checks

- **Tool used:** Not yet run
- **Date and browser:** Record after running the check
- **Findings:** Record the actual results, including any issues found

A free tool such as axe DevTools, Lighthouse, or WAVE can help identify potential problems. Automated results do not replace keyboard testing or screen-reader testing.

## Screen-reader check

- **Screen reader used:** Not yet tested
- **Findings:** Record the actual results after testing

If available, test with NVDA on Windows or VoiceOver on macOS. Check whether form labels, validation errors, issue details, and live status messages are announced in a useful way.

## Current notes and limitations

The app includes semantic HTML, a skip link, visible focus styles, form labels, text-based status and severity values, and live regions. These are useful starting points, but they do not guarantee WCAG conformance.

The page title is currently shared between views. Updating `document.title` when switching between sign-in, list, form, and detail views would make the title more descriptive.

The sign-in flow is a local demo, not real authentication. The app should not be exposed to the public internet or used with real user data in its current form.

Complete the checks above before submission and add any further findings here. Do not mark a check as passed unless it has actually been tested.

