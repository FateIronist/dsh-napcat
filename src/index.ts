/**
 * dsh-napcat host half — entry point.
 *
 * Bridges a local NapCat (OneBot 11) instance into DSH:
 *  - connection: WebSocket client to NapCat (reconnect/heartbeat/token)
 *  - tools:      napcat_call / napcat_doc agent tools (defineTool)
 *  - guard:      action whitelist / risky-action confirmation / rate limit
 *  - wake:       message events → session prompt dispatch (allowlists,
 *                quiet hours, cooldown)
 *
 * Skeleton stage: modules export their public surface with TODO bodies.
 * See AGENTS.md for the implementation plan.
 */
import type { Context } from '@deepseek-ai/cordis'
import { startConnection } from './connection.ts'
import { registerNapcatTools } from './tools.ts'
import { createGuard } from './guard.ts'
import { startWake } from './wake.ts'

export const name = 'napcat'

export const inject = ['tools', 'systemPrompt']

/** Plugin config; defaults live in cordis.patch.yml (hot-reloadable). */
export interface NapcatConfig {
  wsUrl: string
  token: string
  tools: { enabled: boolean }
  guard: {
    actionWhitelist: string[]
    riskyActions: string[]
    rateLimitPerMinute: number
  }
  wake: {
    enabled: boolean
    privateAllowlist: string[]
    groupAllowlist: string[]
    quietHours: string[]
    cooldownSeconds: number
  }
}

export function apply(ctx: Context): void {
  const config = (ctx as unknown as { config?: NapcatConfig }).config ?? defaultConfig()

  const guard = createGuard(config.guard)
  const connection = startConnection(ctx, config, guard)
  if (config.tools.enabled) registerNapcatTools(ctx, config, guard)
  if (config.wake.enabled) startWake(ctx, connection, config.wake)
}

function defaultConfig(): NapcatConfig {
  return {
    wsUrl: 'ws://127.0.0.1:3000',
    token: '',
    tools: { enabled: true },
    guard: { actionWhitelist: [], riskyActions: [], rateLimitPerMinute: 30 },
    wake: {
      enabled: true,
      privateAllowlist: [],
      groupAllowlist: [],
      quietHours: [],
      cooldownSeconds: 30,
    },
  }
}
