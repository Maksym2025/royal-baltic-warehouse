import type {
  Action,
  Order,
  OrderActionType,
  OrderFilter,
  Role,
  WarehouseState,
} from "@/domain/types";
import { qty, stock } from "@/domain/inventory.js";
import { EmptyRow, StatusBadge, Weight } from "./Stock";
import { Button } from "./ui/button";
import { date } from "./OperationHistory";

export function orderMatches(order: Order, filter: OrderFilter) {
  if (filter === "active")
    return !["completed", "cancelled"].includes(order.status);
  if (filter === "waiting")
    return order.status === "approved" && !order.authorizedAt;
  if (filter === "ready")
    return order.status === "approved" && !!order.authorizedAt;
  return true;
}
export function OrderRows({
  state,
  filter,
  role,
  onAction,
}: {
  state: WarehouseState;
  filter: OrderFilter;
  role: Role;
  onAction: (action: Action) => void;
}) {
  const orders = state.orders
    .filter((o) => orderMatches(o, filter))
    .slice()
    .reverse();
  if (!orders.length)
    return (
      <EmptyRow
        columns={6}
        heading={
          filter === "waiting"
            ? "Нет заказов, ожидающих разрешения"
            : filter === "ready"
              ? "Нет заказов с разрешённой отгрузкой"
              : "Заказы не найдены"
        }
        detail={
          filter === "all"
            ? "Создайте заказ, чтобы начать работу."
            : "Выберите другой фильтр или создайте новый заказ."
        }
      />
    );
  return orders.map((o) => {
    const p = state.products.find((p) => p.id === o.productId)!,
      s = stock(state, o.productId);
    const stage = {
      draft: "Черновик",
      approved: "Подтверждён",
      shipped: "Отгружен",
      completed: "Доставлен",
      cancelled: "Отменён",
    }[o.status];
    const active = o.status === "approved";
    const dispatched = o.status === "shipped" || o.status === "completed";
    const release =
      o.status === "draft"
        ? "Нет разрешения"
        : active
          ? o.authorizedAt
            ? "Разрешена"
            : "Ждёт root admin"
          : dispatched
            ? "Разрешение получено"
            : "Не действует";
    const detail =
      o.status === "draft"
        ? "Сначала подтвердите заказ"
        : active
          ? o.authorizedAt
            ? "Разрешение root admin"
            : "Товар в резерве, списания нет"
          : dispatched
            ? `Root admin · ${date(o.authorizedAt)}`
            : "Заказ закрыт";
    const action = (
      type: OrderActionType,
      label: string,
      variant: "primary" | "secondary" | "subtle" | "text" = "secondary",
      disabled = false,
    ) => (
      <Button
        key={type}
        type="button"
        variant={variant}
        data-action={type}
        data-order={o.id}
        disabled={disabled}
        aria-describedby={disabled ? `gate-${o.id}` : undefined}
        onClick={() => onAction({ type, id: o.id })}
      >
        {label}
      </Button>
    );
    const actions = [];
    if (o.status === "draft")
      actions.push(action("APPROVE", "Подтвердить", "primary"));
    if (active && !o.authorizedAt)
      actions.push(
        action(
          "AUTHORIZE",
          "Разрешить отгрузку",
          role === "root" ? "primary" : "secondary",
          role !== "root",
        ),
      );
    if (active && o.authorizedAt)
      actions.push(action("SHIP", "Отгрузить", "primary"));
    if (o.status === "shipped")
      actions.push(action("DELIVER", "Отметить доставку"));
    if (!o.paid && (active || dispatched))
      actions.push(action("PAYMENT", "Отметить оплату", "subtle"));
    if (o.status === "draft" || active)
      actions.push(action("CANCEL", "Отменить", "text"));
    return (
      <tr
        key={o.id}
        className="order-row"
        data-order-card={o.id}
        tabIndex={-1}
        aria-label={`Заказ ${o.id}`}
      >
        <td className="order-identity">
          <span className="order-id">{o.id}</span>
          <strong>{o.client}</strong>
          <span className="cell-secondary">{p.name}</span>
          {o.status === "draft" && o.amount > s.free && (
            <p className="row-warning">
              Не хватает {qty(o.amount - s.free)} кг для резерва
            </p>
          )}
        </td>
        <td className="number" data-label="Количество">
          <strong>
            <Weight value={o.amount} />
          </strong>
          <span className="cell-secondary">
            Резерв: {qty(active ? o.amount : 0)} кг
          </span>
        </td>
        <td data-label="Заказ">
          <StatusBadge
            text={stage}
            tone={active ? "info" : dispatched ? "good" : "neutral"}
          />
        </td>
        <td data-label="Оплата">
          <StatusBadge
            text={o.paid ? "Оплачен" : "Не оплачен"}
            tone={o.paid ? "good" : "neutral"}
          />
          <span className="cell-secondary">
            {o.paid ? "Не заменяет разрешение" : "Отдельная проверка"}
          </span>
        </td>
        <td data-label="Отгрузка">
          <StatusBadge
            text={release}
            tone={
              active
                ? o.authorizedAt
                  ? "good"
                  : "waiting"
                : dispatched
                  ? "good"
                  : "neutral"
            }
          />
          <span className="cell-secondary" id={`gate-${o.id}`}>
            {detail}
          </span>
        </td>
        <td className="order-actions-cell" data-label="Действия">
          <div className="order-actions">
            {actions.length ? (
              actions
            ) : (
              <span className="cell-secondary">Заказ закрыт</span>
            )}
          </div>
        </td>
      </tr>
    );
  });
}
