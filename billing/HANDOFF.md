# Handoff: Макет «Баланс, счета и ручной счёт» (#623 → #108)

## 1. Состав комплекта (`panel_v2_design/billing/`)

| Файл | Назначение |
|---|---|
| `index.html` | Локальный макет `/app/billing` и `/app/billing/invoices/[id]` (Макет 5, §3.5–3.6 `#590`) |
| `styles.css` | Стили Направления A (Cobalt Flow `#606`), `#94A3B8` без `opacity` и `--focus-dark: #38BDF8` на тёмных поверхностях |
| `app.js` | Нулевые зависимости (`node --check` PASS), строго без `innerHTML`/`eval`, keyset `limit=20`, Срез 3 vs Срез 4, все 9 статусов счёта, загрузка файла + SHA-256 + `idempotencyKey` |
| `assets/` | Локальные копии шрифтов `Manrope`, `JetBrains Mono` (`LICENSE-*.txt`) и SVG Scenor Направления A |
| `COPY_RU.md`, `STATES_AND_LINKS.md` | Русские тексты, маршруты и матрица состояний |
| `exports/*.png` | Скриншоты `1440×900` и `390×844` |

## 2. Инженерные заметки для `#108`

1. **Фиксация `price_snapshot` и `Q-BILL-1`:** при выставлении счёта цена, валюта, состав и условия фиксируются; своевременная подача чека сохраняет `UNDER_REVIEW` даже после истечения 24 ч.
2. **Резерв `held_minor` (`Q-BILL-5`):** замораживается на время `AWAITING_PAYMENT` и `UNDER_REVIEW`; возвращается на баланс при `REJECTED` (после 24 ч) или `EXPIRED`.
3. **Защита от дубля поступления:** `inbound_settlements` с 1-к-1 привязкой `settlement_key` (`409 DUPLICATE_PAYMENT_SETTLEMENT`) + `proof_sha256` (`DUPLICATE_PROOF_DETECTED`).
4. **Срез 3 vs Срез 4:** в Срезе 3 балансы, бонусы, `held_minor` и автопродление не отображаются.
