import { useLocalSearchParams } from "expo-router";
import { OrderScreen } from "@/screens/order";

export default function Route() {
  const { number } = useLocalSearchParams<{ number: string }>();
  return <OrderScreen number={number} />;
}
