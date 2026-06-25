import { defineConfig } from 'orval';

export default defineConfig({
  'order-service': {
    input: {
      target: '../order-service/openapi.yaml',
    },
    output: {
      mode: 'single',
      target: './src/generated/client.ts',
      schemas: './src/generated/model',
      client: 'axios',
      mock: {
        type: 'msw',
        delay: false,
      },
      override: {
        mutator: {
          path: './src/fetcher.ts',
          name: 'axiosInstance',
        },
      },
    },
  },
});
