import { qty, stock, totals } from "@/domain/inventory.js";
import type { Product, WarehouseState } from "@/domain/types";
import { Button } from "./ui/button";

export function Weight({ value }: { value: number }) {
  return (
    <span className="weight">
      {qty(value)} <span className="weight-unit">кг</span>
    </span>
  );
}
export function StatusBadge({
  text,
  tone = "neutral",
}: {
  text: string;
  tone?: string;
}) {
  return (
    <span className={`status status-${tone}`}>
      <span className="status-dot" aria-hidden="true" />
      {text}
    </span>
  );
}
export function EmptyRow({
  columns,
  heading,
  detail,
}: {
  columns: number;
  heading: string;
  detail: string;
}) {
  return (
    <tr>
      <td colSpan={columns} className="empty-cell">
        <strong>{heading}</strong>
        <p>{detail}</p>
      </td>
    </tr>
  );
}
export function matchesProduct(p: Product, query: string) {
  return `${p.name} ${p.sku} ${p.detail}`
    .toLocaleLowerCase("ru")
    .includes(query.trim().toLocaleLowerCase("ru"));
}
export function StockSummary({ state }: { state: WarehouseState }) {
  const t = totals(state);
  const metrics = [
    ["current", "На складе", "Весь физический остаток, включая резерв"],
    ["reserved", "В резерве", "Только под подтверждённые заказы"],
    ["free", "Свободно", "На складе минус резерв"],
  ] as const;
  return metrics.map(([key, label, note]) => (
    <article key={key} className={`summary-item summary-${key}`}>
      <div className="summary-label">
        <i aria-hidden="true" />
        {label}
      </div>
      <div className="summary-value" data-total={key}>
        {qty(t[key])}
        <small>кг</small>
      </div>
      <p>{note}</p>
    </article>
  ));
}
export function InventoryRows({
  state,
  selected,
  query,
  onSelect,
}: {
  state: WarehouseState;
  selected: string;
  query: string;
  onSelect: (id: string) => void;
}) {
  const products = state.products.filter((p) => matchesProduct(p, query));
  if (!products.length)
    return (
      <EmptyRow
        columns={5}
        heading="Товар не найден"
        detail="Измените название или артикул в строке поиска."
      />
    );
  return products.map((p) => {
    const s = stock(state, p.id);
    return (
      <tr
        key={p.id}
        data-product={p.id}
        className={p.id === selected ? "is-selected" : ""}
        onClick={() => onSelect(p.id)}
      >
        <td className="product-cell">
          <button
            className="product-select"
            aria-label={`Расчёт: ${p.name}`}
            aria-pressed={p.id === selected}
            data-select={p.id}
          >
            <span className="product-name">{p.name}</span>
            <span className="product-description">
              {p.sku} · {p.detail}
            </span>
          </button>
        </td>
        <td className="number" data-label="На складе" data-stock="current">
          {qty(s.current)}
        </td>
        <td
          className="number reserved-value"
          data-label="В резерве"
          data-stock="reserved"
        >
          {qty(s.reserved)}
        </td>
        <td
          className="number free-value"
          data-label="Свободно"
          data-stock="free"
        >
          {qty(s.free)}
        </td>
        <td className="availability-cell">
          <StatusBadge
            text={
              s.free > 0
                ? "Доступен"
                : s.current > 0
                  ? "Весь в резерве"
                  : "Нет остатка"
            }
            tone={s.free > 0 ? "good" : s.current > 0 ? "waiting" : "neutral"}
          />
        </td>
      </tr>
    );
  });
}
function Term({
  label,
  value,
  tone = "",
}: {
  label: string;
  value: number;
  tone?: string;
}) {
  return (
    <div className={`equation-term ${tone}`}>
      <span>{label}</span>
      <strong>
        <Weight value={value} />
      </strong>
    </div>
  );
}
export function StockBreakdown({
  state,
  id,
  onReceive,
}: {
  state: WarehouseState;
  id: string;
  onReceive: (id: string) => void;
}) {
  const p = state.products.find((p) => p.id === id)!,
    s = stock(state, id);
  return (
    <>
      <div className="breakdown-heading">
        <div>
          <span className="section-kicker">Расчёт выбранного товара</span>
          <h3>{p.name}</h3>
        </div>
        <Button
          variant="subtle"
          data-receive-product={p.id}
          onClick={() => onReceive(p.id)}
        >
          Приход по товару <span aria-hidden="true">+</span>
        </Button>
      </div>
      <div className="equations">
        <div className="equation">
          <Term label="Начальный остаток" value={s.opening} />
          <span className="operator">+</span>
          <Term label="Все приходы" value={s.incoming} />
          <span className="operator">−</span>
          <Term label="Отгружено" value={s.shipped} />
          <span className="operator">=</span>
          <Term label="На складе" value={s.current} tone="equation-result" />
        </div>
        <div className="equation equation-available">
          <Term label="На складе" value={s.current} />
          <span className="operator">−</span>
          <Term label="В резерве" value={s.reserved} tone="reserved-value" />
          <span className="operator">=</span>
          <Term
            label="Свободно"
            value={s.free}
            tone="free-value equation-result"
          />
          <p className="equation-note">
            Резерв входит в остаток.
            <br />
            Товар списывается при отгрузке.
          </p>
        </div>
      </div>
    </>
  );
}
