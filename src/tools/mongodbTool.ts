import { z } from "zod";
import { ToolBase } from "./tool";
import { Db, MongoClient } from 'mongodb';
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

export const DbOperationArgs = {
    database: z.string().describe("Database name"),
    collection: z.string().describe("Collection name"),
};

export abstract class MongoDBToolBase extends ToolBase {

    protected connectToMongoDB(): Promise<MongoClient> {
        const mongoUri = this.context.mongoUri;
        if (!mongoUri) {
            throw new Error('No MongoDB URI provided for this session.');
        }

        console.log(`Connecting to MongoDB with URI: ${mongoUri}`);

        const client = new MongoClient(mongoUri);
        return client.connect();
    }

    protected async runCommandWithCheck(db: Db, command: any) {
        const result = await db.command(command);
        if (!result.ok) {
            throw new Error(`Command failed: ${JSON.stringify(result)}`);
        }
        return result;
    }

    public registerTool(server: McpServer) {
        server.registerTool(this.name, {
            description: this.description,  
            inputSchema: this.argsShape,
            annotations: this.annotations,
        }, this.execute.bind(this));
    }


    //@@ protected resolveTelemetryMetadata(
    //     // eslint-disable-next-line @typescript-eslint/no-unused-vars
    //     args: ToolArgs<typeof this.argsShape>
    // ): TelemetryToolMetadata {
    //     const metadata: TelemetryToolMetadata = {};

    //     // Add projectId to the metadata if running a MongoDB operation to an Atlas cluster
    //     if (this.session.connectedAtlasCluster?.projectId) {
    //         metadata.projectId = this.session.connectedAtlasCluster.projectId;
    //     }

    //     return metadata;
    // }
}
