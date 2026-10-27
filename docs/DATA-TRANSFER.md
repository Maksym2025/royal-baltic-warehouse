# Перенос введённых данных с Sites на localhost

Исходный код содержит стартовый пример. Введённые на сайте приходы, заказы и история находятся в **localStorage вашего браузера** на домене того сайта. Архив не имеет доступа к этим данным. Ключ и формат сохранены, поэтому JSON можно перенести без преобразования.

Проводите перенос в том браузере/профиле, в котором работали со складом. Закройте остальные вкладки локального склада. Не используйте сброс данных до создания резервной копии.

## 1. Сохранить данные исходного прототипа

Откройте исходный сайт или HTML, где находятся нужные операции. В DevTools (`F12`) → Console выполните этот читаемый код. Он только скачивает копию; ничего не отправляет и не удаляет:

```javascript
(() => {
  const raw = localStorage.getItem('royal-baltic-warehouse-v1');
  if (!raw) throw new Error('На этом адресе нет сохранённых операций. В архиве уже есть стартовый пример.');
  const data = JSON.parse(raw);
  if (data.version !== 1) throw new Error('Неизвестная версия данных');
  const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], {type: 'application/json'}));
  const link = document.createElement('a');
  link.href = url;
  link.download = 'warehouse-demo-backup.json';
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
})();
```

Проверьте, что файл появился в загрузках. Если DevTools запрещает вставку, можно экспортировать значение через Application → Local Storage → адрес сайта → `royal-baltic-warehouse-v1` и сохранить его в UTF-8 JSON. Не выполняйте непонятные команды.

## 2. Импортировать в локальную React-версию

Запустите `npm run dev` и откройте **http://localhost:5173/**. В Console этой локальной страницы выполните:

```javascript
(async () => {
  const { validate } = await import('/src/domain/inventory.js');
  const picker = document.createElement('input');
  picker.type = 'file';
  picker.accept = '.json,application/json';
  picker.onchange = async () => {
    try {
      const file = picker.files[0];
      if (!file) return;
      const next = JSON.parse(await file.text());
      validate(next);
      const key = 'royal-baltic-warehouse-v1';
      const previous = localStorage.getItem(key);
      if (!confirm('Заменить локальные демонстрационные данные выбранным файлом?')) return;
      if (previous) {
        const url = URL.createObjectURL(new Blob([previous], {type: 'application/json'}));
        const link = document.createElement('a');
        link.href = url;
        link.download = 'warehouse-demo-before-import.json';
        link.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
      }
      localStorage.setItem(key, JSON.stringify(next));
      location.reload();
    } catch (error) { alert('Импорт не выполнен: ' + error.message); }
  };
  picker.click();
})();
```

Выберите `warehouse-demo-backup.json`. Валидатор — тот же, что в исходном прототипе. При наличии локальных данных перед заменой скачивается дополнительная копия; не удаляйте её до проверки.

После обновления сравните итоговые остатки, число заказов, приходы и журнал с исходным сайтом. JSON сохраняет все товары, заказы, отметки оплаты, разрешения и события. Роль после загрузки снова «Менеджер», как в исходном прототипе.

Команда импорта рассчитана на сервер разработки Vite (`npm run dev`). У `npm run preview` другой порт и отдельное хранилище. Используйте постоянно один адрес для работы. Перенос файла не публикует данные и не меняет Sites/CRM.
