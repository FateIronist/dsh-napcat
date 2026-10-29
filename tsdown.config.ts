/**
 * Standalone build config for the dsh-napcat plugin.
 *
 * Host-only builds today: node half from src/index.ts to lib/index.js. The
 * browser shell src/client.ts is bundled to lib/client.js so the dsh.client
 * declaration in package.json stays loadable; it has no GUI yet. When a
 * settings panel is added, switch to the family-bucket shared client preset
 * (shared/tsdown.client.ts) for closure-factory + CSS Modules handling.
 */
import { defineConfig } from 'tsdown'

export default defineConfig({
  entry: ['src/index.ts', 'src/client.ts'],
  outDir: 'lib',
  format: 'esm',
  dts: false,
  external: [
    '@deepseek-ai/cordis',
    '@deepseek-ai/dsh-host-webserver',
    '@deepseek-ai/dsh-llm',
    '@deepseek-ai/dsh-system-prompt',
    '@deepseek-ai/dsh-tools',
    'ws',
  ],
})
