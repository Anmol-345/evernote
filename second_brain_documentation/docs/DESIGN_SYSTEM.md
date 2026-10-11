# Design System

## Design principles
- Quiet, document-first workspace.
- Content has priority over chrome.
- Neutral surfaces; minimal decoration.
- Fast keyboard-driven interaction without making touch users second-class.
- Consistent semantic meaning across web and mobile, not necessarily identical layouts.

## Proposed tokens
Treat these as starting values to validate in implementation:
- Background: `#FFFFFF`
- Sidebar/background-muted: `#F7F7F5`
- Surface-hover: `#F1F1EF`
- Text-primary: `#242424`
- Text-secondary: `#6B6B6B`
- Border-subtle: `#E8E8E6`
- Accent: `#2F6F62` (use sparingly; verify contrast)
- Danger: `#B42318`
- Success: `#217A4B`
- Focus ring: high-contrast accent/outline
Dark theme should use semantic tokens rather than invert colors mechanically.

## Typography
Use a legible system sans-serif stack on web and platform-appropriate sans-serif on mobile. Body text should be comfortable for long reading. Define title, H1/H2/H3, body, small, metadata, code, and label styles. Avoid using many typefaces.

## Spacing and geometry
Use a 4px base spacing scale (4, 8, 12, 16, 24, 32, 48). Subtle 1px borders, modest radii, and compact controls. Editor line length should remain comfortable on desktop; mobile uses available width with consistent side padding.

## Components
Sidebar item, page breadcrumb, page icon, title editor, block wrapper, drag handle, slash menu, inline toolbar, save indicator, search dialog, tag chip, attachment row, confirmation dialog, toast, skeleton, empty state, conflict banner.

## Interaction
- Keyboard focus is visible.
- Hover state must not be the only state cue.
- Destructive actions are separated from common actions.
- Menus support keyboard navigation and escape dismissal.
- Autosave state is textually communicated.
- Avoid modal dialogs for every simple action.

## Responsive behavior
Desktop: sidebar + centered/comfortable document column. Tablet: collapsible sidebar. Mobile: navigation drawer or dedicated navigation screen, full-width editor, touch-friendly block actions; drag handles must have accessible alternatives.

## Accessibility
Target WCAG 2.2 AA where practical. Provide semantic labels, keyboard paths, screen-reader descriptions, focus management, reduced-motion support, contrast validation, and non-color status indicators.

## Branding
Use original name, iconography, and assets. “Notion-inspired” refers to interaction/design principles, not copied brand identity.
