import axios, { type AxiosInstance, type AxiosError } from 'axios';

const apiHost = (() => {
  try {
    return new URL(import.meta.env.VITE_API_BASE_URL).hostname;
  } catch {
    return '';
  }
})();
// 发布态 UC 外网入口：当前访问域名 ≠ 构建期写死的厂内 API 域名，说明从 UC 域名进来，
// 改用「当前访问域名」拼出的绝对路径回到当前域名；dev/沙箱/预览/厂内发布/埋点均走原逻辑，保持不变
const isUcPublishEntry =
  !!apiHost && typeof window !== 'undefined' && window.location.hostname !== apiHost;
const baseURL = isUcPublishEntry
  ? `${window.location.origin}${import.meta.env.VITE_BASE_PATH || '/'}api`
  : `${import.meta.env.VITE_API_BASE_URL || ''}/api`;

const instance: AxiosInstance = axios.create({
  baseURL,
  timeout: 120000,
});

instance.interceptors.request.use((config) => {
  config.headers['original-url'] = window.location.href;
  const token = new URLSearchParams(window.location.search).get('token') ?? '';
  if (token) {
    config.headers['Authorization'] = token;
  }
  return config;
});

instance.interceptors.response.use(
  (response) => response,
  (error: AxiosError<{ redirectUrl?: string }>) => {
    if (error.response?.status === 401) {
      const redirectUrl = error.response.data?.redirectUrl;
      if (redirectUrl) {
        window.location.href = redirectUrl;
      }
    }
    return Promise.reject(error);
  }
);

export default instance;
