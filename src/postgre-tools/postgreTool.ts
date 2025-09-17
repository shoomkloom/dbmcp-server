import { z } from "zod";
import { ToolBase } from "./tool";
import pg from "pg";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import dns from "dns";

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

        //Force IPv4 resolution to avoid IPv6 issues on some platforms
        const url = new URL(postgreUri);
        const { address } = await dns.promises.lookup(url.hostname, { family: 4 });
        url.hostname = address;
        const pool = new pg.Pool({ connectionString: url.toString(), ssl: { rejectUnauthorized: true } });
        const client = await pool.connect();
        return client;
    }

    public registerTool(server: McpServer) {
        server.registerTool(this.name, {
            description: this.description,  
            inputSchema: this.argsShape,
            annotations: this.annotations,
        }, this.execute.bind(this));
    }
}
