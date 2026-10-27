import {qty, stock, totals} from './inventory.js';

export const escapeHtml = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const e = escapeHtml;
export const weight = value => `<span class="weight">${qty(value)} <span class="weight-unit">кг</span></span>`;
const date = value => value ? new Date(value).toLocaleString('ru-RU', {timeZone:'Europe/Berlin', day:'2-digit', month:'2-digit', hour:'2-digit', minute:'2-digit'}) : 'Стартовый пример';
const badge = (text, tone='neutral') => `<span class="status status-${tone}"><span class="status-dot" aria-hidden="true"></span>${e(text)}</span>`;
const emptyRow = (columns, heading, detail) => `<tr><td colspan="${columns}" class="empty-cell"><strong>${e(heading)}</strong><p>${e(detail)}</p></td></tr>`;
export function matchesProduct(p, query) {return `${p.name} ${p.sku} ${p.detail}`.toLocaleLowerCase('ru').includes(query.trim().toLocaleLowerCase('ru'));}

export function StockSummary(state) {
 const t = totals(state);
 return [['current','На складе','Весь физический остаток, включая резерв'],['reserved','В резерве','Только под подтверждённые заказы'],['free','Свободно','На складе минус резерв']].map(([key,label,note]) => `<article class="summary-item summary-${key}"><div class="summary-label"><i aria-hidden="true"></i>${label}</div><div class="summary-value" data-total="${key}">${qty(t[key])}<small>кг</small></div><p>${note}</p></article>`).join('');
}
export function InventoryRows(state, selected, query='') {
 const products = state.products.filter(p=>matchesProduct(p,query));
 if(!products.length) return emptyRow(5,'Товар не найден','Измените название или артикул в строке поиска.');
 return products.map(p=>{const s=stock(state,p.id);return `<tr data-product="${p.id}" class="${p.id===selected?'is-selected':''}"><td class="product-cell"><button class="product-select" aria-label="Расчёт: ${e(p.name)}" aria-pressed="${p.id===selected}" data-select="${p.id}"><span class="product-name">${e(p.name)}</span><span class="product-description">${e(p.sku)} · ${e(p.detail)}</span></button></td><td class="number" data-label="На складе" data-stock="current">${qty(s.current)}</td><td class="number reserved-value" data-label="В резерве" data-stock="reserved">${qty(s.reserved)}</td><td class="number free-value" data-label="Свободно" data-stock="free">${qty(s.free)}</td><td class="availability-cell">${badge(s.free>0?'Доступен':s.current>0?'Весь в резерве':'Нет остатка',s.free>0?'good':s.current>0?'waiting':'neutral')}</td></tr>`;}).join('');
}
export function StockBreakdown(state, id) {
 const p=state.products.find(p=>p.id===id),s=stock(state,id);
 const term=(label,value,tone='')=>`<div class="equation-term ${tone}"><span>${label}</span><strong>${weight(value)}</strong></div>`;
 return `<div class="breakdown-heading"><div><span class="section-kicker">Расчёт выбранного товара</span><h3>${e(p.name)}</h3></div><button class="button button-subtle" data-receive-product="${p.id}">Приход по товару <span aria-hidden="true">+</span></button></div><div class="equations"><div class="equation">${term('Начальный остаток',s.opening)}<span class="operator">+</span>${term('Все приходы',s.incoming)}<span class="operator">−</span>${term('Отгружено',s.shipped)}<span class="operator">=</span>${term('На складе',s.current,'equation-result')}</div><div class="equation equation-available">${term('На складе',s.current)}<span class="operator">−</span>${term('В резерве',s.reserved,'reserved-value')}<span class="operator">=</span>${term('Свободно',s.free,'free-value equation-result')}<p class="equation-note">Резерв входит в остаток.<br>Товар списывается при отгрузке.</p></div></div>`;
}
export function orderMatches(order, filter) {
 if(filter==='active') return !['completed','cancelled'].includes(order.status);
 if(filter==='waiting') return order.status==='approved'&&!order.authorizedAt;
 if(filter==='ready') return order.status==='approved'&&!!order.authorizedAt;
 return true;
}
export function OrderRows(state, filter, role) {
 const orders=state.orders.filter(o=>orderMatches(o,filter)).slice().reverse();
 if(!orders.length) return emptyRow(6,filter==='waiting'?'Нет заказов, ожидающих разрешения':filter==='ready'?'Нет заказов с разрешённой отгрузкой':'Заказы не найдены',filter==='all'?'Создайте заказ, чтобы начать работу.':'Выберите другой фильтр или создайте новый заказ.');
 return orders.map(o=>{
  const p=state.products.find(p=>p.id===o.productId),s=stock(state,o.productId),stage={draft:'Черновик',approved:'Подтверждён',shipped:'Отгружен',completed:'Доставлен',cancelled:'Отменён'}[o.status];
  let release,detail,actions='';
  const action=(type,label,kind='secondary',disabled=false)=>`<button type="button" class="button button-${kind}" data-action="${type}" data-order="${o.id}" ${disabled?`disabled aria-describedby="gate-${o.id}"`:''}>${label}</button>`;
  if(o.status==='draft'){release=badge('Нет разрешения');detail='Сначала подтвердите заказ';actions=action('APPROVE','Подтвердить','primary');}
  if(o.status==='approved'&&!o.authorizedAt){release=badge('Ждёт root admin','waiting');detail='Товар в резерве, списания нет';actions=action('AUTHORIZE','Разрешить отгрузку',role==='root'?'primary':'secondary',role!=='root');}
  if(o.status==='approved'&&o.authorizedAt){release=badge('Разрешена','good');detail='Разрешение root admin';actions=action('SHIP','Отгрузить','primary');}
  if(['shipped','completed'].includes(o.status)){release=badge('Разрешение получено','good');detail=`Root admin · ${date(o.authorizedAt)}`;if(o.status==='shipped')actions=action('DELIVER','Отметить доставку');}
  if(o.status==='cancelled'){release=badge('Не действует');detail='Заказ закрыт';}
  if(!o.paid&&['approved','shipped','completed'].includes(o.status))actions+=action('PAYMENT','Отметить оплату','subtle');
  if(['draft','approved'].includes(o.status))actions+=action('CANCEL','Отменить','text');
  const shortage=o.status==='draft'&&o.amount>s.free?`<p class="row-warning">Не хватает ${qty(o.amount-s.free)} кг для резерва</p>`:'';
  const reserve=o.status==='approved'?o.amount:0;
  return `<tr class="order-row" data-order-card="${o.id}" tabindex="-1" aria-label="Заказ ${o.id}"><td class="order-identity"><span class="order-id">${o.id}</span><strong>${e(o.client)}</strong><span class="cell-secondary">${e(p.name)}</span>${shortage}</td><td class="number" data-label="Количество"><strong>${weight(o.amount)}</strong><span class="cell-secondary">Резерв: ${qty(reserve)} кг</span></td><td data-label="Заказ">${badge(stage,o.status==='approved'?'info':o.status==='shipped'||o.status==='completed'?'good':'neutral')}</td><td data-label="Оплата">${badge(o.paid?'Оплачен':'Не оплачен',o.paid?'good':'neutral')}<span class="cell-secondary">${o.paid?'Не заменяет разрешение':'Отдельная проверка'}</span></td><td data-label="Отгрузка">${release}<span class="cell-secondary" id="gate-${o.id}">${detail}</span></td><td class="order-actions-cell" data-label="Действия"><div class="order-actions">${actions||'<span class="cell-secondary">Заказ закрыт</span>'}</div></td></tr>`;
 }).join('');
}
export function ReceiptRows(state) {
 if(!state.receipts.length) return emptyRow(4,'Приходов пока нет','Внесите первую поставку. Она прибавится к остатку выбранного товара, а существующие резервы сохранятся.');
 return state.receipts.slice().reverse().map(r=>`<tr><td data-label="Дата">${date(r.at)}<span class="cell-secondary">Europe/Berlin</span></td><td data-label="Товар"><strong>${e(state.products.find(p=>p.id===r.productId).name)}</strong></td><td data-label="Документ">${e(r.reference)}</td><td class="number free-value" data-label="Приход">+${weight(r.amount)}</td></tr>`).join('');
}
export function JournalRows(state, all=false) {
 return (all?state.events:state.events.slice(0,6)).map(event=>{
 const delta=key=>event.before?`<span class="old-value">${qty(event.before[key])}</span><span class="delta-arrow" aria-hidden="true">→</span><strong>${qty(event.after[key])}</strong><span class="sr-only"> кг</span>`:'—';
 return `<tr><td class="event-description"><strong>${e(event.title)}</strong><span class="cell-secondary">${e(event.detail)}</span></td><td data-label="На складе, кг" class="number">${delta('current')}</td><td data-label="Резерв, кг" class="number">${delta('reserved')}</td><td data-label="Свободно, кг" class="number">${delta('free')}</td><td class="event-meta" data-label="Кто и когда">${{root:'Root admin',manager:'Менеджер',system:'Демо'}[event.role]||''}<span class="cell-secondary">${date(event.at)}</span></td></tr>`;
 }).join('');
}
