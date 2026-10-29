/**
 * Risk control for outgoing NapCat actions.
 *
 * Layers: action whitelist (empty = allow non-risky all) → risky-action
 * confirmation gate → per-minute rate limit. Config is hot-reloadable via
 * the plugin row config (dsh-hmr).
 */
import type { NapcatConfig } from './index.ts'

export interface NapcatGuard {
  /** Throws (or returns a refusal value) when the action must not proceed. */
  check(action: string): void
  /** True when the action needs explicit user confirmation first. */
  isRisky(action: string): boolean
  stop(): void
}

export function createGuard(config: NapcatConfig['guard']): NapcatGuard {
  const window: number[] = []

  return {
    check(action) {
      if (config.actionWhitelist.length > 0 && !config.actionWhitelist.includes(action)) {
        throw new Error(`napcat action not in whitelist: ${action}`)
      }
      const now = Date.now()
      while (window.length > 0 && now - window[0]! > 60_000) window.shift()
      if (window.length >= config.rateLimitPerMinute) {
        throw new Error(`napcat rate limit exceeded (${config.rateLimitPerMinute}/min)`)
      }
      window.push(now)
    },
    isRisky(action) {
      return config.riskyActions.includes(action)
    },
    stop() {
      window.length = 0
    },
  }
}
