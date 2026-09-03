import { forwardRef, useState } from "react";
import { Text, TextInput, TextInputProps, View } from "react-native";

type InputProps = TextInputProps & {
  label?: string;
  error?: string;
};

export const Input = forwardRef<TextInput, InputProps>(function Input(
  { label, error, onFocus, onBlur, ...rest },
  ref,
) {
  const [focused, setFocused] = useState(false);

  return (
    <View className="w-full">
      {label ? (
        <Text className="mb-1 text-sm font-medium text-slate-700">{label}</Text>
      ) : null}
      <TextInput
        ref={ref}
        placeholderTextColor="#94a3b8"
        className={`h-12 rounded-xl border bg-white px-4 text-base text-slate-900 ${
          error
            ? "border-red-500"
            : focused
              ? "border-orange-600"
              : "border-slate-200"
        }`}
        onFocus={(e) => {
          setFocused(true);
          onFocus?.(e);
        }}
        onBlur={(e) => {
          setFocused(false);
          onBlur?.(e);
        }}
        {...rest}
      />
      {error ? (
        <Text className="mt-1 text-xs text-red-500">{error}</Text>
      ) : null}
    </View>
  );
});
