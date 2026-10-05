import { api } from "@/api/endpoints";

/**
 * Обращение в поддержку. Отдельного канала в API нет, поэтому используем заявку
 * на консультацию — она уходит менеджеру в Битрикс24 ровно так же.
 */
export async function sendSupportRequest(topic: string, message: string): Promise<void> {
  await api.consultations.create({ topic, message });
}
