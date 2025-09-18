import { z } from "zod";
import { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { DbOperationArgs, MongoDBToolBase } from "../mongodbTool";
import { ToolArgs, OperationType } from "../tool";
import { EJSON } from "bson";

const WRITE_STAGE_KEYS = new Set<string>(["$out", "$merge"]);

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
        //Block write-capable stages anywhere in the pipeline tree
        if (this.containsWriteStage(pipeline)) {
            return {
                content: [
                    {
                        text: `Aggregate write stages ($out/$merge) are not permitted on DBMCP.`,
                        type: "text",
                    },
                ],
            };
        }

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

    protected containsWriteStage(node: unknown): boolean {
        if (!node) return false;

        if (Array.isArray(node)) {
            for (const v of node) if (this.containsWriteStage(v)) return true;
            return false;
        }

        if (typeof node === "object") {
            for (const [k, v] of Object.entries(node as Record<string, unknown>)) {
                if (WRITE_STAGE_KEYS.has(k)) return true;
                if (this.containsWriteStage(v)) return true; // recurse into nested pipelines (e.g., $facet/$unionWith)
            }
        }

        return false;
    }
}
