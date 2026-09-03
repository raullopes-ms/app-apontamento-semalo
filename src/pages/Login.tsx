import axios from "axios";
import { useState } from "react";
import { Image, View } from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { useAlerta } from "../components/AlertaProvider";
import { Button } from "../components/Button";
import { Input } from "../components/Input";
import { login } from "../services/auth";
import { getFriendlyErrorMessage } from "../services/errors";

type LoginProps = {
  onLoginSuccess?: () => void;
};

export function Login({ onLoginSuccess }: LoginProps) {
  const [user, setUser] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const { alertaErro, alertaAviso } = useAlerta();

  async function handleLogin() {
    if (!user.trim() || !password) {
      alertaAviso(
        "Preencha usuário e senha",
        "Informe os dois campos para entrar.",
      );
      return;
    }

    setLoading(true);
    try {
      await login(user.toUpperCase().trim(), password);
      onLoginSuccess?.();
    } catch (err) {
      const status = axios.isAxiosError(err) ? err.response?.status : undefined;

      if (status === 400) {
        alertaErro(
          "Usuário ou senha inválidos",
          "Confira os dados informados e tente novamente.",
        );
        return;
      }

      if (status === 409) {
        alertaAviso(
          "Usuário já conectado",
          getFriendlyErrorMessage(
            err,
            "Esse usuário já está logado em outro dispositivo. Faça logout antes de tentar novamente.",
          ),
        );
        return;
      }

      alertaErro(
        "Não foi possível entrar",
        status
          ? "O servidor não conseguiu concluir o login agora. Tente novamente em alguns instantes."
          : getFriendlyErrorMessage(
              err,
              "Tente novamente em alguns instantes.",
            ),
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAwareScrollView
      bottomOffset={24}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
      className="flex-1 bg-slate-50"
      contentContainerClassName="flex-grow justify-center items-center px-6"
    >
      <Image
        resizeMode="contain"
        source={require("../assets/logo.png")}
        className="mb-10 h-24 w-48"
      />
      <View className="w-full gap-4">
        <Input
          label="Usuário"
          placeholder="Usuário"
          autoCapitalize="none"
          autoCorrect={false}
          value={user}
          onChangeText={setUser}
        />
        <Input
          label="Senha"
          placeholder="••••••••"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />
        <Button title="Entrar" loading={loading} onPress={handleLogin} />
      </View>
    </KeyboardAwareScrollView>
  );
}
