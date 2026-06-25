import { defineConfig } from 'orval';

// Orval reads the OpenAPI spec and generates:
//   src/generated/client.ts     — typed axios wrapper functions
//   src/generated/client.msw.ts — MSW v2 handlers + faker-based mock factories
//   src/generated/model/        — TypeScript interfaces (one file per schema)
export default defineConfig({
  'inventory-service': {
    input: {
      target: '../inventory-service/openapi.yaml',
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
        // axiosInstance is called by every generated client function.
        // It's a pre-configured axios instance, so no custom response-shaping needed —
        // axios already returns { data, status, headers } by default.
        mutator: {
          path: './src/fetcher.ts',
          name: 'axiosInstance',
        },
      },
    },
  },
});
