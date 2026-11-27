# Карта маршрутов и матрица состояний: «Баланс и счета» (#623)

## 1. Маршруты и переходы

| Элемент / действие | Канонический маршрут | Поведение в макете |
|---|---|---|
| Пункт меню / плашка баланса | `/app/billing` | `billing/index.html` |
| Клик по счёту / `?invoice=INV-2026-000142` | `/app/billing/invoices/[id]` | Карточка ручного счёта (`#view-invoice-detail`) |
| Возврат `← Баланс и счета` | `/app/billing` | Возврат к списку счетов и журналу |
| «Купить лицензию» | `/app/billing/checkout?cfg=30d-2pc-seo1` | `../checkout/index.html?cfg=30d-2pc-seo1` |
| «Мои лицензии» / CTA при `PAID` | `/app/licenses` | `../licenses/index.html` |

## 2. Матрица состояний (K1–K2)

| Состояние / сценарий | Поведение |
|---|---|
| `Срез 4` | Показаны основной/бонусный баланс, `held_minor`, «Пополнить основной баланс» с жёлтым предупреждением автопродления, «Рефералы». |
| `Срез 3` | Балансы, `held_minor`, пополнение, автопродление и «Рефералы» полностью скрыты (`hidden`); заголовок «Мои счета». |
| `filled` / `loading` / `empty` / `error` | Закрыты все 4 состояния; «Повторить» очищает `state=error` из URL. |
| Keyset `limit=20` | Счета (24) и `ledger_entries` (24) подгружаются по 20 записей кнопкой «Показать ещё» до `nextCursor: null`. |
| Все 9 статусов счёта | `AWAITING_PAYMENT`, `UNDER_REVIEW`, `PAID`, `REJECTED`, `EXPIRED` (`409 INVOICE_EXPIRED`), `LATE_PAYMENT_REVIEW`, `UNDERPAID_REVIEW`, `OVERPAID_REVIEW`, `DUPLICATE_PAYMENT_SETTLEMENT` / `DUPLICATE_PROOF_DETECTED`. |
| Неизвестный / XSS `?invoice=` | Безопасный вывод через `textContent` в `#global-invoice-alert` без падения и XSS. |
