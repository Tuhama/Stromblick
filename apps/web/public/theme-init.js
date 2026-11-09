// Runs before the page is drawn, so a dark theme never flashes light first.
// Same storage key and rule as src/theme/theme.ts; keep the two in step.
(() => {
  let theme = "system";
  try {
    theme = localStorage.getItem("stromblick.theme") ?? "system";
  } catch {
    // Storage blocked: follow the system.
  }
  const dark =
    theme === "dark" ||
    (theme !== "light" && window.matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.classList.toggle("dark", dark);
  document.documentElement.style.colorScheme = dark ? "dark" : "light";
})();
