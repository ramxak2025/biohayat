import { useCallback, useEffect, useRef } from "react";
import { Keyboard } from "react-native";
import { useNavigation, useRoute, useRouter } from "expo-router";

/** A late login response must never dismiss the screen beneath this sheet. */
export function useAuthDismiss() {
  const navigation = useNavigation();
  const route = useRoute();
  const router = useRouter();
  const mounted = useRef(true);
  const closing = useRef(false);

  useEffect(() => {
    mounted.current = true;
    // A canceled drag does not remove the route and must not disable its controls.
    const unsubscribe = navigation.addListener("beforeRemove", () => {
      closing.current = true;
    });
    return () => {
      mounted.current = false;
      unsubscribe();
    };
  }, [navigation]);

  return useCallback(() => {
    if (!mounted.current || closing.current || !navigation.isFocused()) return;
    const state = navigation.getState();
    const index = state?.routes.findIndex((item) => item.key === route.key) ?? -1;
    if (!state || index < 0) return;

    closing.current = true;
    Keyboard.dismiss();
    if (index > 0) {
      // Bind dismissal to this exact route, even if UIKit wins the dismissal race.
      navigation.dispatch({ type: "POP", payload: { count: 1 }, source: route.key, target: state.key });
    } else {
      router.replace("/");
    }
  }, [navigation, route.key, router]);
}
