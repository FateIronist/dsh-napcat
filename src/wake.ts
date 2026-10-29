/**
 * Message wake-up dispatch: incoming QQ message → agent session prompt.
 *
 * Filter chain: private/group allowlists → quiet hours → per-peer cooldown.
 * Dispatch pattern follows dsh-task-board's host-service (create/resume a
 * session via ctx.agents and submit the wrapped prompt).
 */
import type { Context } from '@deepseek-ai/cordis'
import type { NapcatConnection } from './connection.ts'
import type { NapcatConfig } from './index.ts'

export function startWake(
  _ctx: Context,
  _connection: NapcatConnection,
  _config: NapcatConfig['wake'],
): void {
  // TODO: subscribe connection events; for each allowed message:
  //  1. wrap raw_message + sender profile into a prompt
  //  2. resolve/create the session bound to the peer (ctx.agents / ctx.sessions)
  //  3. submit the prompt (task-board dispatchRuns is the reference)
  throw new Error('dsh-napcat wake: not implemented yet (skeleton)')
}
