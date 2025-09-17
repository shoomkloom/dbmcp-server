import { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { PostgreToolBase } from "../postgreTool";
import { z } from "zod";
import { ToolArgs, OperationType } from "../tool";

export class QueryTool extends PostgreToolBase {
    public name = "query";
    protected description = "Run a read-only SQL query";
    protected argsShape = {
        sql: z.string().describe("The SQL query to execute"),
    };

    public operationType: OperationType = "query";

    protected async execute({ sql }: ToolArgs<typeof this.argsShape>): Promise<CallToolResult> {
        const client = await this.connectToPostgre();
        try {
            await client.query("BEGIN TRANSACTION READ ONLY");
            const result = await client.query(sql);
            return {
                content: [
                    { 
                        type: "text", 
                        text: JSON.stringify(result.rows, null, 2) 
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
}
