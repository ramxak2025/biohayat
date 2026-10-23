import { StyleSheet, View } from "react-native";
import { Card, Skeleton } from "@/components/ui";
import { spacing, radii } from "@/theme";

export function TrackerSkeleton() {
  return <View style={styles.stack} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
    <Skeleton width="45%" height={24} /><Skeleton width="80%" height={18} />
    <View style={styles.week}>{Array.from({ length: 7 }, (_, index) => <Skeleton key={index} width={38} height={60} radius={radii.md} />)}</View>
    {[0, 1].map((index) => <Card key={index}><View style={styles.stack}><Skeleton width={64} height={20} /><Skeleton width="85%" height={22} /><Skeleton width="60%" height={18} /><Skeleton width="100%" height={48} radius={radii.lg} /></View></Card>)}
  </View>;
}
const styles = StyleSheet.create({ stack: { gap: spacing.md }, week: { flexDirection: "row", flexWrap: "wrap", gap: spacing.xs } });
