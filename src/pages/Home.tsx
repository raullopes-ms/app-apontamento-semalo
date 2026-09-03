import { useFocusEffect } from "@react-navigation/native";
import { LogOut } from "lucide-react-native";
import { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  Text,
  View,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { useAlerta } from "../components/AlertaProvider";
import { IconButton } from "../components/IconButton";
import { Input } from "../components/Input";
import {
  OrdemProducao,
  OrdemProducaoCard,
} from "../components/OrdemProducaoCard";
import { AppScreenProps } from "../navigation/types";
import { AuthSession, getAuthSession } from "../services/storage";
import { getOrdensProducao } from "../services/ordensProducao";
import { getFriendlyErrorMessage } from "../services/errors";
import {
  ApontamentoPendente,
  baixarFardosDeSeguranca,
  confirmarApontamento,
  criarApontamento,
  getApontamentosPendentes,
  iniciarAtividade,
  salvarApontamento,
} from "../services/apontamento";
import {
  esquecerFardosApontados,
  listarFardosApontados,
  marcarFardosApontados,
} from "../services/fardosApontados";
import {
  dadosDoFardo,
  etiquetaEhValida,
  temDadosDeEtiqueta,
} from "../utils/etiqueta";
import {
  lerApontamentoEmAndamento,
  limparApontamentoEmAndamento,
  salvarApontamentoEmAndamento,
} from "../services/apontamentoEmAndamento";

const dataAtual = new Date().toLocaleDateString("pt-BR");

const EMPRESAS_POR_COD: Record<number, string> = {
  2: "Semalo - MTZ",
  14: "Filial - PB",
};

function getNomeEmpresa(codEmp: number) {
  return EMPRESAS_POR_COD[codEmp] ?? "";
}

function getPrioridadeOrdem(ordem: OrdemProducao) {
  if (ordem.saldo === 0) return 2;
  return ordem.iniciadoApo ? 0 : 1;
}

function getIniciais(nome: string) {
  const partes = nome.trim().split(/\s+/);
  const iniciais =
    partes.length > 1 ? [partes[0], partes[partes.length - 1]] : [partes[0]];
  return iniciais
    .map((parte) => parte[0])
    .join("")
    .toUpperCase();
}

type HomeProps = AppScreenProps<"Home"> & {
  onLogout?: () => void;
};

export function Home({ navigation, onLogout }: HomeProps) {
  const insets = useSafeAreaInsets();
  const { alertaErro, alertaSucesso, mostrarAlerta } = useAlerta();
  const [session, setSession] = useState<AuthSession | null>(null);
  const [search, setSearch] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [ordensProducao, setOrdensProducao] = useState<OrdemProducao[]>([]);
  const [iniciandoIdiAtv, setIniciandoIdiAtv] = useState<number | null>(null);
  const [sincronizando, setSincronizando] = useState(false);

  const avisarLimpezaFalhou = useCallback(
    (ordem: OrdemProducao, ids: number[]) => {
      mostrarAlerta({
        tipo: "aviso",
        titulo: "Registros de segurança pendentes",
        mensagem: `Os apontamentos da OP ${ordem.idiProc} foram sincronizados, mas ainda há registros de segurança ativos. Baixe esses registros para seguir; sincronizar de novo duplicaria o apontamento.`,
        botoes: [
          {
            texto: "Baixar registros",
            onPress: async () => {
              setSincronizando(true);
              try {
                const baixou = await baixarFardosDeSeguranca(ids);
                if (!baixou) {
                  avisarLimpezaFalhou(ordem, ids);
                  return;
                }

                await esquecerFardosApontados(ids);
                alertaSucesso(
                  "Registros baixados",
                  "Pode entrar na OP normalmente.",
                );
              } finally {
                setSincronizando(false);
              }
            },
          },
        ],
      });
    },
    [mostrarAlerta, alertaSucesso],
  );

  const fetchOrdensProducao = useCallback(async () => {
    try {
      const authSession = await getAuthSession();
      if (!authSession) return;

      setSession(authSession);
      const ordens = await getOrdensProducao(authSession.codEmp);
      setOrdensProducao(ordens);
    } catch (err) {
      alertaErro(
        "Erro ao carregar OPs",
        getFriendlyErrorMessage(
          err,
          "Não foi possível carregar as ordens de produção.",
        ),
      );
    }
  }, [alertaErro]);

  useFocusEffect(
    useCallback(() => {
      fetchOrdensProducao();
    }, [fetchOrdensProducao]),
  );

  const operador = session?.nomeUsuario || "";
  const empresa = session ? getNomeEmpresa(session.codEmp) : "";

  const ordensFiltradas = useMemo(() => {
    const termo = search.trim().toLowerCase();
    const filtradas = termo
      ? ordensProducao.filter(
          (ordem) =>
            String(ordem.idiProc).includes(termo) ||
            ordem.descrProd.toLowerCase().includes(termo) ||
            String(ordem.codProd).includes(termo),
        )
      : ordensProducao;

    return [...filtradas].sort(
      (a, b) => getPrioridadeOrdem(a) - getPrioridadeOrdem(b),
    );
  }, [search, ordensProducao]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchOrdensProducao();
    setRefreshing(false);
  }, [fetchOrdensProducao]);

  const handleIniciarAtividade = useCallback(async (ordem: OrdemProducao) => {
    setIniciandoIdiAtv(ordem.idiAtv);
    try {
      await iniciarAtividade(ordem.idiAtv);
      setOrdensProducao((prev) =>
        prev.map((item) =>
          item.idiAtv === ordem.idiAtv ? { ...item, iniciadoApo: true } : item,
        ),
      );
    } catch (err) {
      alertaErro(
        "Erro ao iniciar atividade",
        getFriendlyErrorMessage(err, "Não foi possível iniciar a atividade."),
      );
    } finally {
      setIniciandoIdiAtv(null);
    }
  }, [alertaErro]);

  const sincronizarPendentes = useCallback(
    async (
      ordem: OrdemProducao,
      etiqueta: string,
      pendentes: ApontamentoPendente[],
    ) => {
      setSincronizando(true);
      try {
        const totalPorProduto = new Map<number, number>();
        for (const pendente of pendentes) {
          const codProd = Number(pendente.codprod);
          totalPorProduto.set(
            codProd,
            (totalPorProduto.get(codProd) ?? 0) + pendente.qtdeapo,
          );
        }

        for (const [codProd, qtdeTotal] of totalPorProduto) {
          const fardosDoProduto = pendentes.filter(
            (item) => Number(item.codprod) === codProd,
          );
          const fardoIds = fardosDoProduto.map((item) => item.id);

          const dadosEtiqueta =
            [...fardosDoProduto]
              .reverse()
              .map(dadosDoFardo)
              .find(temDadosDeEtiqueta) ?? {};

          const { nuapo } = await criarApontamento({
            idiAtv: ordem.idiAtv,
            codProd,
            qtdProduzir: qtdeTotal,
          });

          const registro = await salvarApontamentoEmAndamento({
            idiProc: ordem.idiProc,
            idiAtv: ordem.idiAtv,
            codProd,
            qtdProd: qtdeTotal,
            etiqueta,
            dum: ordem.dum,
            nuapo,
            fardoIds,
            ...dadosEtiqueta,
          });

          const { nunota } = await confirmarApontamento({
            idiAtv: ordem.idiAtv,
            nuapo,
          });
          await salvarApontamentoEmAndamento({ ...registro, nunota });

          await salvarApontamento({
            idiProc: ordem.idiProc,
            idiAtv: ordem.idiAtv,
            nuapo,
            codProd,
            qtdProd: qtdeTotal,
            nunota,
            etiqueta,
            dum: ordem.dum,
            ...dadosEtiqueta,
          });

          await marcarFardosApontados(ordem.idiProc, fardoIds);
          await limparApontamentoEmAndamento(ordem.idiProc);
        }

        const ids = pendentes.map((item) => item.id);
        await marcarFardosApontados(ordem.idiProc, ids);

        const baixou = await baixarFardosDeSeguranca(ids, {
          idiProc: ordem.idiProc,
          palete: etiqueta,
        });
        if (!baixou) {
          avisarLimpezaFalhou(ordem, ids);
          return;
        }

        await esquecerFardosApontados(ids);
        navigation.navigate("Apontamento", { ordem, etiqueta });
      } catch (err) {
        alertaErro(
          "Erro ao sincronizar",
          getFriendlyErrorMessage(
            err,
            "Não foi possível sincronizar os apontamentos pendentes. Tente novamente.",
          ),
        );
      } finally {
        setSincronizando(false);
      }
    },
    [navigation, alertaErro, baixarFardosDeSeguranca, avisarLimpezaFalhou],
  );

  const handleIrParaBipagem = useCallback(
    async (ordem: OrdemProducao) => {
      const emAndamento = await lerApontamentoEmAndamento(ordem.idiProc);
      if (emAndamento) {
        mostrarAlerta({
          tipo: "aviso",
          titulo: "Apontamento não concluído",
          mensagem: `A OP ${ordem.idiProc} tem um apontamento já emitido no ERP que não terminou de ser gravado. Abra a OP e use "Concluir apontamento"; não é necessário refazer as leituras.`,
          botoes: [
            {
              texto: "Abrir OP",
              onPress: () =>
                navigation.navigate("Apontamento", {
                  ordem,
                  etiqueta: emAndamento.etiqueta,
                }),
            },
          ],
        });
        return;
      }

      let doPallet: ApontamentoPendente[] = [];
      try {
        const pendentes = await getApontamentosPendentes(ordem.idiProc);
        const naoSincronizados = pendentes.filter(
          (item) => item.status === "P",
        );

        const jaApontados = new Set(await listarFardosApontados(ordem.idiProc));
        const aguardandoBaixa = naoSincronizados.filter((item) =>
          jaApontados.has(item.id),
        );

        if (aguardandoBaixa.length > 0) {
          avisarLimpezaFalhou(
            ordem,
            aguardandoBaixa.map((item) => item.id),
          );
          return;
        }

        doPallet = naoSincronizados.filter((item) => !jaApontados.has(item.id));
      } catch {}

      if (doPallet.length > 0) {
        const etiquetaDoPallet = doPallet
          .map((item) => item.palete)
          .find(etiquetaEhValida);
        const fardos = doPallet.reduce((soma, item) => soma + item.qtdeapo, 0);

        if (etiquetaDoPallet) {
          mostrarAlerta({
            tipo: "aviso",
            titulo: "Pallet em andamento",
            mensagem: `Esta OP tem ${fardos} registro(s) já lido(s) e ainda não enviado(s) com seu usuario, no pallet ${etiquetaDoPallet}. Continue o mesmo pallet ou envie o que já foi registrado; não capture etiqueta nova.`,
            botoes: [
              {
                texto: "Enviar o que há",
                variante: "secondary",
                onPress: () =>
                  sincronizarPendentes(ordem, etiquetaDoPallet, doPallet),
              },
              {
                texto: "Continuar",
                onPress: () =>
                  navigation.navigate("Apontamento", {
                    ordem,
                    etiqueta: etiquetaDoPallet,
                  }),
              },
            ],
          });
          return;
        }

        alertaErro(
          "Registros sem etiqueta de pallet",
          `Esta OP tem ${fardos} registro(s) sem etiqueta de pallet registrada. Chame a supervisão antes de apontar: continuar agora pode vincular esses registros à etiqueta errada.`,
        );
        return;
      }

      navigation.navigate("Bipagem", { ordem });
    },
    [
      navigation,
      sincronizarPendentes,
      avisarLimpezaFalhou,
      mostrarAlerta,
      alertaErro,
    ],
  );

  return (
    <View className="flex-1 bg-slate-50">
      <SafeAreaView edges={["top"]} className="bg-orange-600">
        <View className="flex-row items-center gap-3 px-6 pb-4 pt-2">
          <View className="h-12 w-12 items-center justify-center rounded-full bg-orange-700">
            <Text className="text-base font-semibold text-white">
              {getIniciais(operador)}
            </Text>
          </View>
          <View className="flex-1">
            <Text className="text-xs font-medium uppercase text-orange-100">
              {empresa}
            </Text>
            <Text className="text-lg font-semibold text-white">{operador}</Text>
            <Text className="text-sm text-orange-100">{dataAtual}</Text>
          </View>
          <IconButton icon={LogOut} onPress={onLogout} />
        </View>
      </SafeAreaView>

      <View className="px-6 pt-4">
        <Input
          className="h-12 rounded-xl border border-slate-200 bg-white px-4 text-base text-slate-900"
          value={search}
          onChangeText={setSearch}
          placeholder="Buscar por OP, produto ou código"
          placeholderTextColor="#94a3b8"
        />
      </View>

      <FlatList
        data={ordensFiltradas}
        keyExtractor={(item) => `${item.idiProc}-${item.idiAtv}`}
        contentContainerClassName="gap-3 px-6 pt-4"
        contentContainerStyle={{ paddingBottom: insets.bottom + 16 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={["#ea580c"]}
            tintColor="#ea580c"
          />
        }
        ListEmptyComponent={
          <Text className="mt-10 text-center text-sm text-slate-500">
            Nenhuma ordem de produção encontrada.
          </Text>
        }
        renderItem={({ item }) => (
          <OrdemProducaoCard
            ordem={item}
            loading={iniciandoIdiAtv === item.idiAtv}
            onIniciarAtividade={handleIniciarAtividade}
            onIrParaBipagem={handleIrParaBipagem}
          />
        )}
      />

      {sincronizando ? (
        <View
          className="absolute inset-0 items-center justify-center bg-black/30"
          pointerEvents="auto"
        >
          <View className="items-center gap-3 rounded-xl bg-white px-8 py-6">
            <ActivityIndicator size="large" color="#ea580c" />
            <Text className="text-sm font-medium text-slate-700">
              Sincronizando apontamentos...
            </Text>
          </View>
        </View>
      ) : null}
    </View>
  );
}
