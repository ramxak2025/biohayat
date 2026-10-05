import { StyleSheet, View } from "react-native";
import * as Haptics from "expo-haptics";
import { SymbolView } from "expo-symbols";
import { Controller, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { api } from "@/api/endpoints";
import { qk } from "@/api/keys";
import type { Consultation } from "@/api/types";
import { AppText, Button, Chip, errorMessage, Input, PhoneInput } from "@/components/ui";
import { plural } from "@/lib/format";
import { useAuth } from "@/store/auth";
import { radii, spacing, useColors } from "@/theme";

import { consultationSchema, MESSAGE_LIMIT, TOPICS, type ConsultationValues } from "./schema";

export interface ConsultationFormProps {
  onSent: (consultation: Consultation) => void;
}

export function ConsultationForm({ onSent }: ConsultationFormProps) {
  const colors = useColors();
  const queryClient = useQueryClient();
  const customer = useAuth((state) => state.customer);

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ConsultationValues>({
    resolver: zodResolver(consultationSchema),
    mode: "onTouched",
    defaultValues: {
      topic: "",
      name: customer?.name ?? "",
      phone: customer?.phone ?? "",
      message: "",
    },
  });

  // useWatch вместо watch(): watch() возвращает не мемоизируемую функцию и выключает React Compiler
  const message = useWatch({ control, name: "message" });
  const left = MESSAGE_LIMIT - message.length;

  const mutation = useMutation({
    mutationFn: (values: ConsultationValues) =>
      api.consultations.create({
        topic: values.topic.trim() || undefined,
        message: values.message.trim(),
        name: values.name.trim(),
        phone: values.phone,
      }),
    onSuccess: (created, values) => {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      void queryClient.invalidateQueries({ queryKey: qk.consultations });
      // имя и телефон оставляем: вторую заявку не придётся набирать заново
      reset({ topic: "", name: values.name, phone: values.phone, message: "" });
      onSent(created);
    },
    onError: () => {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    },
  });

  const onSubmit = handleSubmit((values) => {
    mutation.mutate(values);
  });

  return (
    <View style={styles.form}>
      <View>
        <AppText variant="footnote" color="muted" weight="600" style={styles.label}>
          Тема
        </AppText>

        <Controller
          control={control}
          name="topic"
          render={({ field }) => (
            <View style={styles.topics}>
              {TOPICS.map((topic) => (
                <Chip
                  key={topic}
                  label={topic}
                  selected={field.value === topic}
                  // повторное нажатие снимает выбор: тема необязательна
                  onPress={() => field.onChange(field.value === topic ? "" : topic)}
                />
              ))}
            </View>
          )}
        />
      </View>

      <Controller
        control={control}
        name="name"
        render={({ field }) => (
          <Input
            label="Имя"
            value={field.value}
            onChangeText={field.onChange}
            onBlur={field.onBlur}
            error={errors.name?.message}
            placeholder="Как к вам обращаться"
            textContentType="name"
            autoComplete="name"
            returnKeyType="next"
          />
        )}
      />

      <Controller
        control={control}
        name="phone"
        render={({ field }) => (
          <PhoneInput
            value={field.value}
            onChangeText={field.onChange}
            onBlur={field.onBlur}
            error={errors.phone?.message}
            hint="По этому номеру с вами свяжется нутрициолог"
          />
        )}
      />

      <Controller
        control={control}
        name="message"
        render={({ field }) => (
          <Input
            label="Ваш вопрос"
            value={field.value}
            onChangeText={field.onChange}
            onBlur={field.onBlur}
            error={errors.message?.message}
            hint={`Осталось ${left} ${plural(left, "символ", "символа", "символов")}`}
            placeholder="Опишите задачу: какие БАД принимаете, цели, самочувствие…"
            multiline
            maxLength={MESSAGE_LIMIT}
            textAlignVertical="top"
            inputStyle={styles.message}
          />
        )}
      />

      {mutation.isError ? (
        <View
          accessibilityRole="alert"
          style={[styles.error, { backgroundColor: colors.surfaceSunken }]}
        >
          <SymbolView name="exclamationmark.triangle.fill" size={14} tintColor={colors.danger} />
          <AppText variant="footnote" color="danger" style={styles.errorText}>
            {errorMessage(mutation.error)}
          </AppText>
        </View>
      ) : null}

      <Button
        title="Отправить заявку"
        size="lg"
        fullWidth
        leftIcon="paperplane.fill"
        loading={mutation.isPending}
        onPress={onSubmit}
        haptic="medium"
        accessibilityHint="Отправит вопрос нутрициологу"
      />

      <AppText variant="caption" color="faint" align="center">
        Нажимая «Отправить заявку», вы соглашаетесь на обработку персональных данных.
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  form: { gap: spacing.base },
  label: { marginBottom: spacing.sm },
  topics: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  message: { minHeight: 132, paddingTop: spacing.md },
  error: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radii.lg,
  },
  errorText: { flex: 1 },
});
