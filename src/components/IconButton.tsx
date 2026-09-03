import { LucideIcon } from "lucide-react-native";
import { Pressable, PressableProps } from "react-native";

type IconButtonProps = PressableProps & {
  icon: LucideIcon;
  size?: number;
  color?: string;
};

export function IconButton({
  icon: Icon,
  size = 22,
  color = "#ffffff",
  className,
  ...rest
}: IconButtonProps) {
  return (
    <Pressable
      hitSlop={8}
      className={`items-center justify-center rounded-lg p-2 active:bg-orange-700 ${className ?? ""}`}
      {...rest}
    >
      <Icon size={size} color={color} />
    </Pressable>
  );
}
