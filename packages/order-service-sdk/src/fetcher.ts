import Axios from 'axios';
import type { AxiosRequestConfig, AxiosResponse } from 'axios';

const instance = Axios.create({
  baseURL: process.env['ORDER_SERVICE_URL'] ?? 'http://localhost:3001',
});

export function configure(baseURL: string) {
  instance.defaults.baseURL = baseURL;
}

export const axiosInstance = <T>(config: AxiosRequestConfig): Promise<AxiosResponse<T>> =>
  instance(config);
