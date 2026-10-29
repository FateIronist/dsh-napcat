/**
 * Agent tools contributed to the harness tools registry.
 *
 *  - napcat_call: execute one OneBot 11 action (POST-equivalent over the
 *    WS connection); guard-checked; risky actions require confirmation.
 *  - napcat_doc:  look up the bundled NapCat API reference (docs/) so the
 *    model can construct correct payloads on its own.
 */
import type { Context } from '@deepseek-ai/cordis'
import type { NapcatConfig } from './index.ts'
import type { NapcatConnection } from './connection.ts'
import type { NapcatGuard } from './guard.ts'

export function registerNapcatTools(
  _ctx: Context,
  _config: NapcatConfig,
  _guard: NapcatGuard,
  _connection?: NapcatConnection,
): void {
  // TODO: ctx.tools.register(defineTool({ ... })) for:
  //  - napcat_call(action, params)   → guard.check → connection.call
  //  - napcat_doc(query)             → search docs/napcat-api-source.md
  // Description of napcat_call must inline the message-segment format rules
  // and the retcode envelope so the model self-corrects (see docs/).
  throw new Error('dsh-napcat tools: not implemented yet (skeleton)')
}
