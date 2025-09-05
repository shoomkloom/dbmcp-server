# dbmcp-server

**dbmcp-server** is a lightweight online server that works together with [dbmcp-app](https://github.com/shoomkloom/dbmcp-app) to provide an instant **MongoDB MCP server** that can be used from any AI agent.

## Overview

This project allows you to quickly spin up a MongoDB MCP-compatible server without any local installation.  
It is designed to be used **online only** and integrates seamlessly with any ai agent.

- **Server** (this repo): Backend service that exposes MongoDB as an MCP server over the web.  
- [**App**](https://github.com/shoomkloom/dbmcp-app): A companion frontend application that makes it easy to connect, configure, and interact with the server.

Together, they provide a plug-and-play solution for using MongoDB as a knowledge and context provider inside AI-driven workflows.

## Features

- 🌐 Online-only usage — no installation required.
- ⚡ Instant setup with any ai agent.
- 🗄️ Direct connection to your MongoDB cluster with MCP compatibility.
- 🤖 Ready-to-use with AI agents and automation pipelines.

## Getting Started

1. Go to [dbmcp.me](https://dbmcp.me).  
2. Provide your MongoDB connection details.  
3. MCP configuration details will be created instantly.  
4. Use the generated MCP server endpoint in your AI agent.

## License

MIT License. See the [LICENSE](LICENSE) for details.

Parts of the code were coppied from the official 'mongodb-mcp-server' repo:
https://github.com/mongodb-js/mongodb-mcp-server

You can find the appropriate License here:
https://github.com/mongodb-js/mongodb-mcp-server/blob/main/LICENSE
