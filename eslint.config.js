import js from "@eslint/js";
import tseslint from "typescript-eslint";

export default tseslint.config(
  {
    ignores: [
      "**/node_modules/**",
      ".gravescan-work/**",
      ".kiro/skills/**",
      "packages/fixtures/data/**",
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ["apps/web/src/static/**/*.js"],
    languageOptions: {
      sourceType: "module",
      globals: {
        Blob: "readonly",
        URL: "readonly",
        document: "readonly",
        fetch: "readonly",
        localStorage: "readonly",
        window: "readonly",
      },
    },
  },
);
