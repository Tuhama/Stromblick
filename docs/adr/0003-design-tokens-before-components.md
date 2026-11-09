# 0003. Design tokens now, shadcn/ui components when they are needed

- Status: Accepted
- Date: 2026-11-09
- Issue: #15

## Context

The app shell needs colors, a dark mode and a consistent look, but almost no components: links,
two selects and headings. The plan names Tailwind and shadcn/ui as the UI stack. shadcn/ui isn't a
library: its CLI copies component code into the repository and writes its own color tokens into the
stylesheet. Its default palette isn't Stromblick's (ink `#0B1F2A`, yellow `#FACC15`), and its
registry couldn't be reached from the environment where this setup was built and tested.

## Decision

We define our own design tokens in `apps/web/src/index.css`, using shadcn/ui's names
(`--background`, `--foreground`, `--muted`, `--primary`, `--accent`, `--border`, `--ring`, …) with
our brand colors, in a light and a dark set. Tailwind exposes them as color classes such as
`bg-background` and `text-muted-foreground`. Components use only these classes, never hex values or
`dark:` variants. We add shadcn/ui components with its CLI when a page first needs one.

## Alternatives considered

- **Run `shadcn init` now**: would add its own palette, which we would replace with the brand
  colors anyway, plus dependencies that no code uses yet.
- **Tailwind's default palette with `dark:` variants in each component**: every component would
  carry two sets of colors, and contrast would have to be checked component by component.
- **A full component library (such as MUI)**: brings its own styling system and runtime, which
  works against Tailwind and adds weight the dashboard doesn't need.

## Consequences

Dark mode is a second set of token values, not a change in every component. Contrast is checked
once, for the tokens: every text pairing passes WCAG AA (at least 4.5:1) in both themes. A rule
follows from it: yellow is a fill with ink text on it, never text on a light background.

The token set is small. shadcn/ui components expect more tokens (for example for cards, popovers,
inputs and error states), so the first `shadcn add` will extend `index.css`. Its changes need a
careful review: keep our values, add the missing tokens in both themes, and check their contrast.
