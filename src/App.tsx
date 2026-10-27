import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { qty } from "@/domain/inventory.js";
import type {
  Action,
  DialogMode,
  HistoryTab,
  OrderFilter,
  Role,
} from "@/domain/types";
import { useWarehouse } from "@/hooks/useWarehouse";
import {
  StockSummary,
  InventoryRows,
  StockBreakdown,
  matchesProduct,
} from "@/components/Stock";
import { OrderRows, orderMatches } from "@/components/Orders";
import { ReceiptRows, JournalRows } from "@/components/OperationHistory";
import { WarehouseDialog } from "@/components/WarehouseDialog";
import { Button } from "@/components/ui/button";

export default function App() {
  const [role, setRole] = useState<Role>("manager");
  const [selected, setSelected] = useState("hake");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<OrderFilter>("active");
  const [history, setHistory] = useState<HistoryTab>("journal");
  const [nav, setNav] = useState("stock");
  const [allEvents, setAllEvents] = useState(false);
  const [mode, setMode] = useState<DialogMode | null>(null);
  const [toast, setToast] = useState({ text: "", error: false });
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const trigger = useRef<HTMLElement | null>(null);
  const { state, warning, commit, reset } = useWarehouse(() => {
    closeDialog();
    notify("Данные обновлены из другой вкладки");
  });
  const products = state.products.filter((p) => matchesProduct(p, search));
  const selectedId = products.some((p) => p.id === selected)
    ? selected
    : products[0]?.id || selected;
  useEffect(() => () => clearTimeout(timer.current), []);
  function notify(text: string, error = false) {
    clearTimeout(timer.current);
    setToast({ text, error });
    timer.current = setTimeout(
      () => setToast({ text: "", error: false }),
      5500,
    );
  }
  function restoreFocus(el: HTMLElement | null) {
    requestAnimationFrame(() => {
      if (
        el?.isConnected &&
        !(el instanceof HTMLButtonElement && el.disabled)
      ) {
        el.focus({ preventScroll: true });
        return;
      }
      const id = el?.dataset.order;
      if (id) {
        const row = document.querySelector<HTMLElement>(
          `[data-order-card="${CSS.escape(id)}"]`,
        );
        (
          row?.querySelector<HTMLElement>("button:not(:disabled)") ||
          row ||
          document.getElementById("orders-title")
        )?.focus({ preventScroll: true });
      }
    });
  }
  function openDialog(next: DialogMode) {
    trigger.current = document.activeElement as HTMLElement;
    setMode(next);
  }
  function closeDialog() {
    setMode(null);
    restoreFocus(trigger.current);
  }
  function apply(action: Action) {
    const next = commit(action, role);
    setSelected(
      "productId" in action
        ? action.productId
        : next.orders.find((o) => o.id === action.id)?.productId || selectedId,
    );
    notify(next.events[0].title);
  }
  function onAction(action: Action) {
    if (
      action.type === "AUTHORIZE" ||
      action.type === "SHIP" ||
      action.type === "CANCEL"
    ) {
      openDialog({
        kind: "confirm",
        action: { type: action.type, id: action.id },
      });
      return;
    }
    const previous = document.activeElement as HTMLElement;
    try {
      apply(action);
      restoreFocus(previous);
    } catch (e) {
      notify(e instanceof Error ? e.message : String(e), true);
    }
  }
  function resetDemo() {
    reset();
    setFilter("active");
    setSelected("hake");
    setAllEvents(false);
    setSearch("");
    notify("Стартовый пример восстановлен");
  }
  function changeRole(next: Role) {
    setRole(next);
    notify(
      next === "root"
        ? "Тестовая роль: Root admin. Можно разрешать отгрузку."
        : "Тестовая роль: Менеджер",
    );
  }
  function onTabKey(e: KeyboardEvent<HTMLButtonElement>) {
    if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(e.key)) return;
    e.preventDefault();
    const next =
      e.key === "Home"
        ? "journal"
        : e.key === "End"
          ? "receipts"
          : history === "journal"
            ? "receipts"
            : "journal";
    setHistory(next);
    document.getElementById(`${next}-tab`)?.focus();
  }
  return (
    <>
      <a href="#main" className="skip-link">
        Перейти к складу
      </a>
      <header className="app-header">
        <div className="header-inner">
          <a className="brand" href="#stock">
            <span className="brand-monogram" aria-hidden="true">
              RB
            </span>
            <span>
              ROYAL BALTIC<small>Операционный склад</small>
            </span>
          </a>
          <span className="private-label">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <rect x="5" y="10" width="14" height="10" rx="2" />
              <path d="M8 10V7a4 4 0 0 1 8 0v3" />
            </svg>
            Приватный прототип
          </span>
          <div className="role-control">
            <span id="role-label">Тестовая роль</span>
            <div className="segments" role="group" aria-labelledby="role-label">
              <button
                data-role="manager"
                className={role === "manager" ? "active" : ""}
                aria-pressed={role === "manager"}
                onClick={() => changeRole("manager")}
              >
                Менеджер
              </button>
              <button
                data-role="root"
                className={role === "root" ? "active" : ""}
                aria-pressed={role === "root"}
                onClick={() => changeRole("root")}
              >
                Root admin
              </button>
            </div>
          </div>
        </div>
      </header>
      <nav className="section-nav" aria-label="Разделы склада">
        <div className="nav-inner">
          <a
            href="#stock"
            className={nav === "stock" ? "active" : ""}
            aria-current={nav === "stock" ? "location" : undefined}
            onClick={() => setNav("stock")}
          >
            Остатки
          </a>
          <a
            href="#orders"
            className={nav === "orders" ? "active" : ""}
            aria-current={nav === "orders" ? "location" : undefined}
            onClick={() => setNav("orders")}
          >
            Заказы{" "}
            <span id="order-count" className="count">
              {
                state.orders.filter(
                  (o) => !["cancelled", "completed"].includes(o.status),
                ).length
              }
            </span>
          </a>
          <a
            href="#activity"
            className={nav === "activity" ? "active" : ""}
            aria-current={nav === "activity" ? "location" : undefined}
            onClick={() => setNav("activity")}
          >
            Приходы и журнал
          </a>
          <span className="demo-label">
            <i aria-hidden="true"></i>Тестовые данные
          </span>
        </div>
      </nav>
      <main id="main" tabIndex={-1}>
        <section id="stock" aria-labelledby="stock-title">
          <div className="page-heading">
            <div>
              <div className="breadcrumb">
                Royal Baltic <span>/</span> Склад
              </div>
              <h1 id="stock-title">Остатки и движение товара</h1>
              <p>Точный остаток. Отдельный резерв. Контролируемая отгрузка.</p>
            </div>
            <Button
              variant="primary"
              id="receive-open"
              onClick={() => openDialog({ kind: "receive" })}
            >
              <span aria-hidden="true">+</span> Внести приход
            </Button>
          </div>
          <div
            className="warning-banner"
            id="warning"
            role="alert"
            hidden={!warning}
          >
            {warning}
          </div>
          <div
            id="metrics"
            className="stock-summary"
            aria-label="Сводка склада"
          >
            <StockSummary state={state} />
          </div>
          <div className="panel inventory-panel">
            <div className="panel-heading">
              <div>
                <h2>
                  Товарные остатки <span className="count">3</span>
                </h2>
                <p>Вес в килограммах · резерв включён в остаток</p>
              </div>
              <div className="search-field">
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <circle cx="10.5" cy="10.5" r="6.5" />
                  <path d="m16 16 4 4" />
                </svg>
                <label className="sr-only" htmlFor="inventory-search">
                  Найти товар или артикул
                </label>
                <input
                  id="inventory-search"
                  value={search}
                  onChange={(e) => {
                    const q = e.target.value;
                    setSearch(q);
                    const p = state.products.filter((p) =>
                      matchesProduct(p, q),
                    );
                    if (p.length && !p.some((p) => p.id === selected))
                      setSelected(p[0].id);
                  }}
                  type="search"
                  placeholder="Найти товар или артикул"
                  autoComplete="off"
                />
              </div>
            </div>
            <div className="table-scroll">
              <table className="inventory-table">
                <caption className="sr-only">
                  Остатки товаров в килограммах
                </caption>
                <thead>
                  <tr>
                    <th scope="col">Товар / артикул</th>
                    <th scope="col" className="number">
                      На складе
                    </th>
                    <th scope="col" className="number">
                      В резерве
                    </th>
                    <th scope="col" className="number">
                      Свободно
                    </th>
                    <th scope="col">Доступность</th>
                  </tr>
                </thead>
                <tbody id="inventory">
                  <InventoryRows
                    state={state}
                    selected={selectedId}
                    query={search}
                    onSelect={setSelected}
                  />
                </tbody>
              </table>
            </div>
            <p className="sr-only" id="search-result" role="status">
              Найдено товаров: {products.length}
            </p>
            <div
              className="stock-breakdown"
              id="formula"
              hidden={!products.length}
            >
              {products.length > 0 && (
                <StockBreakdown
                  state={state}
                  id={selectedId}
                  onReceive={(id) => {
                    setSelected(id);
                    openDialog({ kind: "receive" });
                  }}
                />
              )}
            </div>
          </div>
        </section>
        <section id="orders" aria-labelledby="orders-title">
          <div className="section-heading">
            <div>
              <h2 id="orders-title" tabIndex={-1}>
                Заказы и разрешение на отгрузку
              </h2>
              <p>
                Оплата не разрешает отгрузку. Окончательное решение — за root
                admin.
              </p>
            </div>
            <Button
              variant="secondary"
              id="order-open"
              onClick={() => openDialog({ kind: "order" })}
            >
              <span aria-hidden="true">+</span> Новый заказ
            </Button>
          </div>
          <div className="panel">
            <div className="orders-toolbar">
              <div
                className="order-filters"
                role="group"
                aria-label="Фильтр заказов"
              >
                <button
                  data-filter="active"
                  className={filter === "active" ? "active" : ""}
                  aria-pressed={filter === "active"}
                  onClick={() => setFilter("active")}
                >
                  Активные
                </button>
                <button
                  data-filter="waiting"
                  className={filter === "waiting" ? "active" : ""}
                  aria-pressed={filter === "waiting"}
                  onClick={() => setFilter("waiting")}
                >
                  Ждут разрешения{" "}
                  <span id="waiting-count" className="count">
                    {
                      state.orders.filter((o) => orderMatches(o, "waiting"))
                        .length
                    }
                  </span>
                </button>
                <button
                  data-filter="ready"
                  className={filter === "ready" ? "active" : ""}
                  aria-pressed={filter === "ready"}
                  onClick={() => setFilter("ready")}
                >
                  Можно отгружать{" "}
                  <span id="ready-count" className="count">
                    {
                      state.orders.filter((o) => orderMatches(o, "ready"))
                        .length
                    }
                  </span>
                </button>
                <button
                  data-filter="all"
                  className={filter === "all" ? "active" : ""}
                  aria-pressed={filter === "all"}
                  onClick={() => setFilter("all")}
                >
                  Все
                </button>
              </div>
              <span id="role-hint" className="role-hint">
                {role === "root"
                  ? "Роль: можно выдавать разрешение"
                  : "Разрешение выдаёт только root admin"}
              </span>
            </div>
            <div className="table-scroll orders-scroll">
              <table className="orders-table">
                <caption className="sr-only">
                  Независимые состояния заказа, оплаты и разрешения на отгрузку
                </caption>
                <thead>
                  <tr>
                    <th scope="col">Заказ / клиент</th>
                    <th scope="col" className="number">
                      Количество
                    </th>
                    <th scope="col">Заказ</th>
                    <th scope="col">Оплата</th>
                    <th scope="col">Отгрузка</th>
                    <th scope="col">Действия</th>
                  </tr>
                </thead>
                <tbody id="orders-list">
                  <OrderRows
                    state={state}
                    filter={filter}
                    role={role}
                    onAction={onAction}
                  />
                </tbody>
              </table>
            </div>
          </div>
        </section>
        <section id="activity" aria-labelledby="history-title">
          <div className="section-heading">
            <div>
              <h2 id="history-title">Приходы и журнал операций</h2>
              <p>Документы поступления и изменение каждого остатка.</p>
            </div>
            <span className="timezone">Время: Берлин</span>
          </div>
          <div className="panel">
            <div className="history-toolbar">
              <div
                className="history-tabs"
                role="tablist"
                aria-label="История склада"
              >
                <button
                  role="tab"
                  id="journal-tab"
                  data-history="journal"
                  aria-controls="journal-panel"
                  aria-selected={history === "journal"}
                  tabIndex={history === "journal" ? 0 : -1}
                  onClick={() => setHistory("journal")}
                  onKeyDown={onTabKey}
                >
                  Журнал операций
                </button>
                <button
                  role="tab"
                  id="receipts-tab"
                  data-history="receipts"
                  aria-controls="receipts-panel"
                  aria-selected={history === "receipts"}
                  tabIndex={history === "receipts" ? 0 : -1}
                  onClick={() => setHistory("receipts")}
                  onKeyDown={onTabKey}
                >
                  Приходы{" "}
                  <span id="receipt-count" className="count">
                    {state.receipts.length}
                  </span>
                </button>
              </div>
              <span id="receipt-total" className="receipt-total">
                Всего принято:{" "}
                {qty(state.receipts.reduce((a, r) => a + r.amount, 0))} кг
              </span>
            </div>
            <div
              id="journal-panel"
              role="tabpanel"
              aria-labelledby="journal-tab"
              hidden={history !== "journal"}
            >
              <div className="table-scroll">
                <table className="journal-table">
                  <caption className="sr-only">
                    Изменения остатков: до и после операции, кг
                  </caption>
                  <thead>
                    <tr>
                      <th scope="col">Операция</th>
                      <th scope="col" className="number">
                        На складе, кг
                      </th>
                      <th scope="col" className="number">
                        Резерв, кг
                      </th>
                      <th scope="col" className="number">
                        Свободно, кг
                      </th>
                      <th scope="col">Кто / когда</th>
                    </tr>
                  </thead>
                  <tbody id="events">
                    <JournalRows state={state} all={allEvents} />
                  </tbody>
                </table>
              </div>
              <Button
                variant="subtle"
                className="show-more"
                id="events-more"
                hidden={state.events.length <= 6}
                onClick={() => setAllEvents(!allEvents)}
              >
                {allEvents
                  ? "Свернуть журнал"
                  : `Показать все операции (${state.events.length})`}
              </Button>
            </div>
            <div
              id="receipts-panel"
              role="tabpanel"
              aria-labelledby="receipts-tab"
              hidden={history !== "receipts"}
            >
              <div className="table-scroll">
                <table className="receipts-table">
                  <caption className="sr-only">
                    Поступившие товары и документы
                  </caption>
                  <thead>
                    <tr>
                      <th scope="col">Дата поступления</th>
                      <th scope="col">Товар</th>
                      <th scope="col">Документ</th>
                      <th scope="col" className="number">
                        Количество
                      </th>
                    </tr>
                  </thead>
                  <tbody id="receipts">
                    <ReceiptRows state={state} />
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </section>
        <footer>
          <p>
            <strong>Учебный склад Royal Baltic</strong>
            <span>
              Данные сохраняются в этом браузере. Переключение ролей —
              симуляция.
            </span>
          </p>
          <button
            id="reset-open"
            onClick={() => openDialog({ kind: "reset" })}
            className="button button-text"
          >
            Сбросить тестовые данные
          </button>
        </footer>
      </main>

      {mode && (
        <WarehouseDialog
          mode={mode}
          state={state}
          role={role}
          selected={selectedId}
          onClose={closeDialog}
          onCommit={apply}
          onReset={resetDemo}
        />
      )}
      <div
        id="toast"
        role="status"
        aria-live="polite"
        className={toast.error ? "error" : ""}
        hidden={!toast.text}
      >
        {toast.text}
      </div>
    </>
  );
}
