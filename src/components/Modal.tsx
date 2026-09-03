import { X } from "lucide-react-native";
import { ReactNode } from "react";
import {
  Modal as RNModal,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type ModalProps = {
  visible: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
};

export function Modal({ visible, onClose, title, children }: ModalProps) {
  return (
    <RNModal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable className="flex-1 justify-end bg-black/50" onPress={onClose}>
        <Pressable
          onPress={(e) => e.stopPropagation()}
          className="max-h-[80%] overflow-hidden rounded-t-2xl bg-white"
        >
          <SafeAreaView edges={["bottom"]} className="shrink p-6">
            <View className="mb-4 shrink-0 flex-row items-center justify-between">
              <Text className="text-base font-semibold text-slate-900">
                {title}
              </Text>
              <Pressable
                onPress={onClose}
                hitSlop={8}
                className="rounded-lg p-1 active:bg-slate-100"
              >
                <X size={20} color="#475569" />
              </Pressable>
            </View>
            <ScrollView className="shrink" showsVerticalScrollIndicator={false}>
              {children}
            </ScrollView>
          </SafeAreaView>
        </Pressable>
      </Pressable>
    </RNModal>
  );
}
