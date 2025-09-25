import { z } from "zod";
import { ToolBase } from "./tool";
import mysql from "mysql2/promise";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

export const DbOperationArgs = {
    database: z.string().describe("Database name"),
    collection: z.string().describe("Collection name"),
};

export abstract class MysqlToolBase extends ToolBase {

    protected async connectToMySQL() {
        const mysqlUri = this.context.connectionStr;
        if (!mysqlUri) {
            throw new Error("No MySQL URI provided for this session.");
        }

        console.log("Connecting to MySQL...");

        // mysql2 supports URIs like mysql://user:pass@host:port/dbname
        const pool = mysql.createPool(mysqlUri);
        return await pool.getConnection();
    }

    public registerTool(server: McpServer) {
        server.registerTool(this.name, {
            description: this.description,  
            inputSchema: this.argsShape,
            annotations: this.annotations,
        }, this.execute.bind(this));
    }
}
