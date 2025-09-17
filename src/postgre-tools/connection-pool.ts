// connection-pool.ts (singleton pool)
import pg from "pg";

const pools = new Map<string, pg.Pool>();
const POOL_LIMIT = 20; // Max number of different pools to keep

let pool: pg.Pool | undefined;

export function getPool(connectionString: string) {
    let pool = pools.get(connectionString);
    if (pool) return pool;

    if (pools.size >= POOL_LIMIT) {
        console.log("Deleting old PG connection pool");
        const [oldestKey, oldestPool] = pools.entries().next().value as [string, pg.Pool];
        oldestPool.end().catch(() => {});
        pools.delete(oldestKey);
    }

    let sslRejectUnauthorized = true;
    if (process.env.NODE_ENV !== 'production') {
        sslRejectUnauthorized = false;
        console.warn("Warning: SSL certificate verification is disabled in non-production environments.");
    }

    console.log("Creating new PG connection pool");
    pool = new pg.Pool({
        connectionString,
        ssl: { rejectUnauthorized: sslRejectUnauthorized },
        keepAlive: true,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 10000,
        max: 10,
    });

    pool.on("error", (err) => {
        console.error("Unexpected PG pool error:", err);
    });

    pools.set(connectionString, pool);
    return pool;
}
