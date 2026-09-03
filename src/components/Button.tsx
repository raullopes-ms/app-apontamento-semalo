import {
  ActivityIndicator,
  Pressable,
  PressableProps,
  Text,
} from "react-native";

export type ButtonVariant = "primary" | "secondary" | "destructive";

type ButtonProps = PressableProps & {
  title: string;
  loading?: boolean;
  variant?: ButtonVariant;
};

const ESTILO_POR_VARIANTE = {
  primary: {
    fundo: "bg-orange-600 active:bg-orange-700",
    texto: "text-white",
    spinner: "#ffffff",
  },
  secondary: {
    fundo: "bg-slate-100 active:bg-slate-200",
    texto: "text-slate-800",
    spinner: "#1e293b",
  },
  destructive: {
    fundo: "bg-red-600 active:bg-red-700",
    texto: "text-white",
    spinner: "#ffffff",
  },
} as const;

export function Button({
  title,
  loading,
  variant = "primary",
  disabled,
  ...rest
}: ButtonProps) {
  const estilo = ESTILO_POR_VARIANTE[variant];

  return (
    <Pressable
      disabled={disabled || loading}
      className={`h-12 items-center justify-center rounded-xl ${estilo.fundo} ${
        disabled || loading ? "opacity-60" : ""
      }`}
      {...rest}
    >
      {loading ? (
        <ActivityIndicator color={estilo.spinner} />
      ) : (
        <Text className={`text-base font-semibold ${estilo.texto}`}>
          {title}
        </Text>
      )}
    </Pressable>
  );
}
