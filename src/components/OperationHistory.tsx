import { qty } from "@/domain/inventory.js";
import type { Totals, WarehouseState } from "@/domain/types";
import { EmptyRow, Weight } from "./Stock";

export const date = (value: string | null) =>
  value
    ? new Date(value).toLocaleString("ru-RU", {
        timeZone: "Europe/Berlin",
        day: "2-digit",
        month: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "Стартовый пример";
export function ReceiptRows({ state }: { state: WarehouseState }) {
  if (!state.receipts.length)
    return (
      <EmptyRow
        columns={4}
        heading="Приходов пока нет"
        detail="Внесите первую поставку. Она прибавится к остатку выбранного товара, а существующие резервы сохранятся."
      />
    );
  return state.receipts
    .slice()
    .reverse()
    .map((r) => (
      <tr key={r.id}>
        <td data-label="Дата">
          {date(r.at)}
          <span className="cell-secondary">Europe/Berlin</span>
        </td>
        <td data-label="Товар">
          <strong>
            {state.products.find((p) => p.id === r.productId)!.name}
          </strong>
        </td>
        <td data-label="Документ">{r.reference}</td>
        <td className="number free-value" data-label="Приход">
          +<Weight value={r.amount} />
        </td>
      </tr>
    ));
}
export function JournalRows({
  state,
  all,
}: {
  state: WarehouseState;
  all: boolean;
}) {
  return (all ? state.events : state.events.slice(0, 6)).map((event) => {
    const delta = (key: keyof Totals) =>
      event.before && event.after ? (
        <>
          <span className="old-value">{qty(event.before[key])}</span>
          <span className="delta-arrow" aria-hidden="true">
            →
          </span>
          <strong>{qty(event.after[key])}</strong>
          <span className="sr-only"> кг</span>
        </>
      ) : (
        "—"
      );
    return (
      <tr key={event.id}>
        <td className="event-description">
          <strong>{event.title}</strong>
          <span className="cell-secondary">{event.detail}</span>
        </td>
        <td data-label="На складе, кг" className="number">
          {delta("current")}
        </td>
        <td data-label="Резерв, кг" className="number">
          {delta("reserved")}
        </td>
        <td data-label="Свободно, кг" className="number">
          {delta("free")}
        </td>
        <td className="event-meta" data-label="Кто и когда">
          {
            { root: "Root admin", manager: "Менеджер", system: "Демо" }[
              event.role
            ]
          }
          <span className="cell-secondary">{date(event.at)}</span>
        </td>
      </tr>
    );
  });
}
