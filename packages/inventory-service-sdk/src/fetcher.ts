import Axios from 'axios';
import type { AxiosRequestConfig, AxiosResponse } from 'axios';

// Internal instance — holds the base URL for all SDK calls.
const instance = Axios.create({
  baseURL: process.env['INVENTORY_SERVICE_URL'] ?? 'http://localhost:3002',
});

// Call this once before using the SDK — e.g. configure('http://inventory.test') in tests.
export function configure(baseURL: string) {
  instance.defaults.baseURL = baseURL;
}

// Orval uses this as the mutator (set via orval.config.ts).
// Wrapping the instance in a function satisfies Orval's expectation of a callable mutator,
// while keeping the base URL configurable at runtime.
export const axiosInstance = <T>(config: AxiosRequestConfig): Promise<AxiosResponse<T>> =>
  instance(config);
