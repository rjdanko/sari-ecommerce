import Typesense from 'typesense';

// This key is search-only — it cannot modify data
const typesenseClient = new Typesense.Client({
  nodes: [
    {
      host: process.env.NEXT_PUBLIC_TYPESENSE_HOST || 'localhost',
      port: parseInt(process.env.NEXT_PUBLIC_TYPESENSE_PORT || '8108'),
      protocol: process.env.NEXT_PUBLIC_TYPESENSE_PROTOCOL || 'http',
    },
  ],
  apiKey: process.env.NEXT_PUBLIC_TYPESENSE_SEARCH_ONLY_KEY || '',
  connectionTimeoutSeconds: 2,
});

export default typesenseClient;
