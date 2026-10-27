import { useEffect, useRef, useState } from "react";
import { grams, qty, stock } from "@/domain/inventory.js";
import type { Action, DialogMode, Role, WarehouseState } from "@/domain/types";
import { Button } from "./ui/button";

export function WarehouseDialog({
  mode,
  state,
  role,
  selected,
  onClose,
  onCommit,
  onReset,
}: {
  mode: DialogMode;
  state: WarehouseState;
  role: Role;
  selected: string;
  onClose: () => void;
  onCommit: (action: Action) => void;
  onReset: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null),
    errorElement = useRef<HTMLParagraphElement>(null);
  const [productId, setProductId] = useState(selected);
  const [quantity, setQuantity] = useState(""),
    [client, setClient] = useState(""),
    [reference, setReference] = useState("");
  const [error, setError] = useState("");
  useEffect(() => {
    const el = dialog.current!;
    el.showModal();
    return () => el.close();
  }, []);
  useEffect(() => {
    if (error) errorElement.current?.focus();
  }, [error]);
  const kind = mode.kind;
  const order =
    mode.kind === "confirm"
      ? state.orders.find((o) => o.id === mode.action.id)!
      : undefined;
  const type = mode.kind === "confirm" ? mode.action.type : null;
  const v = stock(state, order?.productId || productId);
  let n = 0;
  try {
    n = grams(quantity);
  } catch {
    /* Invalid input is reported by the preserved domain on submit. */
  }
  const title = type
    ? {
        SHIP: "Подтвердить отгрузку",
        AUTHORIZE: "Разрешить отгрузку",
        CANCEL: "Отменить заказ",
      }[type]
    : {
        receive: "Внести приход",
        order: "Создать заказ",
        reset: "Начать заново?",
        confirm: "",
      }[kind];
  const description =
    type && order
      ? {
          SHIP: `${order.client} · ${qty(order.amount)} кг. Разрешение root admin получено. Отгрузка спишет товар со склада.`,
          AUTHORIZE:
            "Вы выдаёте разрешение на отгрузку. Товар остаётся на складе и в резерве до отдельного действия «Отгрузить».",
          CANCEL:
            "Заказ будет закрыт. Созданный резерв полностью вернётся в свободный остаток.",
        }[type]
      : {
          receive:
            "Новый приход прибавится к текущему остатку. Существующие резервы сохранятся.",
          order:
            "Заказ появится как черновик. Резерв возникнет только после отдельного подтверждения.",
          reset:
            "Все ваши операции в этом браузере будут удалены. Вернутся три тестовых товара и два стартовых заказа.",
          confirm: "",
        }[kind];
  const submitLabel = type
    ? {
        SHIP: "Отгрузить и списать",
        AUTHORIZE: "Выдать разрешение",
        CANCEL: "Отменить заказ",
      }[type]
    : {
        receive: "Добавить на склад",
        order: "Создать черновик",
        reset: "Сбросить пример",
        confirm: "",
      }[kind];
  return (
    <dialog
      ref={dialog}
      id="dialog"
      aria-labelledby="dialog-title"
      aria-describedby="description"
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
    >
      <form
        id="form"
        onSubmit={(e) => {
          e.preventDefault();
          try {
            if (kind === "reset") onReset();
            else if (mode.kind === "confirm") onCommit(mode.action);
            else
              onCommit(
                kind === "receive"
                  ? { type: "RECEIVE", productId, quantity, reference }
                  : { type: "CREATE_ORDER", productId, quantity, client },
              );
            onClose();
          } catch (e) {
            setError(e instanceof Error ? e.message : String(e));
            requestAnimationFrame(() => errorElement.current?.focus());
          }
        }}
      >
        <div className="dialog-heading">
          <div>
            <div className="section-kicker" id="dialog-eyebrow">
              {order
                ? `${order.id} / ${role === "root" ? "ROOT ADMIN" : "МЕНЕДЖЕР"}`
                : kind === "receive"
                  ? "ПОПОЛНЕНИЕ ЗАПАСОВ"
                  : kind === "order"
                    ? "НОВЫЙ ТЕСТОВЫЙ ЗАКАЗ"
                    : "СБРОС ПРИМЕРА"}
            </div>
            <h2 id="dialog-title">{title}</h2>
          </div>
          <button
            className="close-button"
            type="button"
            id="dialog-close"
            aria-label="Закрыть"
            onClick={onClose}
          >
            ×
          </button>
        </div>
        <p id="description">{description}</p>
        <div id="fields">
          {kind === "reset" ? (
            <div className="confirm-summary">
              Начальные остатки: <b>450 кг</b>
              <br />
              Резерв: <b>40 кг</b> · Свободно: <b>410 кг</b>
            </div>
          ) : order && type ? (
            <div className="confirm-summary">
              {type === "SHIP" ? (
                <>
                  На складе:{" "}
                  <b>
                    {qty(v.current)} → {qty(v.current - order.amount)} кг
                  </b>
                  <br />
                  Резерв:{" "}
                  <b>
                    {qty(v.reserved)} → {qty(v.reserved - order.amount)} кг
                  </b>
                  <br />
                  Свободно: <b>{qty(v.free)} кг — без изменений</b>
                </>
              ) : type === "AUTHORIZE" ? (
                <>
                  Оплата: <b>{order.paid ? "отмечена" : "не отмечена"}</b>
                  <br />
                  Резерв: <b>{qty(order.amount)} кг — сохраняется</b>
                  <br />
                  Списание: <b>только после отдельной отгрузки</b>
                </>
              ) : (
                <>
                  Будет освобождено:{" "}
                  <b>
                    {qty(order.status === "approved" ? order.amount : 0)} кг
                  </b>
                  <br />
                  Физический остаток: <b>{qty(v.current)} кг — без изменений</b>
                </>
              )}
            </div>
          ) : (
            <>
              {kind === "order" && (
                <div className="field">
                  <label htmlFor="client">Клиент</label>
                  <input
                    id="client"
                    placeholder="Например, Restaurant Démo"
                    maxLength={80}
                    required
                    autoComplete="off"
                    value={client}
                    onChange={(e) => setClient(e.target.value)}
                  />
                </div>
              )}
              <div className="field">
                <label htmlFor="product">Товар</label>
                <select
                  id="product"
                  value={productId}
                  onChange={(e) => setProductId(e.target.value)}
                >
                  {state.products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label htmlFor="quantity">Количество, кг</label>
                <input
                  id="quantity"
                  inputMode="decimal"
                  placeholder="0"
                  required
                  autoComplete="off"
                  maxLength={16}
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                />
                <small>Можно дробное: например, 12,5 кг</small>
              </div>
              {kind === "receive" && (
                <div className="field">
                  <label htmlFor="reference">
                    Номер документа · необязательно
                  </label>
                  <input
                    id="reference"
                    placeholder="Например, IN-025"
                    maxLength={80}
                    autoComplete="off"
                    value={reference}
                    onChange={(e) => setReference(e.target.value)}
                  />
                </div>
              )}
              <div id="live-preview" className="preview">
                {kind === "receive" ? (
                  <>
                    На складе:{" "}
                    <strong>
                      {qty(v.current)} + {qty(n)} = {qty(v.current + n)} кг
                    </strong>
                    <br />
                    Резерв: <strong>{qty(v.reserved)} кг</strong> · Свободно
                    после прихода: <strong>{qty(v.free + n)} кг</strong>
                  </>
                ) : (
                  <>
                    Свободно сейчас: <strong>{qty(v.free)} кг</strong>
                    <br />
                    {n > v.free ? (
                      <>
                        Для подтверждения потребуется ещё{" "}
                        <strong>{qty(n - v.free)} кг</strong>. Черновик создать
                        можно.
                      </>
                    ) : (
                      "Создание черновика не меняет остатки и резерв."
                    )}
                  </>
                )}
              </div>
            </>
          )}
        </div>
        <p
          className="error"
          id="form-error"
          role="alert"
          tabIndex={-1}
          ref={errorElement}
          hidden={!error}
        >
          {error}
        </p>
        <div className="dialog-actions">
          <Button type="button" id="dialog-cancel" onClick={onClose}>
            Отмена
          </Button>
          <Button variant="primary" type="submit" id="dialog-submit">
            {submitLabel}
          </Button>
        </div>
      </form>
    </dialog>
  );
}
