import { useEffect, useState } from 'react';
import { AppState } from 'react-native';
import { localDay } from '@/lib/format';
export const trackerTimeZone = () => Intl.DateTimeFormat().resolvedOptions().timeZone || 'Europe/Moscow';
export function useTrackerClock() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const refresh = () => setNow(new Date()); const timer = setInterval(refresh, 30_000);
    const listener = AppState.addEventListener('change', state => { if (state === 'active') refresh(); });
    return () => { clearInterval(timer); listener.remove(); };
  }, []);
  return { now, today: localDay(now), timeZone: trackerTimeZone() };
}
