import { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { MysqlToolBase } from "../mysqlTool";
import { z } from "zod";
import { ToolArgs, OperationType } from "../tool";
import type { PoolConnection } from "mysql2/promise";
type ReadTxnMode = "stmt" | "session" | "snapshot" | "plain";

export class QueryTool extends MysqlToolBase {
    public name = "query";
    protected description = "Run a read-only SQL query";
    protected argsShape = {
        sql: z.string().describe("The SQL query to execute"),
    };

    public operationType: OperationType = "query";

    protected async execute({ sql }: ToolArgs<typeof this.argsShape>): Promise<CallToolResult> {
        const client = await this.connectToMySQL();
        try {
            const rows = await this.executeReadQuery(client, sql);
            return {
                content: [
                    { 
                        type: "text", 
                        text: JSON.stringify(rows, null, 2) 
                    }
                ]
            };
        } 
        catch (error) {
            throw error;
        } 
        finally {
            client
                .query("ROLLBACK")
                .catch((error) =>
                    console.warn("Could not roll back transaction:", error),
                );

            client.release();
        }
    }

    protected isUnsupportedTxnSyntax(e: any): boolean {
        // Common “this server doesn’t support that” signals across MySQL/MariaDB versions
        return (
            e?.code === "ER_PARSE_ERROR" ||          // 1064 near 'READ ONLY' etc.
            e?.code === "ER_UNKNOWN_SYSTEM_VARIABLE" || // 1193 for SET SESSION TRANSACTION ...
            e?.code === "ER_NOT_SUPPORTED_YET" ||    // 1235 some MariaDB flavors
            e?.errno === 1064 ||
            e?.errno === 1193 ||
            e?.errno === 1235
        );
    }

    protected async beginPortableReadTxn(conn: PoolConnection): Promise<{
        mode: ReadTxnMode;
        cleanup: () => Promise<void>;
    }> {
        // 1) Try modern syntax (MySQL 5.6.5+, MariaDB 10.0+)
        try {
            await conn.query("START TRANSACTION READ ONLY");
            return {
                mode: "stmt",
                cleanup: async () => {
                    // just rollback; no session state to reset
                    await conn.query("ROLLBACK").catch(() => {});
                },
            };
        } 
        catch (e: any) {
            if (!this.isUnsupportedTxnSyntax(e)) throw e;
        }

        // 2) Fall back: set next transaction characteristics, then start it
        try {
            await conn.query("SET SESSION TRANSACTION READ ONLY");
            await conn.query("START TRANSACTION");
            return {
                mode: "session",
                cleanup: async () => {
                    // rollback and restore session to READ WRITE so it won't leak
                    await conn.query("ROLLBACK").catch(() => {});
                    await conn.query("SET SESSION TRANSACTION READ WRITE").catch(() => {});
                },
            };
        } 
        catch (e: any) {
            if (!this.isUnsupportedTxnSyntax(e)) throw e;
        }

        // 3) Old servers (e.g., MySQL 5.5): try consistent snapshot for stable reads (InnoDB)
        try {
            await conn.query("START TRANSACTION WITH CONSISTENT SNAPSHOT");
            return {
                mode: "snapshot",
                cleanup: async () => {
                    await conn.query("ROLLBACK").catch(() => {});
                },
            };
        } 
        catch {
            // 4) Absolute last fallback: plain transaction
            await conn.query("START TRANSACTION");
            return {
                mode: "plain",
                cleanup: async () => {
                    await conn.query("ROLLBACK").catch(() => {});
                },
            };
        }
    }

    protected async executeReadQuery<T = any>(
        conn: PoolConnection,
        sql: string,
        params?: any[]
    ): Promise<T[]> {
        const { mode, cleanup } = await this.beginPortableReadTxn(conn);
        try {
            const [rows] = await conn.query(sql, params);
            // Optional: warn if we couldn't enforce read-only at the server level
            if (mode === "snapshot" || mode === "plain") {
                // On very old servers, enforce read-only by using a read-only DB user!
                console.warn(
                    `[read-only] Mode=${mode}. Consider connecting with a read-only user for enforcement.`
                );
            }
            return rows as T[];
        } 
        finally {
            await cleanup();
        }
    }
}
