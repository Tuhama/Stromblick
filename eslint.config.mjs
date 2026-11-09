import js from "@eslint/js";
import { defineConfig, globalIgnores } from "eslint/config";
import tseslint from "typescript-eslint";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import jsxA11y from "eslint-plugin-jsx-a11y";
import prettier from "eslint-config-prettier";

export default defineConfig([
  globalIgnores(["**/dist/**", "**/.turbo/**", "**/coverage/**", "**/generated/**"]),
  // All packages: strict, type-aware TypeScript rules
  js.configs.recommended,
  tseslint.configs.strictTypeChecked,
  {
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      "@typescript-eslint/restrict-template-expressions": ["error", { allowNumber: true }],
      "@typescript-eslint/no-confusing-void-expression": ["error", { ignoreArrowShorthand: true }],
      "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
    },
  },

  // API: Node environment
  {
    files: ["apps/api/**/*.ts"],
    languageOptions: { globals: globals.node },
  },

  // Web: browser, React hooks, Vite fast refresh, accessibility
  {
    files: ["apps/web/**/*.{ts,tsx}"],
    languageOptions: { globals: globals.browser },
    extends: [
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
      jsxA11y.flatConfigs.recommended,
    ],
  },

  // Plain JS config files are in no tsconfig, so lint them without type info
  {
    files: ["**/*.{js,mjs,cjs}"],
    languageOptions: { globals: globals.node },
    extends: [tseslint.configs.disableTypeChecked],
  },
  // Web: scripts in public/ are served as they are and run in the browser
  {
    files: ["apps/web/public/**/*.js"],
    languageOptions: { globals: globals.browser },
  },
  // Last: turn off rules that conflict with Prettier
  prettier,
]);
