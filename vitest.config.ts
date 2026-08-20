import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: {
      // widget は npm のワークスペースリンクに頼らず、core のソースを直接参照する。
      // （build-widget.mjs の esbuild alias と同じ解決規則）
      '@miyabarrier/core': fileURLToPath(new URL('./packages/core/src/index.ts', import.meta.url)),
      '@miyabarrier/design/logo': fileURLToPath(
        new URL('./packages/design/src/logo.ts', import.meta.url),
      ),
      '@miyabarrier/design/tokens': fileURLToPath(
        new URL('./packages/design/src/tokens.ts', import.meta.url),
      ),
    },
  },
  test: {
    include: ['packages/*/tests/**/*.test.ts'],
    environment: 'node',
    coverage: {
      include: ['packages/core/src/**/*.ts', 'packages/widget/src/**/*.ts'],
      exclude: ['packages/core/src/patterns.data.ts'],
      reporter: ['text', 'html'],
    },
  },
});
