import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";
import { Alerta, AlertaConteudo } from "./Alerta";

type ConfirmarOpcoes = {
  titulo: string;
  mensagem?: string;
  textoConfirmar: string;
  textoCancelar?: string;

  destrutivo?: boolean;
  onConfirmar: () => void;
};

type AlertaContextValue = {
  alertaErro: (titulo: string, mensagem?: string) => void;
  alertaAviso: (titulo: string, mensagem?: string) => void;
  alertaSucesso: (titulo: string, mensagem?: string) => void;
  confirmar: (opcoes: ConfirmarOpcoes) => void;

  mostrarAlerta: (conteudo: AlertaConteudo) => void;
};

const AlertaContext = createContext<AlertaContextValue | null>(null);

export function AlertaProvider({ children }: { children: ReactNode }) {
  const [conteudo, setConteudo] = useState<AlertaConteudo | null>(null);

  const mostrarAlerta = useCallback((novo: AlertaConteudo) => {
    setConteudo(novo);
  }, []);

  const alertaErro = useCallback((titulo: string, mensagem?: string) => {
    setConteudo({ tipo: "erro", titulo, ...(mensagem ? { mensagem } : {}) });
  }, []);

  const alertaAviso = useCallback((titulo: string, mensagem?: string) => {
    setConteudo({ tipo: "aviso", titulo, ...(mensagem ? { mensagem } : {}) });
  }, []);

  const alertaSucesso = useCallback((titulo: string, mensagem?: string) => {
    setConteudo({ tipo: "sucesso", titulo, ...(mensagem ? { mensagem } : {}) });
  }, []);

  const confirmar = useCallback(
    ({
      titulo,
      mensagem,
      textoConfirmar,
      textoCancelar = "Cancelar",
      destrutivo,
      onConfirmar,
    }: ConfirmarOpcoes) => {
      setConteudo({
        tipo: "aviso",
        titulo,
        ...(mensagem ? { mensagem } : {}),

        botoes: [
          { texto: textoCancelar, variante: "secondary" },
          {
            texto: textoConfirmar,
            variante: destrutivo ? "destructive" : "primary",
            onPress: onConfirmar,
          },
        ],
      });
    },
    [],
  );

  const value = useMemo(
    () => ({
      alertaErro,
      alertaAviso,
      alertaSucesso,
      confirmar,
      mostrarAlerta,
    }),
    [alertaErro, alertaAviso, alertaSucesso, confirmar, mostrarAlerta],
  );

  return (
    <AlertaContext.Provider value={value}>
      {children}
      <Alerta conteudo={conteudo} onFechar={() => setConteudo(null)} />
    </AlertaContext.Provider>
  );
}

export function useAlerta() {
  const context = useContext(AlertaContext);

  if (!context) {
    throw new Error("useAlerta precisa estar dentro de AlertaProvider.");
  }

  return context;
}
