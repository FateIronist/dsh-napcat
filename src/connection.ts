/**
 * WebSocket connection to the local NapCat OneBot 11 endpoint.
 *
 * Responsibilities: dial + token auth, reconnect with backoff, heartbeat,
 * correlate echo ids for action responses, and expose an emitter for
 * OneBot events (message/notice/request/meta) consumed by wake.ts.
 */
import type { Context } from '@deepseek-ai/cordis'
import type { NapcatConfig } from './index.ts'
import type { NapcatGuard } from './guard.ts'

export interface NapcatConnection {
  /** Send an OB11 action; resolves with the action result envelope. */
  call(action: string, params: Record<string, unknown>): Promise<unknown>
  stop(): void
}

export function startConnection(_ctx: Context, _config: NapcatConfig, _guard: NapcatGuard): NapcatConnection {
  // TODO: dial config.wsUrl (Authorization: Bearer <token>), reconnect with
  // exponential backoff, heartbeat echo, echo-id → pending-promise table.
  // Outgoing calls go through guard.check() before hitting the socket.
  throw new Error('dsh-napcat connection: not implemented yet (skeleton)')
}

/** Shape of OneBot 11 reported events we care about (subset). */
export interface Ob11MessageEvent {
  post_type: 'message'
  message_type: 'private' | 'group'
  user_id: string
  group_id?: string
  raw_message: string
  message_id: number | string
  time: number
}
