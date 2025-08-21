import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
//@@import { createListMongoTool } from '../tools/index.js';
import { MongoDbTools } from "../tools/tools";

export function createMcpServer(context: any) {
  const server = new McpServer({
    name: 'dbmcp-server',
    version: '1.0.0',
  });

  // Pass context to the tool so it can use the mongoUri
  //@@ const tool = createListMongoTool(context);
  // server.registerTool(tool.name, { ...tool }, tool.execute);
  registerTools(server, context);

  return server;
}

//@@ function registerTools(server: McpServer, context: any) {
//     for (const toolConstructor of [...MongoDbTools]) {
//         const tool = new toolConstructor(context);
//         server.registerTool(tool.name, { ...tool }, tool.execute);
//     }
// }

function registerTools(server: McpServer, context: any) {
    for (const toolConstructor of [...MongoDbTools]) {
        const tool = new toolConstructor(context);
        tool.registerTool(server);
    }
}

// -> Register the resources
//@@ server.registerResource(
//   createAppConfigResource().name,
//   createAppConfigResource().resourceUri,
//   {
//     title: createAppConfigResource().title,
//     description: createAppConfigResource().description,
//     mimeType: createAppConfigResource().mimeType,
//   },
//   createAppConfigResource().execute
// );

// server.registerResource(
//   createUserProfileResource().name,
//   createUserProfileResource().resourceUri,
//   {
//     title: createUserProfileResource().name,
//     description: createUserProfileResource().description,
//   },
//   createUserProfileResource().execute
// );