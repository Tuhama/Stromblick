import { vi } from "vitest";

/** jsdom has no matchMedia. This one answers the dark-mode query as the given system theme. */
export function mockSystemTheme(system: "light" | "dark") {
  vi.stubGlobal(
    "matchMedia",
    vi.fn((query: string) => ({
      matches: query === "(prefers-color-scheme: dark)" && system === "dark",
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })),
  );
}
