import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { MongoDbTools } from "../mongodb-tools/tools";
import { PostgreTools } from '../postgre-tools/tools';

type Context =  { connectionStr: string, dbtype: string };

export function createMcpServer(context: Context) {
  const server = new McpServer({
    name: 'dbmcp-server',
    version: '1.0.0',
  });

  // Pass context to the tool so it can use the connection string
  registerTools(server, context);
  return server;
}

function registerTools(server: McpServer, context: Context) {
  if(context.dbtype === 'mongodb') {
    for (const toolConstructor of [...MongoDbTools]) {
      const tool = new toolConstructor(context);
      tool.registerTool(server);
    }
  }
  else if(context.dbtype === 'postgres') {
    for (const toolConstructor of [...PostgreTools]) {
      const tool = new toolConstructor(context);
      tool.registerTool(server);
    }
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