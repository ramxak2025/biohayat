import { cloneElement, type ReactElement } from "react";
import { Platform, StyleSheet, type StyleProp, type ViewStyle } from "react-native";
import { Link, type Href } from "expo-router";
import { useReducedMotion } from "react-native-reanimated";

type StyledChild = ReactElement<{ style?: StyleProp<ViewStyle> }>;

/** Expo's native Slot requires an object style on its direct child. */
function slotChild(child: StyledChild): StyledChild {
  return Array.isArray(child.props.style)
    ? cloneElement(child, { style: StyleSheet.flatten(child.props.style) })
    : child;
}

/** Navigation stays with Expo Router so it can attach its native source identifier. */
export function ProductLink({ href, children }: { href: Href; children: StyledChild }) {
  return <Link href={href} asChild push>{slotChild(children)}</Link>;
}

export function ProductZoomSource({ children, enabled = true }: { children: StyledChild; enabled?: boolean }) {
  const reduced = useReducedMotion();
  return enabled && Platform.OS === "ios" && !reduced ? <Link.AppleZoom>{slotChild(children)}</Link.AppleZoom> : children;
}

export function ProductZoomTarget({ children }: { children: ReactElement }) {
  const reduced = useReducedMotion();
  return Platform.OS === "ios" && !reduced ? <Link.AppleZoomTarget>{children}</Link.AppleZoomTarget> : children;
}
