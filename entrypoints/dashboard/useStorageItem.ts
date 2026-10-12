import { useEffect, useState } from 'react';
import type { WxtStorageItem } from 'wxt/utils/storage';

/** 저장소 항목을 읽고, 다른 곳에서 바뀌면 다시 렌더링한다. 처음 읽기 전에는 undefined. */
export function useStorageItem<T>(item: WxtStorageItem<T, Record<string, unknown>>): T | undefined {
  const [value, setValue] = useState<T>();

  useEffect(() => {
    let cancelled = false;
    item.getValue().then((initial) => {
      if (!cancelled) setValue(initial);
    });
    const unwatch = item.watch((next) => setValue(next));
    return () => {
      cancelled = true;
      unwatch();
    };
  }, [item]);

  return value;
}
