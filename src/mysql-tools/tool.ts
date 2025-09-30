import { z, type ZodRawShape, type ZodNever } from "zod";
import type { ToolCallback } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { CallToolResult, ToolAnnotations } from "@modelcontextprotocol/sdk/types.js";

export type ToolArgs<Args extends ZodRawShape> = z.objectOutputType<Args, ZodNever>;

export type OperationType = "query";
export type TelemetryToolMetadata = {
    projectId?: string;
    orgId?: string;
};

export abstract class ToolBase {
    public abstract name: string;
    public abstract operationType: OperationType;
    protected abstract description: string;
    protected abstract argsShape: ZodRawShape;

    protected get annotations(): ToolAnnotations {
        const annotations: ToolAnnotations = {
            title: this.name,
            description: this.description,
        };

        switch (this.operationType) {
            case "query":
            default:
                break;
        }

        return annotations;
    }

    protected abstract execute(...args: Parameters<ToolCallback<typeof this.argsShape>>): Promise<CallToolResult>;

    constructor(
        protected readonly context: any
    ) {}

    // This method is intended to be overridden by subclasses to handle errors
    protected handleError(
        error: unknown,
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        args: ToolArgs<typeof this.argsShape>
    ): Promise<CallToolResult> | CallToolResult {
        return {
            content: [
                {
                    type: "text",
                    text: `Error running ${this.name}: ${error instanceof Error ? error.message : String(error)}`,
                },
            ],
            isError: true,
        };
    }
}
