import axios from "axios";
import { api, TIMEOUT_GRAVACAO_MS } from "./api";

export async function iniciarAtividade(idiAtv: number) {
  try {
    await api.post(
      "/iniciar-atividade",
      { idiatv: idiAtv },
      { timeout: TIMEOUT_GRAVACAO_MS },
    );
  } catch (error) {
    if (axios.isAxiosError(error)) {
      console.error("Erro ao iniciar atividade:", {
        url: error.config?.url,
        payloadEnviado: error.config?.data,
        status: error.response?.status,
        respostaDoBackend: error.response?.data,
      });
    } else {
      console.error("Erro ao iniciar atividade:", error);
    }
    throw error;
  }
}
type CriarApontamentoPayload = {
  idiAtv: number;
  codProd: number;
  qtdProduzir: number;
};

type CriarApontamentoResponse = {
  nuapo: number;
};

export async function criarApontamento({
  idiAtv,
  codProd,
  qtdProduzir,
}: CriarApontamentoPayload): Promise<CriarApontamentoResponse> {
  try {
    const { data } = await api.post<CriarApontamentoResponse>(
      "/criar-apontamento",
      {
        idiatv: idiAtv,
        codprod: codProd,
        qtdproduzir: qtdProduzir,
      },
      { timeout: TIMEOUT_GRAVACAO_MS },
    );
    return data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      console.error("Erro ao criar apontamento:", {
        url: error.config?.url,
        payloadEnviado: error.config?.data,
        status: error.response?.status,
        respostaDoBackend: error.response?.data,
      });
    } else {
      console.error("Erro ao criar apontamento:", error);
    }
    throw error;
  }
}
type SalvarApontamentoWmsPayload = {
  idiProc: number;
  codprod: number;
  qtdeapo: number;
  status: string;

  palete?: string;

  producao?: string;
  validade?: string;
  lote?: string;
  seqlote?: string;
};
type SalvarApontamentoWmsResponse = {
  apontamento: { id: number };
};

export async function salvarApontamentoWms({
  idiProc,
  codprod,
  qtdeapo,
  status,
  palete,
  producao,
  validade,
  lote,
  seqlote,
}: SalvarApontamentoWmsPayload): Promise<number> {
  try {
    const { data } = await api.post<SalvarApontamentoWmsResponse>(
      "/salvar-wms",
      {
        idiproc: idiProc,
        codprod,
        qtdeapo,
        status,
        palete,
        producao,
        validade,
        lote,
        seqlote,
      },
      { timeout: TIMEOUT_GRAVACAO_MS },
    );

    return data.apontamento.id;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      console.error("Erro ao salvar apontamento WMS:", {
        url: error.config?.url,
        payloadEnviado: error.config?.data,
        status: error.response?.status,
        respostaDoBackend: error.response?.data,
      });
    }
    throw error;
  }
}
export type ApontamentoPendente = {
  id: number;
  idiproc: number;
  codprod: string;
  qtdeapo: number;
  codusu: string;
  dhapo: string;
  status: string;
  palete: string | null;

  producao: string | null;
  validade: string | null;
  lote: string | null;
  seqlote: string | null;
};

type ApontamentosPendentesResponse = {
  apontamentos: ApontamentoPendente[];
};

export async function getApontamentosPendentes(
  idiProc: number,
): Promise<ApontamentoPendente[]> {
  try {
    const { data } = await api.get<ApontamentosPendentesResponse>(
      `/pendentes/${idiProc}`,
    );
    return data.apontamentos;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      console.error("Erro ao buscar apontamentos pendentes:", {
        url: error.config?.url,
        status: error.response?.status,
        respostaDoBackend: error.response?.data,
      });
    } else {
      console.error("Erro ao buscar apontamentos pendentes:", error);
    }
    throw error;
  }
}

export async function apagarApontamentosPendentes(
  ids: number[],
  contexto?: { idiProc?: number; palete?: string },
): Promise<void> {
  try {
    await api.post(
      "/pendentes/apagar",
      { ids, idiproc: contexto?.idiProc, palete: contexto?.palete },
      { timeout: TIMEOUT_GRAVACAO_MS },
    );
  } catch (error) {
    if (axios.isAxiosError(error)) {
      console.error("Erro ao apagar apontamentos pendentes:", {
        url: error.config?.url,
        payloadEnviado: error.config?.data,
        status: error.response?.status,
        respostaDoBackend: error.response?.data,
      });
    } else {
      console.error("Erro ao apagar apontamentos pendentes:", error);
    }
    throw error;
  }
}

export async function baixarFardosDeSeguranca(
  ids: number[],
  contexto?: { idiProc?: number; palete?: string },
): Promise<boolean> {
  if (ids.length === 0) return true;

  for (let tentativa = 1; tentativa <= 2; tentativa++) {
    try {
      await apagarApontamentosPendentes(ids, contexto);
      return true;
    } catch {}
  }

  return false;
}

export class ApontamentoJaConfirmadoError extends Error {
  constructor(
    public readonly nuapo: number,
    public readonly qtdApontada: number | null,
  ) {
    super("Apontamento já confirmado no ERP.");
  }
}

export const NUNOTA_DESCONHECIDO = 0;

type ConfirmarApontamentoPayload = {
  idiAtv: number;
  nuapo: number;
};

type ConfirmarApontamentoResponse = {
  apontamento: {
    sucesso: boolean;
    nunota: number;
  };
};

export async function confirmarApontamento({
  idiAtv,
  nuapo,
}: ConfirmarApontamentoPayload): Promise<{ nunota: number }> {
  try {
    const { data } = await api.post<ConfirmarApontamentoResponse>(
      "/confirmar-apontamento",
      {
        idiatv: idiAtv,
        nuapo,
      },
      { timeout: TIMEOUT_GRAVACAO_MS },
    );
    return { nunota: data.apontamento.nunota };
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.status === 409) {
      const dados = error.response.data as
        | { codigo?: string; nuapo?: number; qtdApontada?: number | null }
        | undefined;

      if (dados?.codigo === "APONTAMENTO_JA_CONFIRMADO") {
        throw new ApontamentoJaConfirmadoError(
          dados.nuapo ?? nuapo,
          dados.qtdApontada ?? null,
        );
      }
    }

    if (axios.isAxiosError(error)) {
      console.error("Erro ao confirmar apontamento:", {
        url: error.config?.url,
        payloadEnviado: error.config?.data,
        status: error.response?.status,
        respostaDoBackend: error.response?.data,
      });
    } else {
      console.error("Erro ao confirmar apontamento:", error);
    }
    throw error;
  }
}

export type HistoricoApontamentoItem = {
  etiqueta: string;
  qtdeprod: number;
  dhapo: string;
  nunota: number;
  nuapo: number;

  lote: string | null;
};

type HistoricoApontamentoResponse = {
  historico: HistoricoApontamentoItem[];
};

export async function getHistoricoApontamento(
  idiProc: number,
): Promise<HistoricoApontamentoItem[]> {
  try {
    const { data } = await api.get<HistoricoApontamentoResponse>(
      `/historico/${idiProc}`,
    );
    return data.historico;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      console.error("Erro ao buscar histórico do apontamento:", {
        url: error.config?.url,
        status: error.response?.status,
        respostaDoBackend: error.response?.data,
      });
    } else {
      console.error("Erro ao buscar histórico do apontamento:", error);
    }
    throw error;
  }
}

type SalvarApontamentoPayload = {
  idiProc: number;
  idiAtv: number;
  nuapo: number;
  codProd: number;
  qtdProd: number;
  nunota: number;
  etiqueta: string;
  dum: string;

  producao?: string;
  validade?: string;
  lote?: string;
  seqlote?: string;
};

export async function salvarApontamento({
  idiProc,
  idiAtv,
  nuapo,
  codProd,
  qtdProd,
  nunota,
  etiqueta,
  dum,
  producao,
  validade,
  lote,
  seqlote,
}: SalvarApontamentoPayload) {
  try {
    await api.post(
      "/salvar-apontamento",
      {
        idiproc: idiProc,
        idiatv: idiAtv,
        nuapo,
        codprod: codProd,
        qtdeprod: qtdProd,
        nunota,
        etiqueta,
        dum,
        producao,
        validade,
        lote,
        seqlote,
      },
      { timeout: TIMEOUT_GRAVACAO_MS },
    );
  } catch (error) {
    if (axios.isAxiosError(error)) {
      console.error("Erro ao salvar apontamento:", {
        url: error.config?.url,
        payloadEnviado: error.config?.data,
        status: error.response?.status,
        respostaDoBackend: error.response?.data,
      });
    } else {
      console.error("Erro ao salvar apontamento:", error);
    }
    throw error;
  }
}
