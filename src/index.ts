import express from 'express';
import { Request, Response } from 'express';
import cors from 'cors';
import { randomUUID } from 'node:crypto';
import NodeCache from 'node-cache';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { isInitializeRequest } from '@modelcontextprotocol/sdk/types.js';
import { createProxyMiddleware } from 'http-proxy-middleware';
import dotenv from "dotenv";
dotenv.config();
import { createMcpServer } from './server/index';
import { goatCounter } from "./middleware/goatcounter-middleware";

const app = express();
app.use(express.json());
app.set('trust proxy', true);
app.use(
  cors({
    origin: '*', // Adjust this to your mcp client app's origin
    exposedHeaders: ['mcp-session-id'],
    allowedHeaders: ['Content-Type', 'mcp-session-id', 'mcp-protocol-version', 'mongodb-password'],
  })
);

// Helpful: fail fast on bad config
if (!process.env.APP_URL) {
  throw new Error('APP_URL is not set');
}

// Store transports by session ID
const transportCache = new NodeCache({
  stdTTL: 3600, // 1-hour expiry
  checkperiod: 0,
  useClones: false, // MUST MUST include this config to store references instead of cloning objects
  // otherwise the StreamableHTTPServerTransport object will be broken!!!!!(It took me freaking hours to debug and fix this bummer!!!)
});

// small health endpoint to test the container itself
app.get('/_health', (_req, res) => res.status(200).send('ok'));

// Handle POST requests for client-to-server communication
app.post('/mcp', goatCounter({}), async (req, res) => {
  const sessionId = req.headers['mcp-session-id'];
  const mongodbPassword = req.query.mongodbpassword as string;
  console.log(`POST /mcp invoked with sessionId = ${sessionId}`);

  const mongoConnectionString = getMongoConnectionString(req.query.srvString as string, mongodbPassword);

  type SessionData = { transport: StreamableHTTPServerTransport };
  let sessionData: SessionData | null = null;
  if (typeof sessionId === 'string') {
    sessionData = transportCache.get(sessionId) as SessionData | null;
  }

  let transport = sessionData ? sessionData.transport : null;
  if (!transport && isInitializeRequest(req.body)) {
    transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: () => randomUUID(),
      onsessioninitialized: (newSessionId) => {
        transportCache.set(newSessionId, { transport });
      }
    });

    transport.onclose = () => {
      if (sessionId) transportCache.del(sessionId);
    };

    // Create a fresh MCP server instance with the per-session mongoUri
    const mcpServer = createMcpServer({ mongoUri: mongoConnectionString });
    await mcpServer.connect(transport);
  } 
  else if (!sessionData || !sessionData.transport) {
    res.status(400).json({
      jsonrpc: '2.0',
      error: { code: -32000, message: 'Bad Request: No valid session ID provided' },
      id: null,
    });
    return;
  }

  // Handle the request
  if (transport) {
    await transport.handleRequest(req, res, req.body);
  } 
  else {
    res.status(500).json({
      jsonrpc: '2.0',
      error: { code: -32001, message: 'Internal Server Error: Transport is null' },
      id: null,
    });
  }
});

function getMongoConnectionString(srvString: string, password: string) {
  const decodedConnectionString = decodeURIComponent(decodeURIComponent(srvString)).replace('mongodb srv', 'mongodb+srv');
  const mongoRegex = /^mongodb(?:\+srv)?:\/\/([^:@]+)(?::([^@]*))?@([^\s/]+)\/?/;
  const match = decodedConnectionString.match(mongoRegex);

  if(match) {
    const username = match[1];
    if(decodedConnectionString.startsWith('mongodb+srv://')) {
      return decodedConnectionString.replace(`mongodb+srv://${username}`, `mongodb+srv://${username}:${password}`);
    }
    else if(decodedConnectionString.startsWith('mongodb://')) {
      return decodedConnectionString.replace(`mongodb://${username}`, `mongodb://${username}:${password}`);
    }
  }
  else{
    throw new Error("Invalid SRV string format");
  }
}

// Reusable handler for GET and DELETE requests
type SessionData = { transport: StreamableHTTPServerTransport };

const handleSessionRequest = async (req: Request, res: Response) => {
  const sessionId = req.headers['mcp-session-id'] as string;
  console.log(`handleSessionRequest invoked with sessionId = ${sessionId}`);
  const sessionData: SessionData | null = sessionId ? transportCache.get(sessionId) as SessionData | null : null;
  if (!sessionData || !sessionData.transport) {
    res.status(400).send('Invalid or missing session ID');
    return;
  }
  // Handle the request
  await sessionData.transport.handleRequest(req, res);
};

// Handle GET requests for server-to-client notifications via SSE
app.get('/mcp', handleSessionRequest);

// Handle DELETE requests for session termination
app.delete('/mcp', handleSessionRequest);

//IMPORTNT: Add this last so all MCP requests are handled before the proxy
app.use(
  '/',
  createProxyMiddleware({
    target: process.env.APP_URL,
    changeOrigin: true,
    secure: true,
    ws: true,
    pathRewrite: {
      '^/': '/', // optional, keeps paths intact
    }
  })
);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`DBMCP Server running on port ${PORT}`);
});
