import { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { MysqlToolBase } from "../mysqlTool";
import { z } from "zod";
import { ToolArgs, OperationType } from "../tool";

export class ColumnTypesTool extends MysqlToolBase {
    public name = "column-types";
    protected description = "Get the column types of a specified table";
    protected argsShape = {
        table: z.string().describe("The name of the table to get column types for"),
    };

    public operationType: OperationType = "query";

    protected async execute({ table }: ToolArgs<typeof this.argsShape>): Promise<CallToolResult> {
        const client = await this.connectToMySQL();
        try {
            const [rows] = await client.query(
                `SELECT column_name, data_type FROM information_schema.columns WHERE table_name = ?`, 
                [table]
            );

            return {
                content: [
                    {
                        type: "text",
                        text: JSON.stringify(rows, null, 2),
                    },
                ],
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
