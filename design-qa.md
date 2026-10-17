# Design QA

**final result: blocked**

The implementation has not passed browser-based visual QA. This is a recorded verification limit, not a claim that the design matches the references.

- Source visual truth: the user's attached Rotato, Realtor and Subly mobile/interface inspiration boards in the conversation. These are direction references rather than an exact Substition screen specification; no local attachment paths were exposed.
- Implementation: `src/components/workspace-app.tsx`, responsive styles and the original `public/images/renewal-loop.webp`.
- Browser-rendered implementation screenshot: unavailable. Browser automation's required Node REPL tool was not callable, including on retry. No alternative browser-control path was substituted.
- Intended viewports: 360×800, 390×844, 768×1024, 1024×768 and 1440×1000 CSS pixels, light/dark/system. Implementation pixels, browser density and normalization: unavailable without captures.
- State: synthetic demo and empty personal vault; overview, subscriptions, calendar, insights, dialogs and optional-assistant setup.
- Full-view and focused comparison evidence: blocked because there is no implementation screenshot or combined comparison artifact.

## Required fidelity surfaces

| Surface        | Implemented intent                                                                                | Verification state                                                                                                     |
| -------------- | ------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| Typography     | Self-hosted Urbanist, clear money hierarchy, responsive heading sizes.                            | Needs rendered font/wrapping comparison.                                                                               |
| Spacing/layout | Airy panels, 20–26 px corners, responsive desktop columns and floating mobile navigation.         | Needs overflow, density and safe-area checks on devices.                                                               |
| Colours/tokens | Warm white, jade/mint, peach, muted blue and a separate dark palette.                             | Needs contrast sampling and theme-transition capture.                                                                  |
| Assets         | Actual local merchant marks and an original Blender sculpture, not a CSS illustration substitute. | Blender image and generated app icon were visually inspected with the image tool; in-app placement remains unverified. |
| Copy/content   | Subscription-focused, explicit demo state, clear cancellation and connection limitations.         | Content reviewed in source; screen truncation and native UI integration remain unverified.                             |

## Comparison history

No browser comparison pass occurred. Code reviews corrected save-before-lock races, trial recurrence, CSV sign handling, monochrome-logo backgrounds and initial-theme setup. Those are not evidence of visual QA iterations.

## Primary flows and console

Money, recurrence, encryption, import logic, exports and offline-worker boundaries have runnable checks. HTTP and build verification are recorded separately in `docs/verification.md`. The browser UI flows, console errors, actual service-worker installation and physical-device GPU inference are not verified in this session.

## Acceptance work

Run the device acceptance prompt in `docs/brand-and-prompts.md`. Capture the source and app in a common comparison input. Record actual viewport/density/state, test keyboard and touch interactions, inspect the browser console, fix material findings and recapture before changing this result to passed.
