/**
 * dsh-napcat browser half — empty shell.
 *
 * Pure host plugin today: the client side has no UI. Kept as the standard
 * scaffold's client entry (lib/client.js) so the `dsh.client` declaration
 * in package.json stays valid; a settings panel (WS endpoint/token/guard
 * config editing) can be added here later.
 */
export function apply(): void {
  // Intentionally empty.
}
