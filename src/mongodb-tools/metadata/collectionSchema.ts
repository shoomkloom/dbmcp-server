import { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { DbOperationArgs, MongoDBToolBase } from "../mongodbTool";
import { ToolArgs, OperationType } from "../tool";
import { getSimplifiedSchema } from "mongodb-schema";

export class CollectionSchemaTool extends MongoDBToolBase {
    public name = "collection-schema";
    protected description = "Describe the schema for a collection";
    protected argsShape = DbOperationArgs;

    public operationType: OperationType = "metadata";

    protected async execute({ database, collection }: ToolArgs<typeof DbOperationArgs>): Promise<CallToolResult> {
        const client = await this.connectToMongoDB();
        const db = client.db(database);
        const col = db.collection(collection);
        // Find documents with an empty filter {} and a limit of 5
        const docs = await col.find({}, { limit: 5 }).toArray();
        const schema = await getSimplifiedSchema(docs);

        const fieldsCount = Object.entries(schema).length;
        if (fieldsCount === 0) {
            return {
                content: [
                    {
                        text: `Could not deduce the schema for "${database}.${collection}". This may be because it doesn't exist or is empty.`,
                        type: "text",
                    },
                ],
            };
        }

        return {
            content: [
                {
                    text: `Found ${fieldsCount} fields in the schema for "${database}.${collection}"`,
                    type: "text",
                },
                {
                    text: JSON.stringify(schema),
                    type: "text",
                },
            ],
        };
    }
}
