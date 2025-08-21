import { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { DbOperationArgs, MongoDBToolBase } from "../mongodbTool";
import { ToolArgs, OperationType } from "../tool";

export class ListCollectionsTool extends MongoDBToolBase {
    public name = "list-collections";
    protected description = "List all collections for a given database";
    protected argsShape = {
        database: DbOperationArgs.database,
    };

    public operationType: OperationType = "metadata";

    protected async execute({ database }: ToolArgs<typeof this.argsShape>): Promise<CallToolResult> {
        const client = await this.connectToMongoDB();
        const db = client.db(database);
        const collections = await db.listCollections().toArray();

        if (collections.length === 0) {
            return {
                content: [
                    {
                        type: "text",
                        text: `No collections found for database "${database}". To create a collection, use the "create-collection" tool.`,
                    },
                ],
            };
        }

        return {
            content: collections.map((collection) => {
                return {
                    text: `Name: "${collection.name}"`,
                    type: "text",
                };
            }),
        };
    }
}
