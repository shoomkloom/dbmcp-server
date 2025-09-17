import { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { DbOperationArgs, MongoDBToolBase } from "../mongodbTool";
import { ToolArgs, OperationType } from "../tool";

export class CollectionIndexesTool extends MongoDBToolBase {
    public name = "collection-indexes";
    protected description = "Describe the indexes for a collection";
    protected argsShape = DbOperationArgs;
    public operationType: OperationType = "read";

    protected async execute({ database, collection }: ToolArgs<typeof DbOperationArgs>): Promise<CallToolResult> {
        const client = await this.connectToMongoDB();
        const db = client.db(database);
        const col = db.collection(collection);
        const indexes = await col.indexes();

        return {
            content: [
                {
                    text: `Found ${indexes.length} indexes in the collection "${collection}":`,
                    type: "text",
                },
                ...(indexes.map((indexDefinition) => {
                    return {
                        text: `Name "${indexDefinition.name}", definition: ${JSON.stringify(indexDefinition.key)}`,
                        type: "text",
                    };
                }) as { text: string; type: "text" }[]),
            ],
        };
    }

    protected handleError(
        error: unknown,
        args: ToolArgs<typeof this.argsShape>
    ): Promise<CallToolResult> | CallToolResult {
        if (error instanceof Error && "codeName" in error && error.codeName === "NamespaceNotFound") {
            return {
                content: [
                    {
                        text: `The indexes for "${args.database}.${args.collection}" cannot be determined because the collection does not exist.`,
                        type: "text",
                    },
                ],
            };
        }

        return super.handleError(error, args);
    }
}
