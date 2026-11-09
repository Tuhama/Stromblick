# apps/web

- Group code by feature in src/features/<feature>/ (components, hooks and tests together).
- Server data only through TanStack Query hooks in src/api/, parsed with @stromblick/shared schemas.
- Every request goes through getJson() in src/api/client.ts. It parses the body and turns error responses into ApiError.
- View state that should be shareable lives in the URL, not in component state.
- Accessibility: every control keyboard-usable and labelled; every chart has a table fallback.
- Styling: Tailwind + shadcn/ui. Brand colors: ink #0B1F2A, accent #FACC15.
- Colors only through the design tokens in src/index.css (bg-background, text-muted-foreground, …); no hex values or dark: variants in components.
- Yellow (accent) is a fill with accent-foreground text on it, never text on a light background (fails contrast).
- Page headings and browser tab titles through the Page component in src/layout.
