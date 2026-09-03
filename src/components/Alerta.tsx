import { AlertTriangle, CheckCircle2, XCircle } from "lucide-react-native";
import { Modal as RNModal, Pressable, Text, View } from "react-native";
import { Button, ButtonVariant } from "./Button";

export type AlertaTipo = "erro" | "aviso" | "sucesso";

export type AlertaBotao = {
  texto: string;
  variante?: ButtonVariant;
  onPress?: () => void;
};

export type AlertaConteudo = {
  tipo: AlertaTipo;
  titulo: string;
  mensagem?: string;
  botoes?: AlertaBotao[];
};

const ESTILO_POR_TIPO = {
  erro: { Icone: XCircle, cor: "#dc2626", fundo: "bg-red-50" },
  aviso: { Icone: AlertTriangle, cor: "#ea580c", fundo: "bg-orange-50" },
  sucesso: { Icone: CheckCircle2, cor: "#16a34a", fundo: "bg-green-50" },
} as const;

const BOTAO_PADRAO: AlertaBotao = { texto: "OK" };

type AlertaProps = {
  conteudo: AlertaConteudo | null;
  onFechar: () => void;
};

export function Alerta({ conteudo, onFechar }: AlertaProps) {
  const { Icone, cor, fundo } = ESTILO_POR_TIPO[conteudo?.tipo ?? "aviso"];
  const botoes = conteudo?.botoes?.length ? conteudo.botoes : [BOTAO_PADRAO];

  function acionar(botao: AlertaBotao) {
    onFechar();
    botao.onPress?.();
  }

  return (
    <RNModal
      visible={!!conteudo}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onFechar}
    >
      <Pressable
        className="flex-1 items-center justify-center bg-black/50 px-6"
        onPress={onFechar}
      >
        <Pressable
          onPress={(e) => e.stopPropagation()}
          className="w-full max-w-sm rounded-2xl bg-white p-6"
        >
          <View className="mb-3 flex-row items-center gap-3">
            <View className={`rounded-full p-2 ${fundo}`}>
              <Icone size={22} color={cor} />
            </View>
            <Text className="flex-1 text-base font-semibold text-slate-900">
              {conteudo?.titulo}
            </Text>
          </View>

          {conteudo?.mensagem ? (
            <Text className="text-sm leading-5 text-slate-600">
              {conteudo.mensagem}
            </Text>
          ) : null}

          <View className="mt-6 flex-row gap-3">
            {botoes.map((botao) => (
              <View key={botao.texto} className="flex-1">
                <Button
                  title={botao.texto}
                  variant={botao.variante ?? "primary"}
                  onPress={() => acionar(botao)}
                />
              </View>
            ))}
          </View>
        </Pressable>
      </Pressable>
    </RNModal>
  );
}
