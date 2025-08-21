import { z } from "zod";
import { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { DbOperationArgs, MongoDBToolBase } from "../mongodbTool";
import { ToolArgs, OperationType } from "../tool";
import { EJSON } from "bson";
import { checkIndexUsage } from "../../helpers/indexCheck";

export const AggregateArgs = {
    pipeline: z.array(z.object({}).passthrough()).describe("An array of aggregation stages to execute"),
};

export class AggregateTool extends MongoDBToolBase {
    public name = "aggregate";
    protected description = "Run an aggregation against a MongoDB collection";
    protected argsShape = {
        ...DbOperationArgs,
        ...AggregateArgs,
    };
    public operationType: OperationType = "read";

    protected async execute({
        database,
        collection,
        pipeline,
    }: ToolArgs<typeof this.argsShape>): Promise<CallToolResult> {
        const client = await this.connectToMongoDB();
        const db = client.db(database);
        const col = db.collection(collection);

        // Check if aggregate operation uses an index if enabled
        //@@ await checkIndexUsage(database, collection, "aggregate", async () => {
        //     return col.aggregate(pipeline, {writeConcern: undefined})
        //         .explain("queryPlanner");
        // });

        const documents = await col.aggregate(pipeline).toArray();

        const content: Array<{ text: string; type: "text" }> = [
            {
                text: `Found ${documents.length} documents in the collection "${collection}":`,
                type: "text",
            },
            ...documents.map((doc) => {
                return {
                    text: EJSON.stringify(doc),
                    type: "text",
                } as { text: string; type: "text" };
            }),
        ];

        return {
            content,
        };
    }
}
