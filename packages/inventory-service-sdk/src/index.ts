// Committed barrel — re-exports from generated/ (which is gitignored).
// Run `pnpm codegen` to regenerate the generated/ directory.

// configure() sets the base URL for all generated client functions.
export { configure } from './fetcher';

// Generated fetch client functions (e.g. getProduct, updateStock)
// Generated mock factories (e.g. getGetProductResponseMock)
// Generated MSW handlers (e.g. getGetProductMockHandler, getInventoryServiceMock)
export * from './generated/client';

// Generated TypeScript types from the OpenAPI schema components
export * from './generated/model';
