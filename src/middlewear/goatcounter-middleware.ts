// goatcounter-middleware.ts
type GoatCounterOpts = {
  site?: string;
  token?: string;
  fixedPath?: string;
  noSessions?: boolean;
};

export function goatCounter(opts: GoatCounterOpts = {}) {
  const site = opts.site ?? process.env.GOATCOUNTER_SITE;
  const token = opts.token ?? process.env.GOATCOUNTER_TOKEN;
  const noSessions = opts.noSessions ?? true;

  const disabled = !site || !token;

  return function goatCounterMiddleware(req: any, _res: any, next: any) {
    if (!disabled) {
      const path = opts.fixedPath || req.path || "/";

      fetch(`https://${site}/api/v0/count`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          no_sessions: noSessions,
          hits: [{ path }],
        }),
      }).catch(() => { console.warn("GoatCounter logging failed"); });
    }
    next();
  };
}
