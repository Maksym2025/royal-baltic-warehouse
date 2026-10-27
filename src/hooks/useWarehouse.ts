import { useCallback, useEffect, useRef, useState } from "react";
import { seed, transition, validate } from "@/domain/inventory.js";
import type { Action, Role, WarehouseState } from "@/domain/types";

export const STORAGE_KEY = "royal-baltic-warehouse-v1";
const loadWarning =
  "Сохранённые данные недоступны. Открыт демонстрационный пример. Нажмите «Сбросить тестовые данные», чтобы сбросить локальные данные.";
function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const state: WarehouseState = JSON.parse(raw);
      validate(state);
      return { state, warning: "" };
    }
    return { state: seed(), warning: "" };
  } catch {
    return { state: seed(), warning: loadWarning };
  }
}
export function useWarehouse(onExternalUpdate: () => void) {
  const [initial] = useState(load);
  const [state, setState] = useState(initial.state);
  const [warning, setWarning] = useState(initial.warning);
  const current = useRef(initial.state);
  const blocked = useRef(!!initial.warning);
  const externalCallback = useRef(onExternalUpdate);
  externalCallback.current = onExternalUpdate;
  const update = useCallback((next: WarehouseState) => {
    current.current = next;
    setState(next);
  }, []);

  useEffect(() => {
    const sync = (event: StorageEvent) => {
      if (event.key !== STORAGE_KEY) return;
      try {
        const next: WarehouseState = event.newValue
          ? JSON.parse(event.newValue)
          : seed();
        validate(next);
        update(next);
        externalCallback.current();
      } catch {
        blocked.current = true;
        setWarning(
          "Данные из другой вкладки не распознаны. Перезагрузите страницу.",
        );
      }
    };
    window.addEventListener("storage", sync);
    return () => window.removeEventListener("storage", sync);
  }, [update]);

  const commit = useCallback(
    (action: Action, role: Role) => {
      if (blocked.current)
        throw new Error(
          "Сначала сбросьте локальные данные через «Сбросить тестовые данные».",
        );
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const latest: WarehouseState = JSON.parse(raw);
        validate(latest);
        if (latest.revision !== current.current.revision) {
          update(latest);
          throw new Error(
            "Данные изменились в другой вкладке. Проверьте остатки и повторите действие.",
          );
        }
      }
      const next = transition(current.current, action, role);
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {
        throw new Error(
          "Не удалось сохранить операцию. Изменения не применены.",
        );
      }
      update(next);
      return next;
    },
    [update],
  );
  const reset = useCallback(() => {
    const fresh = seed();
    fresh.revision = current.current.revision + 1;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(fresh));
    blocked.current = false;
    setWarning("");
    update(fresh);
  }, [update]);
  return { state, warning, commit, reset };
}
