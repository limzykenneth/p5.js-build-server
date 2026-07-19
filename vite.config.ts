import { defineConfig } from "vite-plus";

export default defineConfig({
  staged: {
    "*": "vp check --fix"
  },
  fmt: {
    ignorePatterns: ["node_modules/*", "**/worker-configuration.d.ts"],
    trailingComma: "none"
  },
  lint: {
    ignorePatterns: ["**/worker-configuration.d.ts"],
    options: {
      typeAware: true,
      typeCheck: true
    },
    jsPlugins: [
      {
        name: "vite-plus",
        specifier: "vite-plus/oxlint-plugin"
      }
    ],
    rules: {
      "vite-plus/prefer-vite-plus-imports": "error"
    }
  }
});
