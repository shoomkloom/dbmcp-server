// goatcounter-middleware.ts (refactored to a plain helper)
/**
 * Refactored: use GoatCounter as a simple helper instead of Express middleware.
 * Call `countGoatCounterHit()` inside your route handler (e.g., POST /mcp).
 */

export type GoatCounterOpts = {
  /** e.g., "dbmcp.goatcounter.com" */
  site?: string;
  /** Bearer token from GoatCounter settings */
  token?: string;
  /** Force a specific path to count (defaults to "/mcp") */
  fixedPath?: string;
  /** Whether to disable session tracking on GoatCounter */
  noSessions?: boolean;
};

/**
 * Fire-and-forget hit counter. Safe to await; errors are swallowed with a warning.
 * You can pass `reqPath` if you want dynamic paths; otherwise `fixedPath` (or "/mcp") is used.
 */
export async function countGoatCounterHit(
  opts: GoatCounterOpts = {},
  reqPath?: string
): Promise<void> {
  const site = opts.site ?? process.env.GOATCOUNTER_SITE;
  const token = opts.token ?? process.env.GOATCOUNTER_TOKEN;
  const noSessions = opts.noSessions ?? true;
  const path = (opts.fixedPath ?? reqPath ?? '/mcp').trim() || '/mcp';

  console.log("countGoatCounterHit Invoked(..)");

  // If not configured, quietly no-op.
  if (!site || !token) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn('[GoatCounter] Missing GOATCOUNTER_SITE or GOATCOUNTER_TOKEN; skipping hit.');
    }
    return;
  }

  const url = `https://${site}/api/v0/count`;
  const body = {
    no_sessions: noSessions,
    hits: [{ path }],
  };

  try {
    await fetch(url, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(body),
    });
  } catch (err) {
    console.warn('[GoatCounter] logging failed:', (err as Error)?.message ?? err);
  }
}
