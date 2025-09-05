import tseslint from "@typescript-eslint/eslint-plugin";
import * as tsparser from "@typescript-eslint/parser";
import importX from "eslint-plugin-import-x";
import unused from "eslint-plugin-unused-imports";
import simpleSort from "eslint-plugin-simple-import-sort";

export default [
  {
    // root settings
    linterOptions: { reportUnusedDisableDirectives: true },
    languageOptions: {
      parser: tsparser,
      parserOptions: {
        project: true, // resolves tsconfig.json in each package
        tsconfigRootDir: process.cwd()
      }
    },
    plugins: {
      "@typescript-eslint": tseslint,
      "import-x": importX,
      "unused-imports": unused,
      "simple-import-sort": simpleSort
    },
    rules: {
      // TypeScript core
      "@typescript-eslint/consistent-type-imports": ["error", { prefer: "type-imports" }],
      "@typescript-eslint/no-floating-promises": "error",
      "@typescript-eslint/no-misused-promises": "error",
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/explicit-function-return-type": "off",

      // Imports
      "import-x/no-unresolved": "off", // Disabled - TypeScript handles this
      "import-x/named": "error",
      "simple-import-sort/imports": "error",
      "simple-import-sort/exports": "error",
      "unused-imports/no-unused-imports": "error",

      // General
      "no-console": ["warn", { allow: ["warn", "error"] }],
      "no-duplicate-imports": "error",
      "eqeqeq": ["error", "smart"]
    }
  },

  // Node/Nest backends
  {
    files: ["**/services/**/src/**/*.ts", "**/libs/**/src/**/*.ts"],
    rules: {
      // Additional backend-specific rules can be added here
    }
  },

  // Test files
  {
    files: ["**/*.spec.ts", "**/*.test.ts"],
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-unsafe-assignment": "off",
      "@typescript-eslint/no-unsafe-member-access": "off"
    }
  },

  // JS tooling files
  {
    files: ["**/*.js", "**/*.cjs", "**/*.mjs"],
    languageOptions: { parser: null }, // default JS parser
    rules: {}
  }
];