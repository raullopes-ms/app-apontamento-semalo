import axios from "axios";
import { emitUnauthorized } from "./authEvents";
import { clearAuthSession, getToken } from "./storage";

const BASE_URL = process.env.EXPO_PUBLIC_API_URL;

if (!BASE_URL) {
  throw new Error(
    "EXPO_PUBLIC_API_URL não definida. Configure o .env antes de iniciar o app ou gerar o build.",
  );
}

const TIMEOUT_LEITURA_MS = 15_000;
export const TIMEOUT_GRAVACAO_MS = 45_000;

export const api = axios.create({
  baseURL: BASE_URL,
  timeout: TIMEOUT_LEITURA_MS,
});

api.interceptors.request.use(async (config) => {
  const token = await getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const isAuthEndpoint =
      axios.isAxiosError(error) && error.config?.url?.includes("/authenticate");

    if (
      axios.isAxiosError(error) &&
      error.response?.status === 401 &&
      !isAuthEndpoint
    ) {
      await clearAuthSession();
      emitUnauthorized();
    }

    return Promise.reject(error);
  },
);
