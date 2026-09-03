import axios from "axios";

export function getFriendlyErrorMessage(
  error: unknown,
  fallback: string,
): string {
  if (axios.isAxiosError(error)) {
    if (!error.response) {
      if (error.code === "ECONNABORTED" || error.code === "ETIMEDOUT") {
        return "O servidor demorou demais para responder. Aguarde alguns segundos e tente novamente.";
      }

      return "Não foi possível conectar ao servidor. Verifique sua conexão e tente novamente.";
    }

    const dadosErro = error.response.data as { error?: string } | undefined;
    if (typeof dadosErro?.error === "string") {
      return dadosErro.error;
    }

    if (error.response.status === 429) {
      return "Muitas leituras em sequência. Aguarde cerca de um minuto e continue de onde parou — a última leitura não foi registrada.";
    }
  }
  return fallback;
}
