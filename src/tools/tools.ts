import { ListCollectionsTool } from "./metadata/listCollections";
import { CollectionIndexesTool } from "./read/collectionIndexes";
import { ListDatabasesTool } from "./metadata/listDatabases";
import { CollectionSchemaTool } from "./metadata/collectionSchema";
import { FindTool } from "./read/find";
import { CollectionStorageSizeTool } from "./metadata/collectionStorageSize";
import { CountTool } from "./read/count";
import { DbStatsTool } from "./metadata/dbStats";
import { AggregateTool } from "./read/aggregate";
import { ExplainTool } from "./metadata/explain";
import { LogsTool } from "./metadata/logs";

export const MongoDbTools = [
    ListCollectionsTool,
    ListDatabasesTool,
    CollectionIndexesTool,
    CollectionSchemaTool,
    FindTool,
    CollectionStorageSizeTool,
    CountTool,
    DbStatsTool,
    AggregateTool,
    ExplainTool,
    LogsTool,
];
