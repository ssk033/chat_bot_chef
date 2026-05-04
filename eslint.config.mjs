import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    files: ["scripts/**/*"],
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
      "prefer-const": "off",
    },
  },
  {
    files: ["app/api/query/route.ts", "lib/embedding-model.ts", "lib/ollama-client.ts"],
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Local Python / ML envs and artifacts (must not be linted on CI or deploy)
    ".venv-food-ai/**",
    ".venv/**",
    "venv/**",
    "**/site-packages/**",
    "node_modules/**",
    "RecipeModel/**",
    "ml-models/**",
    "coverage/**",
    "**/__pycache__/**",
    ".turbo/**",
  ]),
]);

export default eslintConfig;
