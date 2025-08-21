import { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { DbOperationArgs, MongoDBToolBase } from "../mongodbTool";
import { ToolArgs, OperationType } from "../tool";
import { z } from "zod";
import { checkIndexUsage } from "../../helpers/indexCheck";

export const CountArgs = {
    query: z
        .object({})
        .passthrough()
        .optional()
        .describe(
            "A filter/query parameter. Allows users to filter the documents to count. Matches the syntax of the filter argument of db.collection.count()."
        ),
};

export class CountTool extends MongoDBToolBase {
    public name = "count";
    protected description =
        "Gets the number of documents in a MongoDB collection using db.collection.count() and query as an optional filter parameter";
    protected argsShape = {
        ...DbOperationArgs,
        ...CountArgs,
    };

    public operationType: OperationType = "read";

    protected async execute({ database, collection, query }: ToolArgs<typeof this.argsShape>): Promise<CallToolResult> {
        const client = await this.connectToMongoDB();
        const db = client.db(database);
        const col = db.collection(collection);

        // Check if count operation uses an index if enabled
        //@@ await checkIndexUsage(database, collection, "count", async () => {
        //     return this.runCommandWithCheck(db, {
        //         explain: {
        //             count: collection,
        //             query,
        //         },
        //         verbosity: "queryPlanner",
        //     });
        // });

        const count = await col.countDocuments(query);

        return {
            content: [
                {
                    text: `Found ${count} documents in the collection "${collection}"`,
                    type: "text",
                },
            ],
        };
    }
}
