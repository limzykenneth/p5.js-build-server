import { defineConfig, lazyPlugins } from "vite-plus";
import { cloudflare } from "@cloudflare/vite-plugin";
import vue from "@vitejs/plugin-vue";

export default defineConfig({
  plugins: lazyPlugins(() => [cloudflare(), vue()])
});
