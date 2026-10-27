import {seed,stock,totals,transition,validate,qty,grams} from './inventory.js';
import {StockSummary, InventoryRows, StockBreakdown, OrderRows, ReceiptRows, JournalRows, matchesProduct, orderMatches} from './components.js';
const $=s=>document.querySelector(s),KEY='royal-baltic-warehouse-v1',esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let state=seed(),role='manager',selected='hake',filter='active',allEvents=false,mode='',pending=null,blocked=false,timer,search='',history='journal',dialogTrigger=null;
try{const raw=localStorage.getItem(KEY);if(raw){const s=JSON.parse(raw);validate(s);state=s;}}catch{blocked=true;$('#warning').hidden=false;$('#warning').textContent='Сохранённые данные недоступны. Открыт демонстрационный пример. Нажмите «Сбросить тестовые данные», чтобы сбросить локальные данные.';}
function restoreFocus(previous) {
 if (!previous || document.activeElement !== document.body) return;
 if (previous.id) { document.getElementById(previous.id)?.focus({preventScroll:true}); return; }
 if (previous.dataset.select) { document.querySelector(`[data-select="${previous.dataset.select}"]`)?.focus({preventScroll:true}); return; }
 if (previous.dataset.order) {
  const row = document.querySelector(`[data-order-card="${previous.dataset.order}"]`);
  const same = row?.querySelector(`[data-action="${previous.dataset.action}"]`);
  (same || row?.querySelector('button:not(:disabled)') || row || $('#orders-title')).focus({preventScroll:true});
 }
}
function renderInventory() {
 const products=state.products.filter(p=>matchesProduct(p,search));
 if(products.length&&!products.some(p=>p.id===selected))selected=products[0].id;
 $('#inventory').innerHTML=InventoryRows(state,selected,search);
 $('#search-result').textContent=`Найдено товаров: ${products.length}`;
 $('#formula').hidden=!products.length;
 if(products.length)$('#formula').innerHTML=StockBreakdown(state,selected);
}
function renderOrders() {
 $('#orders-list').innerHTML=OrderRows(state,filter,role);
 $('#waiting-count').textContent=state.orders.filter(o=>orderMatches(o,'waiting')).length;
 $('#ready-count').textContent=state.orders.filter(o=>orderMatches(o,'ready')).length;
}
function renderEvents() {
 $('#events').innerHTML=JournalRows(state,allEvents);
 $('#receipts').innerHTML=ReceiptRows(state);
 $('#receipt-count').textContent=state.receipts.length;
 $('#receipt-total').textContent=`Всего принято: ${qty(state.receipts.reduce((a,r)=>a+r.amount,0))} кг`;
 $('#events-more').hidden=state.events.length<=6;
 $('#events-more').textContent=allEvents?'Свернуть журнал':`Показать все операции (${state.events.length})`;
}
function render() {
 const previous=document.activeElement;
 $('#metrics').innerHTML=StockSummary(state);
 renderInventory();renderOrders();renderEvents();
 $('#order-count').textContent=state.orders.filter(o=>!['cancelled','completed'].includes(o.status)).length;
 $('#role-hint').textContent=role==='root'?'Роль: можно выдавать разрешение':'Разрешение выдаёт только root admin';
 document.querySelectorAll('[data-role]').forEach(b=>{b.classList.toggle('active',b.dataset.role===role);b.setAttribute('aria-pressed',String(b.dataset.role===role));});
 document.querySelectorAll('[data-filter]').forEach(b=>{b.classList.toggle('active',b.dataset.filter===filter);b.setAttribute('aria-pressed',String(b.dataset.filter===filter));});
 restoreFocus(previous);
}
function notify(text,error=false){clearTimeout(timer);$('#toast').textContent=text;$('#toast').classList.toggle('error',error);$('#toast').hidden=false;timer=setTimeout(()=>$('#toast').hidden=true,5500);}
function commit(a){if(blocked)throw new Error('Сначала сбросьте локальные данные через «Сбросить тестовые данные».');const raw=localStorage.getItem(KEY);if(raw){const latest=JSON.parse(raw);validate(latest);if(latest.revision!==state.revision){state=latest;render();throw new Error('Данные изменились в другой вкладке. Проверьте остатки и повторите действие.');}}const next=transition(state,a,role);try{localStorage.setItem(KEY,JSON.stringify(next));}catch{throw new Error('Не удалось сохранить операцию. Изменения не применены.');}state=next;selected=a.productId||state.orders.find(o=>o.id===a.id)?.productId||selected;render();notify(state.events[0].title);}
function openForm(kind){dialogTrigger=document.activeElement;mode=kind;pending=null;$('#form-error').hidden=true;$('#form').reset();$('#dialog-eyebrow').textContent=kind==='receive'?'ПОПОЛНЕНИЕ ЗАПАСОВ':kind==='order'?'НОВЫЙ ТЕСТОВЫЙ ЗАКАЗ':'СБРОС ПРИМЕРА';$('#dialog-title').textContent={receive:'Внести приход',order:'Создать заказ',reset:'Начать заново?'}[kind];$('#description').textContent={receive:'Новый приход прибавится к текущему остатку. Существующие резервы сохранятся.',order:'Заказ появится как черновик. Резерв возникнет только после отдельного подтверждения.',reset:'Все ваши операции в этом браузере будут удалены. Вернутся три тестовых товара и два стартовых заказа.'}[kind];$('#dialog-submit').textContent={receive:'Добавить на склад',order:'Создать черновик',reset:'Сбросить пример'}[kind];
 if(kind==='reset')$('#fields').innerHTML='<div class="confirm-summary">Начальные остатки: <b>450 кг</b><br>Резерв: <b>40 кг</b> · Свободно: <b>410 кг</b></div>';
 else{$('#fields').innerHTML=`${kind==='order'?'<div class="field"><label for="client">Клиент</label><input id="client" placeholder="Например, Restaurant Démo" maxlength="80" required autocomplete="off"></div>':''}<div class="field"><label for="product">Товар</label><select id="product">${state.products.map(p=>`<option value="${p.id}" ${p.id===selected?'selected':''}>${esc(p.name)}</option>`).join('')}</select></div><div class="field"><label for="quantity">Количество, кг</label><input id="quantity" inputmode="decimal" placeholder="0" required autocomplete="off" maxlength="16"><small>Можно дробное: например, 12,5 кг</small></div>${kind==='receive'?'<div class="field"><label for="reference">Номер документа · необязательно</label><input id="reference" placeholder="Например, IN-025" maxlength="80" autocomplete="off"></div>':''}<div id="live-preview" class="preview"></div>`;$('#quantity').addEventListener('input',preview);$('#product').addEventListener('change',preview);preview();}$('#dialog').showModal();}
function preview(){const v=stock(state,$('#product').value);let n=0;try{n=grams($('#quantity').value)}catch{}$('#live-preview').innerHTML=mode==='receive'?`На складе: <strong>${qty(v.current)} + ${qty(n)} = ${qty(v.current+n)} кг</strong><br>Резерв: <strong>${qty(v.reserved)} кг</strong> · Свободно после прихода: <strong>${qty(v.free+n)} кг</strong>`:`Свободно сейчас: <strong>${qty(v.free)} кг</strong><br>${n>v.free?`Для подтверждения потребуется ещё <strong>${qty(n-v.free)} кг</strong>. Черновик создать можно.`:'Создание черновика не меняет остатки и резерв.'}`;}
function confirmation(a){dialogTrigger=document.activeElement;const o=state.orders.find(o=>o.id===a.id);if(!o)return;mode='confirm';pending=a;$('#form-error').hidden=true;const v=stock(state,o.productId);$('#dialog-eyebrow').textContent=`${o.id} / ${role==='root'?'ROOT ADMIN':'МЕНЕДЖЕР'}`;$('#dialog-title').textContent={SHIP:'Подтвердить отгрузку',AUTHORIZE:'Разрешить отгрузку',CANCEL:'Отменить заказ'}[a.type];$('#description').textContent={SHIP:`${o.client} · ${qty(o.amount)} кг. Разрешение root admin получено. Отгрузка спишет товар со склада.`,AUTHORIZE:'Вы выдаёте разрешение на отгрузку. Товар остаётся на складе и в резерве до отдельного действия «Отгрузить».',CANCEL:'Заказ будет закрыт. Созданный резерв полностью вернётся в свободный остаток.'}[a.type];$('#dialog-submit').textContent={SHIP:'Отгрузить и списать',AUTHORIZE:'Выдать разрешение',CANCEL:'Отменить заказ'}[a.type];$('#fields').innerHTML=a.type==='SHIP'?`<div class="confirm-summary">На складе: <b>${qty(v.current)} → ${qty(v.current-o.amount)} кг</b><br>Резерв: <b>${qty(v.reserved)} → ${qty(v.reserved-o.amount)} кг</b><br>Свободно: <b>${qty(v.free)} кг — без изменений</b></div>`:a.type==='AUTHORIZE'?`<div class="confirm-summary">Оплата: <b>${o.paid?'отмечена':'не отмечена'}</b><br>Резерв: <b>${qty(o.amount)} кг — сохраняется</b><br>Списание: <b>только после отдельной отгрузки</b></div>`:`<div class="confirm-summary">Будет освобождено: <b>${qty(o.status==='approved'?o.amount:0)} кг</b><br>Физический остаток: <b>${qty(v.current)} кг — без изменений</b></div>`;$('#dialog').showModal();}
$('#receive-open').onclick=()=>openForm('receive');$('#order-open').onclick=()=>openForm('order');$('#reset-open').onclick=()=>openForm('reset');$('#dialog-close').onclick=$('#dialog-cancel').onclick=()=>$('#dialog').close();
$('#form').onsubmit=e=>{e.preventDefault();try{if(mode==='reset'){const fresh=seed();fresh.revision=state.revision+1;localStorage.setItem(KEY,JSON.stringify(fresh));state=fresh;blocked=false;$('#warning').hidden=true;filter='active';selected='hake';allEvents=false;search='';$('#inventory-search').value='';render();notify('Стартовый пример восстановлен');}else if(mode==='confirm')commit(pending);else commit(mode==='receive'?{type:'RECEIVE',productId:$('#product').value,quantity:$('#quantity').value,reference:$('#reference').value}:{type:'CREATE_ORDER',productId:$('#product').value,quantity:$('#quantity').value,client:$('#client').value});$('#dialog').close();}catch(error){$('#form-error').textContent=error.message;$('#form-error').hidden=false;$('#form-error').focus();}};
$('#inventory').onclick=e=>{const row=e.target.closest('[data-product]');if(row){selected=row.dataset.product;render();}};
$('#inventory-search').oninput=e=>{search=e.target.value;renderInventory();};
$('#formula').onclick=e=>{const b=e.target.closest('[data-receive-product]');if(b){selected=b.dataset.receiveProduct;openForm('receive');}};
$('#orders-list').onclick=e=>{const b=e.target.closest('[data-action]');if(!b||b.disabled)return;const a={type:b.dataset.action,id:b.dataset.order};if(['AUTHORIZE','SHIP','CANCEL'].includes(a.type))confirmation(a);else try{commit(a)}catch(error){notify(error.message,true);}};
for(const b of document.querySelectorAll('[data-role]'))b.onclick=()=>{role=b.dataset.role;render();notify(role==='root'?'Тестовая роль: Root admin. Можно разрешать отгрузку.':'Тестовая роль: Менеджер');};
for(const b of document.querySelectorAll('[data-filter]'))b.onclick=()=>{filter=b.dataset.filter;render();};
for(const a of document.querySelectorAll('.nav-inner a'))a.onclick=()=>document.querySelectorAll('.nav-inner a').forEach(x=>{x.classList.toggle('active',x===a);if(x===a)x.setAttribute('aria-current','location');else x.removeAttribute('aria-current');});
$('#events-more').onclick=()=>{allEvents=!allEvents;renderEvents();};
window.addEventListener('storage',e=>{if(e.key===KEY){try{const s=e.newValue?JSON.parse(e.newValue):seed();validate(s);state=s;render();if($('#dialog').open)$('#dialog').close();notify('Данные обновлены из другой вкладки');}catch{blocked=true;$('#warning').textContent='Данные из другой вкладки не распознаны. Перезагрузите страницу.';$('#warning').hidden=false;}}});
function showHistory(next) {
 history=next;
 document.querySelectorAll('[data-history]').forEach(b=>{const active=b.dataset.history===next;b.setAttribute('aria-selected',String(active));b.tabIndex=active?0:-1;});
 $('#journal-panel').hidden=next!=='journal';$('#receipts-panel').hidden=next!=='receipts';
}
for(const tab of document.querySelectorAll('[data-history]')) {
 tab.onclick=()=>showHistory(tab.dataset.history);
 tab.onkeydown=e=>{if(['ArrowLeft','ArrowRight','Home','End'].includes(e.key)){e.preventDefault();const next=e.key==='Home'?'journal':e.key==='End'?'receipts':history==='journal'?'receipts':'journal';showHistory(next);$(`[data-history="${next}"]`).focus();}};
}
$('#dialog').addEventListener('close',()=>{if(dialogTrigger?.isConnected)dialogTrigger.focus({preventScroll:true});else restoreFocus(dialogTrigger);});
render();
