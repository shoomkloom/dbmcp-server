import { MongoClient } from 'mongodb';
import { z } from 'zod';

interface MongoToolContext {
  mongoUri: string;
}

export function createListMongoTool(context: MongoToolContext) {
  return {
    name: 'listMongoDatabasesAndCollections',
    title: 'list mongodb databases and collections',
    description: 'Lists all databases and collections in a MongoDB Atlas cluster',
    inputSchema: { connectToDb: z.boolean() },
    async execute({ connectToDb }: { connectToDb: boolean }) {
      const mongoUri = context.mongoUri;
      if (!mongoUri) {
        throw new Error('No MongoDB URI provided for this session.');
      }

      //console.log(`Connecting to MongoDB with URI: ${mongoUri}`);

      const client = new MongoClient(mongoUri);

      if (connectToDb) {
        await client.connect();
      } else {
        return;
      }

      try {
        // List databases
        const dbList = await client.db().admin().listDatabases();
        // use Promise.all for concurrent execution:
        const dbInfos = await Promise.all(
          dbList.databases.map(async ({ name: dbName }) => {
            const collections = (await client.db(dbName)
              .listCollections({}, { nameOnly: true })
              .toArray()).map((info) => info.name);
            return { database: dbName, collections };
          })
        );

        return { content: [{ type: 'text', text: JSON.stringify(dbInfos) }] };
      } finally {
        await client.close();
      }
    },
  };
}
