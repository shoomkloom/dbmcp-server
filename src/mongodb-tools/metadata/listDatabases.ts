import { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { MongoDBToolBase } from "../mongodbTool";
import { OperationType } from "../tool";
type DbInfo = { name: string; sizeOnDisk: number };


export class ListDatabasesTool extends MongoDBToolBase {
    public name = "list-databases";
    protected description = "List all databases for a MongoDB connection";
    protected argsShape = {};
    public operationType: OperationType = "metadata";

    protected async execute(): Promise<CallToolResult> {
        const client = await this.connectToMongoDB();
        const { databases } = await client.db().admin().listDatabases();
        const dbs: DbInfo[] = databases.map(db => ({
            name: db.name,
            sizeOnDisk: db.sizeOnDisk ?? 0
        }));

        return {
            content: dbs.map((db) => {
                return {
                    text: `Name: ${db.name}, Size: ${db.sizeOnDisk.toString()} bytes`,
                    type: "text",
                };
            }),
        };
    }
}
