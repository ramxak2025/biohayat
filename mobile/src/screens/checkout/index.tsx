import { createCheckoutRequest } from "@/lib/checkout-request";
import { sessionGeneration } from "@/lib/session-generation";
import { useCallback, useRef, useState } from "react";
import { StyleSheet, View, type ScrollView } from "react-native";
import * as Haptics from "expo-haptics";
import { Stack, useRouter, type Href } from "expo-router";
import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { KeyboardStickyView } from "react-native-keyboard-controller";

import { qk } from "@/api/keys";
import {
  cartTotals,
  CheckoutBar,
  CheckoutNotes,
  ConsentNote,
  OrderSummary,
  useCartHydrated,
} from "@/components/cart";
import {
  AppText,
  BadDisclaimer,
  EmptyState,
  ErrorState,
  Input,
  ListSkeleton,
  PhoneInput,
  Screen,
  useDetailScreenOptions,
  useTabBarInset,
} from "@/components/ui";
import { useAuth } from "@/store/auth";
import { useCart } from "@/store/cart";
import { spacing } from "@/theme";

import { checkoutSchema, clampQty, type CheckoutValues } from "./schema";

/** Подпись главной кнопки. Повторяется в строке согласия — она называет действие. */
const SUBMIT_LABEL = "Оформить заказ";

export function CheckoutScreen() {
  const router = useRouter();
  const detailOptions = useDetailScreenOptions();
  const queryClient = useQueryClient();
  const tabBarInset = useTabBarInset();

  const customer = useAuth((state) => state.customer);
  const lines = useCart((state) => state.lines);
  const consume = useCart((state) => state.consume);
  const [submitOrder] = useState(createCheckoutRequest);
  const epoch = sessionGeneration();
  const hydrated = useCartHydrated();
  const totals = cartTotals(lines);

  /** Корзина чистится ДО навигации — не даём пустому состоянию мигнуть на кадр. */
  const [placed, setPlaced] = useState(false);

  /**
   * Кнопка липкая, а ошибки — вверху формы. Значит после неудачной отправки
   * экран обязан сам увезти человека туда, где написано, что не так.
   */
  const scrollRef = useRef<ScrollView | null>(null);
  const reportFailure = useCallback(() => {
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    scrollRef.current?.scrollTo({ y: 0, animated: true });
  }, []);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<CheckoutValues>({
    resolver: zodResolver(checkoutSchema),
    mode: "onTouched",
    // профиль уже знает имя и телефон — не заставляем набирать их заново
    defaultValues: {
      customerName: customer?.name ?? "",
      phone: customer?.phone ?? "",
      address: "",
      comment: "",
    },
  });

  const mutation = useMutation({
    mutationFn: (values: CheckoutValues) =>
      // токен подставляет apiFetch: без Bearer заказ не привяжется к ЛК (ловушка T-1)
      submitOrder({
        customerName: values.customerName.trim(),
        phone: values.phone,
        // почту в форме не спрашиваем: она есть в профиле и нужна только менеджеру
        email: customer?.email?.trim() || undefined,
        address: values.address.trim() || undefined,
        comment: values.comment.trim() || undefined,
        // согласие дано нажатием кнопки — под ней об этом написано дословно
        consent: true,
      }, lines.map(line => ({ ...line, qty: clampQty(line.qty) }))),
    onSuccess: ({ order, items }) => {
      if (epoch !== sessionGeneration()) return;
      setPlaced(true);
      consume(items);
      void queryClient.invalidateQueries({ queryKey: qk.orders });

      router.replace({
        pathname: "/cart/success",
        params: {
          number: String(order.number),
          total: String(order.total.kopecks),
          status: order.statusLabel,
        },
      });
    },
    onError: reportFailure,
  });

  /**
   * `handleSubmit` зовём внутри колбэка, а не в рендере: иначе обработчик
   * неудачи (он читает ref скролла) формально оказывается вызванным во время
   * рендера — на это справедливо ругается правило React Compiler про refs.
   */
  const onSubmit = useCallback(() => {
    void handleSubmit(
      (values) => mutation.mutate(values),
      // поля не прошли проверку: подсветку уже поставил react-hook-form, наше
      // дело — показать её и отдать пальцу «не получилось»
      reportFailure,
    )();
  }, [handleSubmit, mutation, reportFailure]);

  const header = <Stack.Screen options={{ ...detailOptions, title: "Оформление" }} />;

  if (!hydrated) {
    return (
      <>
        {header}
        <Screen scroll>
          <ListSkeleton variant="line" count={6} />
        </Screen>
      </>
    );
  }

  if (!lines.length && !placed) {
    return (
      <>
        {header}
        <Screen>
          <View style={styles.emptyWrap}>
            <EmptyState
              icon="basket"
              title="Корзина пуста"
              subtitle="Похоже, товары уже уехали. Выберите что-нибудь в каталоге."
              actionLabel="В каталог"
              onAction={() => router.replace("/catalog" as Href)}
            />
          </View>
        </Screen>
      </>
    );
  }

  return (
    <>
      {header}
      <Screen
        scroll
        scrollRef={scrollRef}
        // iOS сам поднимает контент над клавиатурой, если разрешить правку инсетов
        scrollProps={{ automaticallyAdjustKeyboardInsets: true }}
        footer={
          // панель едет вместе с клавиатурой: кнопка не должна оказаться под ней.
          // `opened` гасит отступ под таб-бар — с поднятой клавиатурой его нет
          <KeyboardStickyView offset={{ closed: 0, opened: tabBarInset }}>
            <CheckoutBar
              caption="Итого"
              totalKopecks={totals.totalKopecks}
              actionTitle={SUBMIT_LABEL}
              loading={mutation.isPending}
              onAction={onSubmit}
              actionHint="Заявка уйдёт менеджеру, оплата при получении"
              note={<ConsentNote actionLabel={SUBMIT_LABEL} />}
            />
          </KeyboardStickyView>
        }
      >
        {/* «что я отправляю» — сверху и свёрнуто, чтобы не отодвигать поля вниз */}
        <OrderSummary lines={lines} totals={totals} style={styles.summary} />

        {mutation.isError ? (
          <ErrorState error={mutation.error} onRetry={onSubmit} compact style={styles.error} />
        ) : null}

        <AppText variant="title3" style={styles.sectionTitle}>
          Контакты
        </AppText>

        <Controller
          control={control}
          name="customerName"
          render={({ field: { onChange, onBlur, value } }) => (
            <Input
              label="Имя и фамилия"
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              error={errors.customerName?.message}
              placeholder="Иван Иванов"
              textContentType="name"
              autoComplete="name"
              autoCapitalize="words"
              returnKeyType="next"
              containerStyle={styles.field}
            />
          )}
        />

        <Controller
          control={control}
          name="phone"
          render={({ field: { onChange, onBlur, value } }) => (
            <PhoneInput
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              error={errors.phone?.message}
              hint="По этому номеру менеджер подтвердит заказ"
              containerStyle={styles.field}
            />
          )}
        />

        <AppText variant="title3" style={styles.sectionTitle}>
          Доставка
        </AppText>

        <Controller
          control={control}
          name="address"
          render={({ field: { onChange, onBlur, value } }) => (
            <Input
              label="Адрес"
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              error={errors.address?.message}
              placeholder="Город, улица, дом, квартира"
              textContentType="fullStreetAddress"
              autoComplete="street-address"
              hint="Не знаете точный адрес — менеджер уточнит его по телефону"
              multiline
              inputStyle={styles.multiline}
              containerStyle={styles.field}
            />
          )}
        />

        <Controller
          control={control}
          name="comment"
          render={({ field: { onChange, onBlur, value } }) => (
            <Input
              label="Комментарий"
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              error={errors.comment?.message}
              placeholder="Удобное время, пожелания к заказу"
              multiline
              inputStyle={styles.comment}
              containerStyle={styles.field}
            />
          )}
        />

        <CheckoutNotes style={styles.block} />

        <BadDisclaimer style={styles.block} />
      </Screen>
    </>
  );
}

const styles = StyleSheet.create({
  emptyWrap: { flex: 1, justifyContent: "center" },
  summary: { marginTop: spacing.sm },
  error: { paddingBottom: 0 },
  sectionTitle: { marginTop: spacing.lg, marginBottom: spacing.md },
  field: { marginBottom: spacing.md },
  multiline: { minHeight: 56 },
  comment: { minHeight: 88 },
  block: { marginTop: spacing.base },
});
