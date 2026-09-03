import { Text, TouchableOpacity, View } from "react-native";
import { Button } from "./Button";

export type OrdemProducao = {
  descrProd: string;
  qtdPallet: number;
  idiProc: number;
  codProd: number;
  qtdProduzir: number;
  iniciadoApo: boolean;
  idiAtv: number;
  dum: string;
  saldo: number;
};

const STATUS_STYLES = {
  pendente: { bg: "bg-slate-100", text: "text-slate-700", label: "Pendente" },
  emAndamento: {
    bg: "bg-amber-100",
    text: "text-amber-700",
    label: "Em Andamento",
  },
  finalizado: {
    bg: "bg-emerald-100",
    text: "text-emerald-700",
    label: "Finalizado",
  },
};

type OrdemProducaoCardProps = {
  ordem: OrdemProducao;
  loading?: boolean;
  onIniciarAtividade?: (ordem: OrdemProducao) => void;
  onIrParaBipagem?: (ordem: OrdemProducao) => void;
};

export function OrdemProducaoCard({
  ordem,
  loading,
  onIniciarAtividade,
  onIrParaBipagem,
}: OrdemProducaoCardProps) {
  const isFinalizado = ordem.saldo === 0;

  const status = isFinalizado
    ? STATUS_STYLES.finalizado
    : ordem.iniciadoApo
      ? STATUS_STYLES.emAndamento
      : STATUS_STYLES.pendente;

  return (
    <View className="rounded-xl border border-slate-200 bg-white p-4">
      <View className="mb-3 flex-row items-center justify-between">
        <Text className="text-base font-semibold text-slate-900">
          OP {ordem.idiProc}
        </Text>
        <View className={`rounded-full px-3 py-1 ${status.bg}`}>
          <Text className={`text-xs font-medium ${status.text}`}>
            {status.label}
          </Text>
        </View>
      </View>

      <Text className="text-sm font-medium text-slate-800">
        {ordem.descrProd}
      </Text>
      <Text className="mb-3 text-xs text-slate-500">
        Código: {ordem.codProd}
      </Text>

      <View className="flex-row flex-wrap gap-y-2">
        <View className="w-1/2">
          <Text className="text-xs text-slate-500">Qtd a Produzir</Text>
          <Text className="text-sm text-slate-800">{ordem.qtdProduzir}</Text>
        </View>

        <View className="w-1/2">
          <Text className="text-xs text-slate-500">Saldo da OP</Text>
          <Text className="text-sm text-slate-800">{ordem.saldo}</Text>
        </View>
      </View>

      <View className="mt-4">
        {ordem.iniciadoApo ? (
          <Button
            title="Ir para Apontamento"
            disabled={isFinalizado}
            onPress={() => onIrParaBipagem?.(ordem)}
          />
        ) : (
          <Button
            title="Iniciar Atividade"
            loading={loading}
            onPress={() => onIniciarAtividade?.(ordem)}
          />
        )}
      </View>
    </View>
  );
}
