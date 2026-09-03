import { api, TIMEOUT_GRAVACAO_MS } from "./api";
import { clearAuthSession, saveAuthSession } from "./storage";

type AuthenticateResponse = {
  token: string;
  codUsu: number;
  codEmp: number;
};

export async function login(usuario: string, password: string) {
  const { data } = await api.post<AuthenticateResponse>(
    "/authenticate",
    {
      usuario: usuario.toUpperCase().trim(),
      password,
    },
    { timeout: TIMEOUT_GRAVACAO_MS },
  );

  await saveAuthSession({ ...data, nomeUsuario: usuario });

  return data;
}

export async function logout() {
  try {
    await api.post("/logout");
  } finally {
    await clearAuthSession();
  }
}
