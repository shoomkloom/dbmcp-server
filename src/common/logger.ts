import fs from "fs/promises";
import { mongoLogId, MongoLogId, MongoLogManager, MongoLogWriter } from "mongodb-log-writer";
import redact from "mongodb-redact";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { LoggingMessageNotification } from "@modelcontextprotocol/sdk/types.js";
import { EventEmitter } from "events";

export type LogLevel = LoggingMessageNotification["params"]["level"];

export const LogId = {
    serverStartFailure: mongoLogId(1_000_001),
    serverInitialized: mongoLogId(1_000_002),
    serverCloseRequested: mongoLogId(1_000_003),
    serverClosed: mongoLogId(1_000_004),
    serverCloseFailure: mongoLogId(1_000_005),
    serverDuplicateLoggers: mongoLogId(1_000_006),

    atlasCheckCredentials: mongoLogId(1_001_001),
    atlasDeleteDatabaseUserFailure: mongoLogId(1_001_002),
    atlasConnectFailure: mongoLogId(1_001_003),
    atlasInspectFailure: mongoLogId(1_001_004),
    atlasConnectAttempt: mongoLogId(1_001_005),
    atlasConnectSucceeded: mongoLogId(1_001_006),
    atlasApiRevokeFailure: mongoLogId(1_001_007),
    atlasIpAccessListAdded: mongoLogId(1_001_008),
    atlasIpAccessListAddFailure: mongoLogId(1_001_009),

    telemetryDisabled: mongoLogId(1_002_001),
    telemetryEmitFailure: mongoLogId(1_002_002),
    telemetryEmitStart: mongoLogId(1_002_003),
    telemetryEmitSuccess: mongoLogId(1_002_004),
    telemetryMetadataError: mongoLogId(1_002_005),
    telemetryDeviceIdFailure: mongoLogId(1_002_006),
    telemetryDeviceIdTimeout: mongoLogId(1_002_007),

    toolExecute: mongoLogId(1_003_001),
    toolExecuteFailure: mongoLogId(1_003_002),
    toolDisabled: mongoLogId(1_003_003),

    mongodbConnectFailure: mongoLogId(1_004_001),
    mongodbDisconnectFailure: mongoLogId(1_004_002),

    toolUpdateFailure: mongoLogId(1_005_001),
    resourceUpdateFailure: mongoLogId(1_005_002),

    streamableHttpTransportStarted: mongoLogId(1_006_001),
    streamableHttpTransportSessionCloseFailure: mongoLogId(1_006_002),
    streamableHttpTransportSessionCloseNotification: mongoLogId(1_006_003),
    streamableHttpTransportSessionCloseNotificationFailure: mongoLogId(1_006_004),
    streamableHttpTransportRequestFailure: mongoLogId(1_006_005),
    streamableHttpTransportCloseFailure: mongoLogId(1_006_006),
} as const;

interface LogPayload {
    id: MongoLogId;
    context: string;
    message: string;
    noRedaction?: boolean | LoggerType | LoggerType[];
    attributes?: Record<string, string>;
}

export type LoggerType = "console" | "disk" | "mcp";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type EventMap<T> = Record<keyof T, any[]> | DefaultEventMap;
type DefaultEventMap = [never];

export abstract class LoggerBase<T extends EventMap<T> = DefaultEventMap> extends EventEmitter<T> {
    private readonly defaultUnredactedLogger: LoggerType = "mcp";

    public log(level: LogLevel, payload: LogPayload): void {
        // If no explicit value is supplied for unredacted loggers, default to "mcp"
        const noRedaction = payload.noRedaction !== undefined ? payload.noRedaction : this.defaultUnredactedLogger;

        this.logCore(level, {
            ...payload,
            message: this.redactIfNecessary(payload.message, noRedaction),
        });
    }

    protected abstract readonly type?: LoggerType;

    protected abstract logCore(level: LogLevel, payload: LogPayload): void;

    private redactIfNecessary(message: string, noRedaction: LogPayload["noRedaction"]): string {
        if (typeof noRedaction === "boolean" && noRedaction) {
            // If the consumer has supplied noRedaction: true, we don't redact the log message
            // regardless of the logger type
            return message;
        }

        if (typeof noRedaction === "string" && noRedaction === this.type) {
            // If the consumer has supplied noRedaction: logger-type, we skip redacting if
            // our logger type is the same as what the consumer requested
            return message;
        }

        if (
            typeof noRedaction === "object" &&
            Array.isArray(noRedaction) &&
            this.type &&
            noRedaction.indexOf(this.type) !== -1
        ) {
            // If the consumer has supplied noRedaction: array, we skip redacting if our logger
            // type is included in that array
            return message;
        }

        return redact(message);
    }

    public info(payload: LogPayload): void {
        this.log("info", payload);
    }

    public error(payload: LogPayload): void {
        this.log("error", payload);
    }
    public debug(payload: LogPayload): void {
        this.log("debug", payload);
    }

    public notice(payload: LogPayload): void {
        this.log("notice", payload);
    }

    public warning(payload: LogPayload): void {
        this.log("warning", payload);
    }

    public critical(payload: LogPayload): void {
        this.log("critical", payload);
    }

    public alert(payload: LogPayload): void {
        this.log("alert", payload);
    }

    public emergency(payload: LogPayload): void {
        this.log("emergency", payload);
    }
}

export class ConsoleLogger extends LoggerBase {
    protected readonly type: LoggerType = "console";

    protected logCore(level: LogLevel, payload: LogPayload): void {
        const { id, context, message } = payload;
        console.error(
            `[${level.toUpperCase()}] ${id.__value} - ${context}: ${message} (${process.pid}${this.serializeAttributes(payload.attributes)})`
        );
    }

    private serializeAttributes(attributes?: Record<string, string>): string {
        if (!attributes || Object.keys(attributes).length === 0) {
            return "";
        }
        return `, ${Object.entries(attributes)
            .map(([key, value]) => `${key}=${value}`)
            .join(", ")}`;
    }
}

export class DiskLogger extends LoggerBase<{ initialized: [] }> {
    private bufferedMessages: { level: LogLevel; payload: LogPayload }[] = [];
    private logWriter?: MongoLogWriter;

    public constructor(logPath: string, onError: (error: Error) => void) {
        super();

        void this.initialize(logPath, onError);
    }

    private async initialize(logPath: string, onError: (error: Error) => void): Promise<void> {
        try {
            await fs.mkdir(logPath, { recursive: true });

            const manager = new MongoLogManager({
                directory: logPath,
                retentionDays: 30,
                onwarn: console.warn,
                onerror: console.error,
                gzip: false,
                retentionGB: 1,
            });

            await manager.cleanupOldLogFiles();

            this.logWriter = await manager.createLogWriter();

            for (const message of this.bufferedMessages) {
                this.logCore(message.level, message.payload);
            }
            this.bufferedMessages = [];
            this.emit("initialized");
        } catch (error: unknown) {
            onError(error as Error);
        }
    }

    protected type: LoggerType = "disk";

    protected logCore(level: LogLevel, payload: LogPayload): void {
        if (!this.logWriter) {
            // If the log writer is not initialized, buffer the message
            this.bufferedMessages.push({ level, payload });
            return;
        }

        const { id, context, message } = payload;
        const mongoDBLevel = this.mapToMongoDBLogLevel(level);

        this.logWriter[mongoDBLevel]("MONGODB-MCP", id, context, message, payload.attributes);
    }

    private mapToMongoDBLogLevel(level: LogLevel): "info" | "warn" | "error" | "debug" | "fatal" {
        switch (level) {
            case "info":
                return "info";
            case "warning":
                return "warn";
            case "error":
                return "error";
            case "notice":
            case "debug":
                return "debug";
            case "critical":
            case "alert":
            case "emergency":
                return "fatal";
            default:
                return "info";
        }
    }
}

export class McpLogger extends LoggerBase {
    public constructor(private readonly server: McpServer) {
        super();
    }

    protected readonly type: LoggerType = "mcp";

    protected logCore(level: LogLevel, payload: LogPayload): void {
        // Only log if the server is connected
        if (!this.server?.isConnected()) {
            return;
        }

        void this.server.server.sendLoggingMessage({
            level,
            data: `[${payload.context}]: ${payload.message}`,
        });
    }
}

export class CompositeLogger extends LoggerBase {
    protected readonly type?: LoggerType;

    private readonly loggers: LoggerBase[] = [];
    private readonly attributes: Record<string, string> = {};

    constructor(...loggers: LoggerBase[]) {
        super();

        this.loggers = loggers;
    }

    public addLogger(logger: LoggerBase): void {
        this.loggers.push(logger);
    }

    public log(level: LogLevel, payload: LogPayload): void {
        // Override the public method to avoid the base logger redacting the message payload
        for (const logger of this.loggers) {
            logger.log(level, { ...payload, attributes: { ...this.attributes, ...payload.attributes } });
        }
    }

    protected logCore(): void {
        throw new Error("logCore should never be invoked on CompositeLogger");
    }

    public setAttribute(key: string, value: string): void {
        this.attributes[key] = value;
    }
}

export class NullLogger extends LoggerBase {
    protected type?: LoggerType;

    protected logCore(): void {
        // No-op logger, does not log anything
    }
}
