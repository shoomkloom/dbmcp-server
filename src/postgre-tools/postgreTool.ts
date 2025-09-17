import { z } from "zod";
import { ToolBase } from "./tool";
import pg from "pg";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { getPool } from "./connection-pool";

export const DbOperationArgs = {
    database: z.string().describe("Database name"),
    collection: z.string().describe("Collection name"),
};

export abstract class PostgreToolBase extends ToolBase {

    protected async connectToPostgre(): Promise<pg.PoolClient> {
        const postgreUri = this.context.connectionStr;
        if (!postgreUri) {
            throw new Error('No Postgre URI provided for this session.');
        }

        console.log(`Connecting to PostgreSQL...`);

        const pool = getPool(postgreUri);
        return await pool.connect();
    }

    public registerTool(server: McpServer) {
        server.registerTool(this.name, {
            description: this.description,  
            inputSchema: this.argsShape,
            annotations: this.annotations,
        }, this.execute.bind(this));
    }
}
