import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { AESEncryptionKey, AESSealedData, aesDecryptAsync, aesEncryptAsync, digestStringAsync, CryptoDigestAlgorithm } from 'expo-crypto';
import { API_BASE } from '@/api/config';
import { emptyTracker, type TrackerData } from './engine';

const chains = new Map<string, Promise<unknown>>();
const purged = new Set<string>();
export const partitionFor = (owner: string) => `${API_BASE}|${owner}`;
function serialized<T>(partition: string, task: () => Promise<T>): Promise<T> {
  const result = (chains.get(partition) ?? Promise.resolve()).catch(() => undefined).then(task);
  chains.set(partition, result.then(() => undefined, () => undefined)); return result;
}
async function keys(partition: string) {
  const hash = await digestStringAsync(CryptoDigestAlgorithm.SHA256, partition);
  return { data: `hayat.tracker.v1.${hash}`, key: `hayat.tracker.key.v1.${hash}` };
}
async function read(partition: string): Promise<TrackerData> {
  const k = await keys(partition);
  const raw = await AsyncStorage.getItem(k.data);
  if (!raw) return emptyTracker();
  const secret = await SecureStore.getItemAsync(k.key);
  if (!secret) throw new Error('Ключ локальных данных недоступен. Не удаляйте приложение; попробуйте открыть его после разблокировки телефона.');
  try {
    const key = await AESEncryptionKey.import(secret, 'hex');
    const bytes = await aesDecryptAsync(AESSealedData.fromCombined(raw), key, { additionalData: new TextEncoder().encode(`1|${partition}`) });
    const data: TrackerData = JSON.parse(new TextDecoder().decode(bytes));
    if (data.schema !== 1 || !Array.isArray(data.plans) || !Array.isArray(data.cells) || !Array.isArray(data.pending) || !Array.isArray(data.ranges) || !data.imports) throw new Error('schema');
    return data;
  } catch { throw new Error('Не удалось открыть локальные данные. Они сохранены; повторите попытку.'); }
}
async function write(partition: string, data: TrackerData) {
  const k = await keys(partition);
  let secret = await SecureStore.getItemAsync(k.key);
  if (!secret) {
    if (await AsyncStorage.getItem(k.data)) throw new Error('Ключ локальных данных недоступен');
    secret = await (await AESEncryptionKey.generate()).encoded('hex');
    await SecureStore.setItemAsync(k.key, secret);
  }
  const key = await AESEncryptionKey.import(secret, 'hex');
  const sealed = await aesEncryptAsync(new TextEncoder().encode(JSON.stringify(data)), key, { additionalData: new TextEncoder().encode(`1|${partition}`) });
  await AsyncStorage.setItem(k.data, await sealed.combined('base64'));
}
export function loadTracker(partition: string) { return serialized(partition, () => read(partition)); }
/** Serialize read + reduce + encryption + atomic replacement, not just the final storage call. */
export function transactTracker(partition: string, reduce: (data: TrackerData) => void): Promise<TrackerData> {
  return serialized(partition, async () => {
    if (purged.has(partition)) throw new Error('Аккаунт удалён');
    const data = await read(partition); reduce(data); await write(partition, data); return data;
  });
}
export function purgeTracker(partition: string) {
  purged.add(partition);
  return serialized(partition, async () => { const k = await keys(partition); await AsyncStorage.removeItem(k.data); await SecureStore.deleteItemAsync(k.key); });
}
