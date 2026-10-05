import { useLocalSearchParams } from "expo-router";
import { ProductScreen } from "@/screens/product";

export default function Route() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  return <ProductScreen slug={slug} />;
}
