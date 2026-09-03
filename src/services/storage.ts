import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";

const SECURE_KEYS = {
  token: "prodbip_token",
} as const;

const STORAGE_KEYS = {
  codUsu: "@prodbip:codUsu",
  codEmp: "@prodbip:codEmp",
  nomeUsuario: "@prodbip:nomeUsuario",
} as const;

export type AuthSession = {
  token: string;
  codUsu: number;
  codEmp: number;
  nomeUsuario: string;
};

export async function saveAuthSession({
  token,
  codUsu,
  codEmp,
  nomeUsuario,
}: AuthSession) {
  await Promise.all([
    SecureStore.setItemAsync(SECURE_KEYS.token, token),
    AsyncStorage.multiSet([
      [STORAGE_KEYS.codUsu, String(codUsu)],
      [STORAGE_KEYS.codEmp, String(codEmp)],
      [STORAGE_KEYS.nomeUsuario, nomeUsuario],
    ]),
  ]);
}

export async function getAuthSession(): Promise<AuthSession | null> {
  const [token, [[, codUsu], [, codEmp], [, nomeUsuario]]] = await Promise.all([
    SecureStore.getItemAsync(SECURE_KEYS.token),
    AsyncStorage.multiGet([
      STORAGE_KEYS.codUsu,
      STORAGE_KEYS.codEmp,
      STORAGE_KEYS.nomeUsuario,
    ]),
  ]);

  if (!token || !codUsu || !codEmp) return null;

  return {
    token,
    codUsu: Number(codUsu),
    codEmp: Number(codEmp),
    nomeUsuario: nomeUsuario ?? "",
  };
}

export async function getToken(): Promise<string | null> {
  return SecureStore.getItemAsync(SECURE_KEYS.token);
}

export async function clearAuthSession() {
  await Promise.all([
    SecureStore.deleteItemAsync(SECURE_KEYS.token),
    AsyncStorage.multiRemove([
      STORAGE_KEYS.codUsu,
      STORAGE_KEYS.codEmp,
      STORAGE_KEYS.nomeUsuario,
    ]),
  ]);
}
