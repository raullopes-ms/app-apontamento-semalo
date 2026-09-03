import axios from "axios";
import { ChevronLeft } from "lucide-react-native";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  NativeSyntheticEvent,
  Text,
  TextInput,
  TextInputSubmitEditingEventData,
  View,
} from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { useAlerta } from "../components/AlertaProvider";
import { Button } from "../components/Button";
import { IconButton } from "../components/IconButton";
import { Modal } from "../components/Modal";
import { AppScreenProps } from "../navigation/types";
import { getFriendlyErrorMessage } from "../services/errors";
import {
  codigoProdutoCorresponde,
  DadosEtiqueta,
  dadosDaEtiqueta,
  dadosDoFardo,
  EtiquetaProducao,
  etiquetaEhValida,
  identidadeDaEtiqueta,
  identidadeDoFardoPendente,
  mesmaEtiqueta,
  parseEtiqueta,
  temDadosDeEtiqueta,
} from "../utils/etiqueta";
import {
  salvarApontamentoWms,
  ApontamentoJaConfirmadoError,
  NUNOTA_DESCONHECIDO,
  baixarFardosDeSeguranca,
  confirmarApontamento,
  criarApontamento,
  getApontamentosPendentes,
  getHistoricoApontamento,
  salvarApontamento,
} from "../services/apontamento";
import {
  esquecerFardosApontados,
  listarFardosApontados,
  marcarFardosApontados,
} from "../services/fardosApontados";
import {
  ApontamentoEmAndamento,
  lerApontamentoEmAndamento,
  limparApontamentoEmAndamento,
  salvarApontamentoEmAndamento,
} from "../services/apontamentoEmAndamento";
import { getOrdensProducao } from "../services/ordensProducao";
import { getAuthSession } from "../services/storage";

type BipeRegistrado = {
  quantidade: number;
  horario: string;
  nuapo?: number;
  nunota?: number;
  pendente?: boolean;
};

type ApontamentoProps = AppScreenProps<"Apontamento">;

export function Apontamento({ route, navigation }: ApontamentoProps) {
  const { ordem, etiqueta } = route.params;
  const etiquetaValida = etiquetaEhValida(etiqueta);
  const insets = useSafeAreaInsets();
  const { alertaErro, alertaAviso, alertaSucesso, confirmar, mostrarAlerta } =
    useAlerta();
  const [quantidadeJaApontada, setQuantidadeJaApontada] = useState(0);
  const [fardosNoPallet, setFardosNoPallet] = useState(0);
  const [historico, setHistorico] = useState<BipeRegistrado[]>([]);
  const [mostrarHistorico, setMostrarHistorico] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [aguardandoLeitura, setAguardandoLeitura] = useState(false);

  const [idsAguardandoBaixa, setIdsAguardandoBaixa] = useState<number[]>([]);
  const [baixandoPendentes, setBaixandoPendentes] = useState(false);

  const [etiquetaDivergente, setEtiquetaDivergente] = useState<string | null>(
    null,
  );

  const [emAndamento, setEmAndamento] = useState<ApontamentoEmAndamento | null>(
    null,
  );
  const scannerInputRef = useRef<TextInput>(null);

  const fardosNoPalletRef = useRef(0);

  const filaGravacaoRef = useRef<Promise<void>>(Promise.resolve());

  const idsDoPalletRef = useRef<number[]>([]);

  const dadosEtiquetaRef = useRef<DadosEtiqueta | null>(null);

  const loteDaOpRef = useRef<string | null>(null);

  const identidadesLidasRef = useRef(new Set<string>());

  const ultimaEtiquetaDivergenteAlertadaRef = useRef<string | null>(null);

  const limpezaFalhou = idsAguardandoBaixa.length > 0;

  const totalApontado = quantidadeJaApontada + fardosNoPallet;

  const saldoOp = Math.max(
    0,
    Math.min(ordem.saldo, ordem.qtdProduzir - quantidadeJaApontada),
  );

  const capacidadePallet = Math.min(ordem.qtdPallet, saldoOp);
  const capacidadeLimitadaPeloSaldo = capacidadePallet < ordem.qtdPallet;
  const palletCompleto =
    capacidadePallet > 0 && fardosNoPallet >= capacidadePallet;

  const saldoDisponivel = Math.max(0, saldoOp - fardosNoPallet);
  const progresso =
    ordem.qtdProduzir > 0
      ? Math.min(100, (totalApontado / ordem.qtdProduzir) * 100)
      : 0;
  const progressoPallet =
    capacidadePallet > 0
      ? Math.min(100, (fardosNoPallet / capacidadePallet) * 100)
      : 0;

  const envioFechaOp = saldoDisponivel <= 0;

  const carregarHistorico = useCallback(async () => {
    try {
      const [historicoRemoto, pendentesRemotos] = await Promise.all([
        getHistoricoApontamento(ordem.idiProc),
        getApontamentosPendentes(ordem.idiProc).catch(
          () => [] as Awaited<ReturnType<typeof getApontamentosPendentes>>,
        ),
      ]);

      const pendentesNaoSincronizados = pendentesRemotos.filter(
        (item) => item.status === "P",
      );

      const jaApontados = new Set(await listarFardosApontados(ordem.idiProc));
      const aguardandoBaixa = pendentesNaoSincronizados.filter((item) =>
        jaApontados.has(item.id),
      );
      const doPallet = pendentesNaoSincronizados.filter(
        (item) => !jaApontados.has(item.id),
      );

      const divergente = doPallet.find(
        (item) =>
          etiquetaEhValida(item.palete) &&
          !mesmaEtiqueta(item.palete, etiqueta),
      );
      setEtiquetaDivergente(divergente?.palete ?? null);

      const ultimoComDados = [...doPallet]
        .reverse()
        .map(dadosDoFardo)
        .find(temDadosDeEtiqueta);
      dadosEtiquetaRef.current = ultimoComDados ?? null;

      loteDaOpRef.current =
        doPallet.map((item) => item.lote).find(Boolean) ??
        [...historicoRemoto]
          .reverse()
          .map((item) => item.lote)
          .find(Boolean) ??
        null;

      identidadesLidasRef.current = new Set(
        doPallet
          .map(identidadeDoFardoPendente)
          .filter((identidade): identidade is string => identidade !== null),
      );

      const totalRemoto = historicoRemoto.reduce(
        (soma, item) => soma + item.qtdeprod,
        0,
      );
      const totalPendente = doPallet.reduce(
        (soma, item) => soma + item.qtdeapo,
        0,
      );
      const ultimoPendente = doPallet[doPallet.length - 1];

      setHistorico([
        ...(totalPendente > 0 && ultimoPendente
          ? [
              {
                quantidade: totalPendente,
                horario:
                  ultimoPendente.dhapo.split(" ")[1] ?? ultimoPendente.dhapo,
                pendente: true,
              },
            ]
          : []),
        ...[...historicoRemoto].reverse().map((item) => ({
          quantidade: item.qtdeprod,
          horario: item.dhapo.split(" ")[1] ?? item.dhapo,
          nuapo: item.nuapo,
          nunota: item.nunota,
        })),
      ]);

      setQuantidadeJaApontada(Math.min(ordem.qtdProduzir, totalRemoto));

      fardosNoPalletRef.current = totalPendente;
      setFardosNoPallet(totalPendente);
      idsDoPalletRef.current = doPallet.map((item) => item.id);
      setIdsAguardandoBaixa(aguardandoBaixa.map((item) => item.id));
    } catch (error) {}
  }, [ordem.idiProc, ordem.qtdProduzir, etiqueta]);

  useEffect(() => {
    carregarHistorico();
  }, [carregarHistorico]);

  useEffect(() => {
    lerApontamentoEmAndamento(ordem.idiProc).then(setEmAndamento);
  }, [ordem.idiProc]);

  const avisarEtiquetaNaoInformada = useCallback(() => {
    mostrarAlerta({
      tipo: "aviso",
      titulo: "Etiqueta não informada",
      mensagem: "É necessário capturar a etiqueta antes de apontar.",
      botoes: [
        {
          texto: "Inserir etiqueta",
          onPress: () => navigation.replace("Bipagem", { ordem }),
        },
      ],
    });
  }, [mostrarAlerta, navigation, ordem]);

  useEffect(() => {
    if (!etiquetaValida) {
      avisarEtiquetaNaoInformada();
    }
  }, [etiquetaValida, avisarEtiquetaNaoInformada]);

  useEffect(() => {
    if (!etiquetaDivergente) {
      ultimaEtiquetaDivergenteAlertadaRef.current = null;
      return;
    }

    if (ultimaEtiquetaDivergenteAlertadaRef.current === etiquetaDivergente) {
      return;
    }

    ultimaEtiquetaDivergenteAlertadaRef.current = etiquetaDivergente;
    mostrarAlerta({
      tipo: "erro",
      titulo: "Pallet divergente",
      mensagem: `Os registros já lidos nesta OP foram gravados no pallet ${etiquetaDivergente}, mas a etiqueta em uso é ${
        etiquetaValida ? etiqueta : "outra"
      }. Apontar assim juntaria dois pallets no mesmo apontamento.`,
      botoes: [
        {
          texto: "Voltar",
          variante: "destructive",
          onPress: () => navigation.navigate("Home"),
        },
      ],
    });
  }, [
    etiqueta,
    etiquetaDivergente,
    etiquetaValida,
    mostrarAlerta,
    navigation,
  ]);

  function pararBipagem() {
    setAguardandoLeitura(false);
    scannerInputRef.current?.clear();
    scannerInputRef.current?.blur();
  }

  function handleAlternarBipagem() {
    if (enviando) return;

    if (aguardandoLeitura) {
      pararBipagem();
      return;
    }

    if (!etiquetaValida) {
      alertaAviso(
        "Etiqueta não informada",
        "Insira a etiqueta antes de apontar.",
      );
      return;
    }

    if (emAndamento) {
      alertaAviso(
        "Apontamento pendente",
        "Há um apontamento pendente de confirmação. Tente enviar novamente antes de fazer novas leituras.",
      );
      return;
    }

    if (etiquetaDivergente) {
      alertaErro(
        "Pallet divergente",
        `Os registros já lidos pertencem ao pallet ${etiquetaDivergente}. Volte e entre na OP novamente para retomar o pallet correto.`,
      );
      return;
    }

    if (capacidadePallet <= 0) {
      alertaAviso(
        "Sem saldo disponível",
        "A OP não tem saldo disponível para novos apontamentos.",
      );
      return;
    }

    if (palletCompleto) {
      alertaAviso(
        "Pallet completo",
        `Pallet completo (${fardosNoPallet}/${capacidadePallet}). Envie o apontamento antes de fazer novas leituras.`,
      );
      return;
    }

    setAguardandoLeitura(true);
    scannerInputRef.current?.clear();
    scannerInputRef.current?.focus();
  }

  function handleLeituraProdutoConcluida(
    e: NativeSyntheticEvent<TextInputSubmitEditingEventData>,
  ) {
    const codigo = e.nativeEvent.text;
    scannerInputRef.current?.clear();

    if (!codigo) return;

    const etiquetaLida = parseEtiqueta(codigo);
    if (!etiquetaLida) {
      alertaErro(
        "Etiqueta inválida",
        "O código lido não está no formato esperado.",
      );
      return;
    }

    if (!codigoProdutoCorresponde(etiquetaLida, ordem.codProd)) {
      alertaErro("Produto divergente", "Produto não corresponde à OP.");
      return;
    }

    const loteEsperado = loteDaOpRef.current;
    if (loteEsperado && etiquetaLida.lote !== loteEsperado) {
      alertaErro(
        "Lote divergente",
        `Lote ${etiquetaLida.lote} não pertence a esta OP (lote ${loteEsperado}).`,
      );
      return;
    }

    if (identidadesLidasRef.current.has(identidadeDaEtiqueta(etiquetaLida))) {
      alertaAviso(
        "Atenção",
        `Sequência ${etiquetaLida.sequenciaLote} do lote ${etiquetaLida.lote} já foi registrada neste pallet.`,
      );
      return;
    }

    if (fardosNoPalletRef.current >= capacidadePallet) {
      pararBipagem();
      alertaAviso(
        "Pallet completo",
        `Pallet completo (${capacidadePallet}). Envie esses registros antes de apontar mais.`,
      );
      return;
    }

    registrarFardo(etiquetaLida);
  }

  function registrarFardo(etiquetaProduto: EtiquetaProducao) {
    const posicao = fardosNoPalletRef.current + 1;

    fardosNoPalletRef.current = posicao;
    setFardosNoPallet(posicao);

    dadosEtiquetaRef.current = dadosDaEtiqueta(etiquetaProduto);

    loteDaOpRef.current ??= etiquetaProduto.lote;

    identidadesLidasRef.current.add(identidadeDaEtiqueta(etiquetaProduto));

    if (posicao >= capacidadePallet) {
      pararBipagem();
      confirmar({
        titulo: "Pallet completo",
        mensagem: `${posicao} de ${capacidadePallet} registros lidos. Enviar o apontamento?`,
        textoConfirmar: "Enviar",
        onConfirmar: enviarApontamento,
      });
    }

    enfileirarGravacao(etiquetaProduto);
  }

  function enfileirarGravacao(etiquetaProduto: EtiquetaProducao) {
    filaGravacaoRef.current = filaGravacaoRef.current
      .catch(() => undefined)
      .then(() => gravarFardoNoWms(etiquetaProduto));
  }

  async function gravarFardoNoWms(etiquetaProduto: EtiquetaProducao) {
    try {
      const id = await salvarApontamentoWms({
        idiProc: ordem.idiProc,
        codprod: ordem.codProd,
        qtdeapo: 1,
        status: "P",

        palete: etiquetaValida ? etiqueta : undefined,

        ...dadosDaEtiqueta(etiquetaProduto),
      });

      idsDoPalletRef.current = [...idsDoPalletRef.current, id];
    } catch (error) {
      fardosNoPalletRef.current = Math.max(0, fardosNoPalletRef.current - 1);
      setFardosNoPallet(fardosNoPalletRef.current);

      identidadesLidasRef.current.delete(identidadeDaEtiqueta(etiquetaProduto));
      alertaErro(
        "Leitura não registrada",
        getFriendlyErrorMessage(
          error,
          "Não foi possível registrar a leitura. Aponte novamente.",
        ),
      );
    }
  }

  function avisarLimpezaFalhou() {
    mostrarAlerta({
      tipo: "aviso",
      titulo: "Registros de segurança não baixados",
      mensagem:
        "O apontamento foi enviado ao ERP, mas os registros de segurança continuam, Baixe os registros para liberar o próximo — enviar de novo duplicaria o apontamento.",
      botoes: [{ texto: "Tentar novamente", onPress: handleBaixarPendentes }],
    });
  }

  async function handleBaixarPendentes() {
    setBaixandoPendentes(true);
    try {
      const baixou = await baixarFardosDeSeguranca(idsAguardandoBaixa, {
        idiProc: ordem.idiProc,
        palete: etiqueta,
      });
      if (!baixou) {
        avisarLimpezaFalhou();
        return;
      }

      await esquecerFardosApontados(idsAguardandoBaixa);

      await limparApontamentoEmAndamento(ordem.idiProc);
      setEmAndamento(null);
      setIdsAguardandoBaixa([]);
      alertaSucesso("Registros baixados", "Pode iniciar o próximo pallet.");
      await carregarHistorico();
    } finally {
      setBaixandoPendentes(false);
    }
  }

  async function encerrarSemNotaConhecida(
    registro: ApontamentoEmAndamento,
    erro: ApontamentoJaConfirmadoError,
  ) {
    if (erro.qtdApontada !== null && erro.qtdApontada !== registro.qtdProd) {
      mostrarAlerta({
        tipo: "erro",
        titulo: "Quantidade divergente do ERP",
        mensagem: `O apontamento NUAPO ${erro.nuapo} está confirmado no ERP com ${erro.qtdApontada}, mas a quantidade local é ${registro.qtdProd}. O registro de controle não será gravado com números divergentes. Chame a supervisão informando este NUAPO.`,
      });
      return;
    }

    if (!registro.salvo) {
      await salvarApontamento({
        idiProc: registro.idiProc,
        idiAtv: registro.idiAtv,
        nuapo: registro.nuapo,
        codProd: registro.codProd,
        qtdProd: registro.qtdProd,
        nunota: NUNOTA_DESCONHECIDO,
        etiqueta: registro.etiqueta,
        dum: registro.dum,
        producao: registro.producao,
        validade: registro.validade,
        lote: registro.lote,
        seqlote: registro.seqlote,
      });
    }

    await marcarFardosApontados(registro.idiProc, registro.fardoIds);
    await limparApontamentoEmAndamento(registro.idiProc);
    setEmAndamento(null);

    idsDoPalletRef.current = [];
    fardosNoPalletRef.current = 0;
    setFardosNoPallet(0);

    identidadesLidasRef.current = new Set();

    const baixou = await baixarFardosDeSeguranca(registro.fardoIds, {
      idiProc: registro.idiProc,
      palete: registro.etiqueta,
    });
    if (baixou) {
      await esquecerFardosApontados(registro.fardoIds);
    } else {
      setIdsAguardandoBaixa(registro.fardoIds);
    }

    mostrarAlerta({
      tipo: "aviso",
      titulo: "Apontamento já estava confirmado",
      mensagem: `O apontamento NUAPO ${erro.nuapo} (${registro.qtdProd} registro(s)) já constava confirmado no ERP. A produção e o histórico estão registrados; só o número da nota ficou em branco. Informe este NUAPO à supervisão para completá-lo.`,
      botoes: [
        {
          texto: "Voltar para as OPs",
          onPress: () => navigation.navigate("Home"),
        },
      ],
    });
  }

  async function buscarOrdemAtualizada() {
    const session = await getAuthSession();
    if (!session) return null;

    const ordens = await getOrdensProducao(session.codEmp);
    return (
      ordens.find(
        (item) =>
          item.idiProc === ordem.idiProc && item.idiAtv === ordem.idiAtv,
      ) ?? null
    );
  }

  async function irParaProximaEtiquetaOuHome(qtdEnviada: number) {
    const ordemAtualizada = await buscarOrdemAtualizada().catch(() => null);
    if (ordemAtualizada) {
      if (ordemAtualizada.saldo <= 0) {
        navigation.navigate("Home");
        return;
      }

      navigation.replace("Bipagem", { ordem: ordemAtualizada });
      return;
    }

    const saldoRestante = Math.max(0, saldoOp - qtdEnviada);

    if (saldoRestante <= 0) {
      navigation.navigate("Home");
      return;
    }

    navigation.replace("Bipagem", {
      ordem: {
        ...ordem,
        saldo: saldoRestante,
      },
    });
  }

  async function buscarPendentesDoPalletAtual() {
    const pendentes = await getApontamentosPendentes(ordem.idiProc);
    const idsLocais = new Set(idsDoPalletRef.current);
    const jaApontados = new Set(await listarFardosApontados(ordem.idiProc));

    return pendentes.filter(
      (item) =>
        item.status === "P" &&
        !jaApontados.has(item.id) &&
        (mesmaEtiqueta(item.palete, etiqueta) || idsLocais.has(item.id)),
    );
  }

  async function concluirApontamento(registro: ApontamentoEmAndamento) {
    let atual = registro;

    let nunota = atual.nunota;
    if (!nunota) {
      try {
        const resultado = await confirmarApontamento({
          idiAtv: atual.idiAtv,
          nuapo: atual.nuapo,
        });
        nunota = resultado.nunota;
        atual = await salvarApontamentoEmAndamento({ ...atual, nunota });
        setEmAndamento(atual);
      } catch (error) {
        if (error instanceof ApontamentoJaConfirmadoError) {
          await encerrarSemNotaConhecida(atual, error);
          return;
        }
        throw error;
      }
    }

    if (!atual.salvo) {
      await salvarApontamento({
        idiProc: atual.idiProc,
        idiAtv: atual.idiAtv,
        nuapo: atual.nuapo,
        codProd: atual.codProd,
        qtdProd: atual.qtdProd,
        nunota,
        etiqueta: atual.etiqueta,
        dum: atual.dum,
        producao: atual.producao,
        validade: atual.validade,
        lote: atual.lote,
        seqlote: atual.seqlote,
      });
      atual = await salvarApontamentoEmAndamento({ ...atual, salvo: true });
      setEmAndamento(atual);
    }

    await marcarFardosApontados(atual.idiProc, atual.fardoIds);

    await limparApontamentoEmAndamento(atual.idiProc);
    setEmAndamento(null);

    idsDoPalletRef.current = [];
    fardosNoPalletRef.current = 0;
    setFardosNoPallet(0);

    identidadesLidasRef.current = new Set();

    const baixou = await baixarFardosDeSeguranca(atual.fardoIds, {
      idiProc: atual.idiProc,
      palete: atual.etiqueta,
    });
    if (!baixou) {
      setIdsAguardandoBaixa(atual.fardoIds);
      avisarLimpezaFalhou();
      return;
    }

    await esquecerFardosApontados(atual.fardoIds);
    alertaSucesso("Apontamento enviado ao Sankhya e WMS.");
    await irParaProximaEtiquetaOuHome(atual.qtdProd);
  }

  async function enviarApontamento() {
    if (!etiquetaValida) {
      avisarEtiquetaNaoInformada();
      return;
    }

    pararBipagem();
    setEnviando(true);
    try {
      await filaGravacaoRef.current.catch(() => undefined);

      const retomado = await lerApontamentoEmAndamento(ordem.idiProc);
      if (retomado) {
        await concluirApontamento(retomado);
        return;
      }

      const pendentesDoPallet = await buscarPendentesDoPalletAtual();
      const fardoIds = Array.from(
        new Set([
          ...idsDoPalletRef.current,
          ...pendentesDoPallet.map((item) => item.id),
        ]),
      );
      const totalPendenteRemoto = pendentesDoPallet.reduce(
        (soma, item) => soma + item.qtdeapo,
        0,
      );
      const fardosDoPallet = Math.max(
        fardosNoPalletRef.current,
        totalPendenteRemoto,
      );

      if (fardosDoPallet <= 0) {
        alertaAviso(
          "Nada para enviar",
          "Nenhuma leitura registrada neste pallet.",
        );
        return;
      }

      const dadosEtiqueta =
        [...pendentesDoPallet]
          .reverse()
          .map(dadosDoFardo)
          .find(temDadosDeEtiqueta) ??
        dadosEtiquetaRef.current ??
        {};

      const { nuapo } = await criarApontamento({
        idiAtv: ordem.idiAtv,
        codProd: ordem.codProd,
        qtdProduzir: fardosDoPallet,
      });

      const registro = await salvarApontamentoEmAndamento({
        idiProc: ordem.idiProc,
        idiAtv: ordem.idiAtv,
        codProd: ordem.codProd,
        qtdProd: fardosDoPallet,
        etiqueta,
        dum: ordem.dum,
        nuapo,
        fardoIds,

        ...dadosEtiqueta,
      });
      setEmAndamento(registro);

      await concluirApontamento(registro);
    } catch (error) {
      const dadosErro = axios.isAxiosError(error)
        ? (error.response?.data as
            { error?: string; listaPendentes?: string } | undefined)
        : undefined;

      const mensagemBackend =
        typeof dadosErro?.error === "string" ? dadosErro.error : undefined;

      const mensagem = mensagemBackend
        ? typeof dadosErro?.listaPendentes === "string"
          ? `${mensagemBackend}\n\nPendente: ${dadosErro.listaPendentes}`
          : mensagemBackend
        : "Não foi possível enviar o apontamento. Verifique sua conexão e tente novamente.";

      alertaErro("Erro ao enviar", mensagem);
    } finally {
      setEnviando(false);
    }
  }

  function handleFinalizar() {
    if (saldoDisponivel > 0) {
      alertaAviso(
        "Quantidade incompleta",
        `Ainda restam ${saldoDisponivel} unidades de saldo na OP. Complete a quantidade ou use "Encerrar Parcial".`,
      );
      return;
    }

    if (fardosNoPallet <= 0) {
      alertaAviso(
        "Nada para enviar",
        "Nenhuma leitura registrada neste pallet.",
      );
      return;
    }

    confirmar({
      titulo: "Finalizar atividade",
      mensagem: `Apontamento concluído (${totalApontado}/${ordem.qtdProduzir}). Deseja enviar o apontamento?`,
      textoConfirmar: "Finalizar",
      onConfirmar: enviarApontamento,
    });
  }

  function handleEncerrarParcial() {
    if (fardosNoPallet <= 0) {
      alertaAviso(
        "Nada apontado",
        "Registre ao menos uma leitura antes de encerrar parcialmente.",
      );
      return;
    }

    confirmar({
      titulo: "Encerrar parcial",
      mensagem: `${fardosNoPallet} de ${capacidadePallet} registros apontados neste pallet. Deseja encerrar parcialmente e enviar?`,
      textoConfirmar: "Encerrar Parcial",
      destrutivo: true,
      onConfirmar: enviarApontamento,
    });
  }

  return (
    <View className="flex-1 bg-slate-50">
      <SafeAreaView edges={["top"]} className="bg-orange-600">
        <View className="flex-row items-center gap-3 px-6 pb-4 pt-2">
          <IconButton
            icon={ChevronLeft}
            onPress={() => navigation.navigate("Home")}
          />
          <Text className="flex-1 text-lg font-semibold text-white">
            Apontamento
          </Text>
        </View>
      </SafeAreaView>

      <KeyboardAwareScrollView
        bottomOffset={24}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        className="flex-1"
        contentContainerClassName="gap-4 p-6"
        contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
      >
        <View className="rounded-xl border border-slate-200 bg-white p-4">
          <Text className="mb-3 text-base font-semibold text-slate-900">
            OP {ordem.idiProc}
          </Text>

          <View className="gap-2">
            <View>
              <Text className="text-xs text-slate-500">Atividade</Text>
              <Text className="text-sm text-slate-800">{ordem.idiAtv}</Text>
            </View>
            <View>
              <Text className="text-xs text-slate-500">Produto</Text>
              <Text className="text-sm text-slate-800">
                {ordem.codProd} - {ordem.descrProd}
              </Text>
            </View>
            <View>
              <Text className="text-xs text-slate-500">Etiqueta capturada</Text>
              <Text className="text-sm text-slate-800">
                {etiquetaValida ? etiqueta : "Não informada"}
              </Text>
            </View>
          </View>
        </View>

        <View className="rounded-xl border border-slate-200 bg-white p-4">
          <View className="mb-2 flex-row items-center justify-between">
            <Text className="text-sm font-medium text-slate-700">
              Quantidade apontada
            </Text>
            <Text className="text-sm font-semibold text-slate-900">
              {totalApontado} / {ordem.qtdProduzir}
            </Text>
          </View>

          <View className="h-3 overflow-hidden rounded-full bg-slate-200">
            <View
              className="h-3 rounded-full bg-orange-600"
              style={{ width: `${progresso}%` }}
            />
          </View>

          <Text className="mt-2 text-xs text-slate-500">
            Saldo disponível: {saldoDisponivel}
          </Text>

          {emAndamento && !enviando ? (
            <Text className="mt-2 text-xs text-amber-600">
              Apontamento de {emAndamento.qtdProd} registro(s) já emitido no ERP
              (NUAPO {emAndamento.nuapo}) e não concluído. Use "Concluir
              apontamento"; não refaça as leituras.
            </Text>
          ) : null}
        </View>

        <View className="rounded-xl border border-slate-200 bg-white p-4">
          <View className="mb-2 flex-row items-center justify-between">
            <Text className="text-sm font-medium text-slate-700">
              Capacidade
            </Text>
            <Text className="text-base font-semibold text-slate-900">
              {fardosNoPallet} / {capacidadePallet}
            </Text>
          </View>

          <View className="h-3 overflow-hidden rounded-full bg-slate-200">
            <View
              className={`h-3 rounded-full ${
                palletCompleto ? "bg-emerald-600" : "bg-orange-600"
              }`}
              style={{ width: `${progressoPallet}%` }}
            />
          </View>

          {capacidadeLimitadaPeloSaldo ? (
            <Text className="mt-2 text-xs font-medium text-amber-600">
              Capacidade reduzida de acordo com o saldo.
            </Text>
          ) : (
            <Text className="mt-2 text-xs text-slate-500">
              Capacidade do produto: {ordem.qtdPallet} por Pallet.
            </Text>
          )}

          {palletCompleto ? (
            <Text className="mt-2 text-xs font-medium text-emerald-700">
              Pallet completo. Envie o apontamento para iniciar o próximo.
            </Text>
          ) : null}
        </View>

        {limpezaFalhou ? (
          <View className="gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4">
            <Text className="text-sm font-medium text-amber-800">
              Apontamento enviado, mas os registros de segurança dessa operação
              continuam registrados. Dê baixa nos registros para liberar o
              próximo pallet.
            </Text>
            <Button
              title="Baixar pendentes"
              onPress={handleBaixarPendentes}
              loading={baixandoPendentes}
              disabled={baixandoPendentes}
            />
          </View>
        ) : null}

        <Button
          title={aguardandoLeitura ? "Parar Apontamento" : "Apontar"}
          variant={aguardandoLeitura ? "secondary" : "primary"}
          onPress={handleAlternarBipagem}
          disabled={
            enviando ||
            baixandoPendentes ||
            (!aguardandoLeitura &&
              (palletCompleto ||
                capacidadePallet <= 0 ||
                !!emAndamento ||
                !etiquetaValida ||
                !!etiquetaDivergente ||
                limpezaFalhou))
          }
        />

        {aguardandoLeitura ? (
          <View className="flex-row items-center justify-center gap-2 rounded-xl bg-amber-50 p-3">
            <ActivityIndicator color="#d97706" />
            <Text className="text-sm font-medium text-amber-700">
              Aguardando leitura.... ({fardosNoPallet}/{capacidadePallet})
            </Text>
          </View>
        ) : null}

        <Button
          title={
            emAndamento
              ? "Concluir apontamento"
              : envioFechaOp
                ? "Finalizar"
                : "Encerrar Parcial"
          }
          variant={emAndamento || envioFechaOp ? "primary" : "secondary"}
          onPress={
            emAndamento
              ? enviarApontamento
              : envioFechaOp
                ? handleFinalizar
                : handleEncerrarParcial
          }
          loading={enviando}
          disabled={
            enviando ||
            aguardandoLeitura ||
            baixandoPendentes ||
            !etiquetaValida ||
            !!etiquetaDivergente ||
            (!emAndamento && (fardosNoPallet <= 0 || limpezaFalhou))
          }
        />

        <Button
          title="Histórico"
          variant="secondary"
          onPress={() => setMostrarHistorico(true)}
          disabled={enviando || aguardandoLeitura}
        />

        <TextInput
          ref={scannerInputRef}
          className="absolute h-px w-px opacity-0"
          showSoftInputOnFocus={false}
          caretHidden
          autoCorrect={false}
          autoCapitalize="none"
          blurOnSubmit={false}
          onSubmitEditing={handleLeituraProdutoConcluida}
        />
      </KeyboardAwareScrollView>

      <Modal
        visible={mostrarHistorico}
        onClose={() => setMostrarHistorico(false)}
        title="Histórico de Apontamentos"
      >
        {historico.length === 0 ? (
          <Text className="text-sm text-slate-500">
            Nenhum apontamento registrado ainda.
          </Text>
        ) : (
          <View className="gap-3">
            {historico.map((evento, index) => (
              <View
                key={index}
                className="gap-1 border-b border-slate-100 pb-2"
              >
                <View className="flex-row items-center justify-between">
                  <Text className="text-xs text-slate-500">
                    {evento.horario}
                  </Text>
                  <View className="flex-row items-center gap-2">
                    {evento.pendente ? (
                      <View className="rounded-full bg-amber-100 px-2 py-0.5">
                        <Text className="text-[10px] font-medium text-amber-700">
                          Pendente
                        </Text>
                      </View>
                    ) : null}
                    <Text className="text-sm font-medium text-slate-900">
                      +{evento.quantidade}
                    </Text>
                  </View>
                </View>
                {evento.pendente ? null : (
                  <View className="flex-row gap-4">
                    <Text className="text-xs text-slate-500">
                      NUAPO: {evento.nuapo ?? "-"}
                    </Text>
                    <Text className="text-xs text-slate-500">
                      NUNOTA: {evento.nunota ?? "-"}
                    </Text>
                  </View>
                )}
              </View>
            ))}
          </View>
        )}
      </Modal>

      {enviando || baixandoPendentes ? (
        <View
          className="absolute inset-0 items-center justify-center bg-black/30"
          pointerEvents="auto"
        >
          <View className="items-center gap-3 rounded-xl bg-white px-8 py-6">
            <ActivityIndicator size="large" color="#ea580c" />
            <Text className="text-sm font-medium text-slate-700">
              {baixandoPendentes
                ? "Baixando pendentes..."
                : "Enviando apontamento..."}
            </Text>
          </View>
        </View>
      ) : null}
    </View>
  );
}
