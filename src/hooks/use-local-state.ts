import { useCallback, useEffect, useState, type Dispatch, type SetStateAction } from "react";
import { readLocal, subscribeLocal, writeLocal, type Validator } from "@/lib/local-store";

/**
 * localStorage에 자동 저장되는 상태.
 * 첫 화면은 서버와 똑같이 기본값으로 그리고, 화면이 뜬 뒤 저장된 값을 불러와요.
 * 불러오기 전에는 절대 저장하지 않아서, 새로고침 중 저장된 데이터가 빈 값으로 덮이지 않아요.
 * 다른 탭에서 바꾼 값도 따라와요.
 */
export function useLocalState<T>(
  key: string,
  fallback: T,
  validate: Validator<T>,
): [T, Dispatch<SetStateAction<T>>, boolean] {
  const [value, setValue] = useState<T>(fallback);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setValue(readLocal(key, validate, fallback));
    setHydrated(true);
    return subscribeLocal(key, () => setValue(readLocal(key, validate, fallback)));
    // fallback/validate are expected to be stable module-level values
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  useEffect(() => {
    if (hydrated) writeLocal(key, value);
  }, [key, value, hydrated]);

  const set = useCallback<Dispatch<SetStateAction<T>>>((next) => setValue(next), []);
  return [value, set, hydrated];
}
