/* ==========================================================================
   Scenor — Макет «Баланс и счета» (/app/billing) и «Ручной счёт» (/app/billing/invoices/[id])
   Issue #623 (PANEL-V2-BILLING-MOCKUP). Нулевые зависимости.
   Правила безопасности:
     - Строго без innerHTML, insertAdjacentHTML, eval, document.write.
     - Любые данные URL (?invoice=, ?state=, ?slice=) и пользовательский ввод
       выводятся исключительно через textContent / createElement.
   ========================================================================== */
(function () {
  "use strict";

  var PAGE_LIMIT = 20;

  var CHANNELS = {
    usdt_trc20: {
      label: "Адрес кошелька USDT (сеть TRC-20)",
      value: "TScenorDemoWallet7x9K2mP4qR8vN3wJ1",
      metaPrefix: "Сеть: TRC-20 · Комиссия: по условиям сети"
    },
    bank_rub: {
      label: "Номер счёта / СБП (демо-реквизиты)",
      value: "40817 8100 0000 1234 5678 · СБП +7 (900) 000-01-42",
      metaPrefix: "Получатель: ООО «Сценор» (демо) · Без комиссии"
    }
  };

  var STATUS_META = {
    AWAITING_PAYMENT: { label: "Ожидает оплаты", badgeClass: "status-badge--warn" },
    UNDER_REVIEW: { label: "На проверке (UNDER_REVIEW)", badgeClass: "status-badge--info" },
    PAID: { label: "Оплачен (PAID)", badgeClass: "status-badge--active" },
    REJECTED: { label: "Отклонён (REJECTED)", badgeClass: "status-badge--error" },
    EXPIRED: { label: "Истёк (409 INVOICE_EXPIRED)", badgeClass: "status-badge--error" },
    LATE_PAYMENT_REVIEW: { label: "Поздняя оплата (LATE_PAYMENT_REVIEW)", badgeClass: "status-badge--warn" },
    UNDERPAID_REVIEW: { label: "Недоплата (UNDERPAID_REVIEW)", badgeClass: "status-badge--warn" },
    OVERPAID_REVIEW: { label: "Переплата (OVERPAID_REVIEW)", badgeClass: "status-badge--info" },
    DUPLICATE_PAYMENT_SETTLEMENT: { label: "Дубль поступления (409)", badgeClass: "status-badge--error" }
  };

  function makeDemoInvoices() {
    var base = [
      {
        id: "INV-2026-000142",
        purpose: "Покупка новой лицензии (30 дн., 2 ПК, SEO)",
        purposeType: "purchase",
        status: "AWAITING_PAYMENT",
        createdAt: "27.11.2026 12:45",
        expiresAt: "28.11.2026 12:45",
        remainingText: "осталось 22 ч 15 мин",
        paymentCode: "PGF-2026-0142",
        channel: "usdt_trc20",
        heldMinor: 200000,
        snapshot: {
          grossRub: 10000,
          promoLabel: "Промоакция «START» (только новая лицензия)",
          promoRub: -2000,
          personalRub: -2000,
          bonusRub: -2000,
          mainHeldRub: 0,
          totalRub: 4000,
          itemsLabel: "Основной тариф (30 дн., 1 базовое устр.) + 1 доп. устр. + SEO"
        },
        timerExpiredAfterProof: false,
        proofTx: "",
        proofFile: "",
        proofSha: "",
        rejectReason: "Хэш транзакции не найден в сети TRC-20. Проверьте номер перевода и прикрепите читаемый чек."
      },
      {
        id: "INV-2026-000141",
        purpose: "Пополнение основного баланса",
        purposeType: "topup",
        status: "UNDER_REVIEW",
        createdAt: "26.11.2026 18:10",
        expiresAt: "27.11.2026 18:10",
        remainingText: "осталось 3 ч 05 мин",
        paymentCode: "PGF-2026-0141",
        channel: "bank_rub",
        heldMinor: 0,
        snapshot: {
          grossRub: 3000,
          promoLabel: "",
          promoRub: 0,
          personalRub: 0,
          bonusRub: 0,
          mainHeldRub: 0,
          totalRub: 3000,
          itemsLabel: "Добровольное пополнение основного баланса (Срез 4)"
        },
        timerExpiredAfterProof: false,
        proofTx: "SBP-99283712",
        proofFile: "receipt_topup.pdf",
        proofSha: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
        rejectReason: ""
      },
      {
        id: "INV-2026-000140",
        purpose: "Продление лицензии LIC-A1B2C3D4E5F6 (90 дн.)",
        purposeType: "renew",
        status: "PAID",
        createdAt: "20.11.2026 11:00",
        expiresAt: "21.11.2026 11:00",
        remainingText: "исполнен 20.11.2026 11:42",
        paymentCode: "PGF-2026-0140",
        channel: "usdt_trc20",
        heldMinor: 0,
        snapshot: {
          grossRub: 8100,
          promoLabel: "",
          promoRub: 0,
          personalRub: -810,
          bonusRub: -500,
          mainHeldRub: 0,
          totalRub: 6790,
          itemsLabel: "Продление лицензии LIC-A1B2C3D4E5F6 (90 дн., 3 ПК)"
        },
        timerExpiredAfterProof: false,
        proofTx: "0x41a8e9c0...7b11",
        proofFile: "tx_trc20_140.png",
        proofSha: "9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08",
        rejectReason: ""
      },
      {
        id: "INV-2026-000139",
        purpose: "Покупка новой лицензии (30 дн., 1 ПК)",
        purposeType: "purchase",
        status: "REJECTED",
        createdAt: "18.11.2026 09:20",
        expiresAt: "19.11.2026 09:20",
        remainingText: "срок 24 ч истёк",
        paymentCode: "PGF-2026-0139",
        channel: "bank_rub",
        heldMinor: 100000,
        snapshot: {
          grossRub: 2900,
          promoLabel: "",
          promoRub: 0,
          personalRub: 0,
          bonusRub: 0,
          mainHeldRub: 0,
          totalRub: 2900,
          itemsLabel: "Основной тариф (30 дн., 1 базовое устр.)"
        },
        timerExpiredAfterProof: true,
        proofTx: "CHK-00112",
        proofFile: "blurry_photo.jpg",
        proofSha: "4b227777d4dd1fc61c6f884f48641d02b4d121d3fd328cb08b5531fcacdabf8a",
        rejectReason: "Нечитаемое изображение чека, фактическое поступление не обнаружено."
      },
      {
        id: "INV-2026-000138",
        purpose: "Покупка новой лицензии (30 дн., 2 ПК, SEO)",
        purposeType: "purchase",
        status: "EXPIRED",
        createdAt: "15.11.2026 14:00",
        expiresAt: "16.11.2026 14:00",
        remainingText: "истёк 16.11.2026 14:00",
        paymentCode: "PGF-2026-0138",
        channel: "usdt_trc20",
        heldMinor: 0,
        snapshot: {
          grossRub: 4800,
          promoLabel: "",
          promoRub: 0,
          personalRub: 0,
          bonusRub: 0,
          mainHeldRub: 0,
          totalRub: 4800,
          itemsLabel: "Основной тариф (30 дн., 1 устр.) + 1 доп. устр. + SEO"
        },
        timerExpiredAfterProof: false,
        proofTx: "",
        proofFile: "",
        proofSha: "",
        rejectReason: ""
      },
      {
        id: "INV-2026-000137",
        purpose: "Продление лицензии LIC-D4E5F6 (30 дн.)",
        purposeType: "renew",
        status: "LATE_PAYMENT_REVIEW",
        createdAt: "12.11.2026 10:00",
        expiresAt: "13.11.2026 10:00",
        remainingText: "чек подан после срока",
        paymentCode: "PGF-2026-0137",
        channel: "bank_rub",
        heldMinor: 0,
        snapshot: {
          grossRub: 2900,
          promoLabel: "",
          promoRub: 0,
          personalRub: 0,
          bonusRub: 0,
          mainHeldRub: 0,
          totalRub: 2900,
          itemsLabel: "Продление лицензии LIC-D4E5F6 (30 дн., 1 ПК)"
        },
        timerExpiredAfterProof: true,
        proofTx: "SBP-551109",
        proofFile: "late_transfer.png",
        proofSha: "7902699be42c8a8e46fbbb4501726517e86b22c56a189f7625a6da49081b2451",
        rejectReason: ""
      },
      {
        id: "INV-2026-000136",
        purpose: "Покупка новой лицензии (90 дн., 2 ПК)",
        purposeType: "purchase",
        status: "UNDERPAID_REVIEW",
        createdAt: "10.11.2026 16:30",
        expiresAt: "11.11.2026 16:30",
        remainingText: "поступило 9 000 ₽ из 10 050 ₽",
        paymentCode: "PGF-2026-0136",
        channel: "bank_rub",
        heldMinor: 0,
        snapshot: {
          grossRub: 10050,
          promoLabel: "",
          promoRub: 0,
          personalRub: 0,
          bonusRub: 0,
          mainHeldRub: 0,
          totalRub: 10050,
          itemsLabel: "Основной тариф (90 дн., 1 устр.) + 1 доп. устр."
        },
        timerExpiredAfterProof: false,
        proofTx: "SBP-440219",
        proofFile: "underpaid.pdf",
        proofSha: "2c26b46b68ffc68ff99b453c1d30413413422d706483bfa0f98a5e886266e7ae",
        rejectReason: ""
      },
      {
        id: "INV-2026-000135",
        purpose: "Покупка новой лицензии (30 дн., 1 ПК)",
        purposeType: "purchase",
        status: "OVERPAID_REVIEW",
        createdAt: "08.11.2026 12:15",
        expiresAt: "09.11.2026 12:15",
        remainingText: "поступило 3 500 ₽ вместо 2 900 ₽",
        paymentCode: "PGF-2026-0135",
        channel: "usdt_trc20",
        heldMinor: 0,
        snapshot: {
          grossRub: 2900,
          promoLabel: "",
          promoRub: 0,
          personalRub: 0,
          bonusRub: 0,
          mainHeldRub: 0,
          totalRub: 2900,
          itemsLabel: "Основной тариф (30 дн., 1 базовое устр.)"
        },
        timerExpiredAfterProof: false,
        proofTx: "0x88bc...19fa",
        proofFile: "overpaid.png",
        proofSha: "6b86b273ff34fce19d6b804eff5a3f5747ada4eaa22f1d49c01e52ddb7875b4b",
        rejectReason: ""
      },
      {
        id: "INV-2026-000134",
        purpose: "Покупка новой лицензии (30 дн., 2 ПК)",
        purposeType: "purchase",
        status: "DUPLICATE_PAYMENT_SETTLEMENT",
        createdAt: "05.11.2026 09:00",
        expiresAt: "06.11.2026 09:00",
        remainingText: "409 DUPLICATE_PAYMENT_SETTLEMENT",
        paymentCode: "PGF-2026-0134",
        channel: "usdt_trc20",
        heldMinor: 0,
        snapshot: {
          grossRub: 3600,
          promoLabel: "",
          promoRub: 0,
          personalRub: 0,
          bonusRub: 0,
          mainHeldRub: 0,
          totalRub: 3600,
          itemsLabel: "Основной тариф (30 дн., 1 устр.) + 1 доп. устр."
        },
        timerExpiredAfterProof: false,
        proofTx: "0x41a8e9c0...7b11",
        proofFile: "tx_trc20_140.png",
        proofSha: "9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08",
        rejectReason: ""
      }
    ];

    for (var i = 133; i >= 119; i--) {
      base.push({
        id: "INV-2026-000" + i,
        purpose: "Продление лицензии LIC-A1B2C3D4E5F6 (30 дн.)",
        purposeType: "renew",
        status: "PAID",
        createdAt: "01.10.2026 10:00",
        expiresAt: "02.10.2026 10:00",
        remainingText: "исполнен 01.10.2026 10:35",
        paymentCode: "PGF-2026-0" + i,
        channel: i % 2 === 0 ? "bank_rub" : "usdt_trc20",
        heldMinor: 0,
        snapshot: {
          grossRub: 2900,
          promoLabel: "",
          promoRub: 0,
          personalRub: 0,
          bonusRub: 0,
          mainHeldRub: 0,
          totalRub: 2900,
          itemsLabel: "Продление лицензии (30 дн., 1 ПК)"
        },
        timerExpiredAfterProof: false,
        proofTx: "TX-" + i,
        proofFile: "receipt_" + i + ".pdf",
        proofSha: "d4735e3a265e16eee03f59718b9b5d03019c07d8b6c51f90da3a666eec13ab35",
        rejectReason: ""
      });
    }
    return base;
  }

  function makeDemoLedger() {
    var entries = [
      { id: "led-24", date: "27.11.2026 12:45", type: "HELD_RESERVE", slice4Only: true, source: "Резерв бонусов под счёт #INV-2026-000142 (Q-BILL-5)", amount: "−2 000 ₽", invoiceId: "INV-2026-000142" },
      { id: "led-23", date: "20.11.2026 11:42", type: "REAL_EXTERNAL_INFLOW", slice4Only: false, source: "Подтверждено поступление USDT TRC-20 (inbound_settlements)", amount: "+6 790 ₽", invoiceId: "INV-2026-000140" },
      { id: "led-22", date: "20.11.2026 11:42", type: "BONUS_SPENT", slice4Only: true, source: "Списание бонусов (1-я очередь) на продление LIC-A1B2C3D4E5F6", amount: "−500 ₽", invoiceId: "INV-2026-000140" },
      { id: "led-21", date: "19.11.2026 15:10", type: "REFERRAL_REWARD", slice4Only: true, source: "Реферальное вознаграждение 10% (пригл. клиент)", amount: "+400 ₽", invoiceId: "—" },
      { id: "led-20", date: "19.11.2026 09:25", type: "HELD_RELEASE", slice4Only: true, source: "Возврат резерва held_minor после REJECTED", amount: "+1 000 ₽", invoiceId: "INV-2026-000139" },
      { id: "led-19", date: "17.11.2026 14:00", type: "ADMIN_MANUAL_CREDIT", slice4Only: true, source: "Ручная корректировка администратором (без внешнего платежа)", amount: "+1 500 ₽", invoiceId: "—" }
    ];
    for (var i = 18; i >= 1; i--) {
      var invNum = 133 - (18 - i);
      entries.push({
        id: "led-" + i,
        date: "01.10.2026 10:35",
        type: "REAL_EXTERNAL_INFLOW",
        slice4Only: false,
        source: "Прямая оплата ручного счёта #INV-2026-000" + invNum,
        amount: "+2 900 ₽",
        invoiceId: "INV-2026-000" + invNum
      });
    }
    return entries;
  }

  var state = {
    slice: 4, // 4 | 3
    view: "list", // list | invoice
    viewState: "filled", // filled | loading | empty | error
    statusFilter: "ALL",
    invoicesShown: PAGE_LIMIT,
    ledgerShown: PAGE_LIMIT,
    activeInvoiceId: "INV-2026-000142",
    catalogBump20: false,
    clipboardFallbackForced: false,
    submittingProof: false,
    mainBalanceRub: 4000,
    bonusBalanceRub: 2000,
    invoices: makeDemoInvoices(),
    ledger: makeDemoLedger()
  };

  var toastTimer = null;

  function qs(sel) {
    return document.querySelector(sel);
  }

  function qsa(sel) {
    return Array.prototype.slice.call(document.querySelectorAll(sel));
  }

  function clearEl(el) {
    while (el.firstChild) {
      el.removeChild(el.firstChild);
    }
  }

  function createEl(tag, className, text) {
    var el = document.createElement(tag);
    if (className) el.className = className;
    if (typeof text === "string") el.textContent = text;
    return el;
  }

  function formatRub(val) {
    var sign = val < 0 ? "−" : "";
    var abs = Math.abs(Math.round(val)).toString().replace(/\B(?=(\d{3})+(?!\d))/g, "\u00a0");
    return sign + abs + "\u00a0₽";
  }

  function encodeKeysetCursor(ts, id) {
    var raw = "v2|" + ts + "|" + id;
    try {
      return btoa(raw).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
    } catch (e) {
      return "v2_cursor";
    }
  }

  function showToast(msg) {
    var el = qs("#toast");
    if (!el) return;
    el.textContent = msg;
    el.hidden = false;
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(function () {
      el.hidden = true;
    }, 3200);
  }

  function isInvoiceVisibleInSlice(inv) {
    if (!inv) return false;
    if (state.slice !== 4 && inv.purposeType === "topup") return false;
    return true;
  }

  function getActiveInvoice() {
    for (var i = 0; i < state.invoices.length; i++) {
      if (state.invoices[i].id === state.activeInvoiceId && isInvoiceVisibleInSlice(state.invoices[i])) {
        return state.invoices[i];
      }
    }
    for (var j = 0; j < state.invoices.length; j++) {
      if (isInvoiceVisibleInSlice(state.invoices[j])) return state.invoices[j];
    }
    return state.invoices[0];
  }

  function findInvoiceById(id) {
    for (var i = 0; i < state.invoices.length; i++) {
      if (state.invoices[i].id === id) return state.invoices[i];
    }
    return null;
  }

  function clearUrlErrorState() {
    try {
      var url = new URL(window.location.href);
      if (url.searchParams.has("state")) {
        url.searchParams.delete("state");
        window.history.replaceState({}, "", url.toString());
      }
    } catch (e) {
      // file:// fallback: ignore if replaceState restricted
    }
  }

  function renderDemoBar() {
    qsa("[data-slice]").forEach(function (btn) {
      btn.setAttribute("aria-pressed", Number(btn.getAttribute("data-slice")) === state.slice ? "true" : "false");
    });
    qsa("[data-view]").forEach(function (btn) {
      btn.setAttribute("aria-pressed", btn.getAttribute("data-view") === state.view ? "true" : "false");
    });
    qsa("[data-view-state]").forEach(function (btn) {
      btn.setAttribute("aria-pressed", btn.getAttribute("data-view-state") === state.viewState ? "true" : "false");
    });

    var routeEl = qs("#demo-route-display");
    var inv = getActiveInvoice();
    if (state.view === "invoice" && inv) {
      routeEl.textContent = "/app/billing/invoices/" + inv.id;
    } else {
      routeEl.textContent = "/app/billing";
    }

    var statusWrap = qs("#demo-invoice-status-wrap");
    var stateGroup = qs("#demo-state-group");
    statusWrap.hidden = state.view !== "invoice";
    stateGroup.hidden = state.view !== "list";

    if (inv) {
      qs("#demo-invoice-status-select").value = inv.status;
    }
    qs("#toggle-clipboard-fallback").checked = state.clipboardFallbackForced;
  }

  function renderShellSlice() {
    var isSlice4 = state.slice === 4;
    qs("#nav-billing-label").textContent = isSlice4 ? "Баланс и счета" : "Мои счета";
    qs("#back-to-billing-text").textContent = isSlice4 ? "Баланс и счета" : "Мои счета";
    qs("#nav-item-referrals").hidden = !isSlice4;
    qs("#header-balance-pill").hidden = !isSlice4;
    qs("#slice3-banner").hidden = isSlice4;

    qs("#header-balance-total").textContent = formatRub(state.mainBalanceRub + state.bonusBalanceRub);
    qs("#header-balance-split").textContent = "Осн: " + formatRub(state.mainBalanceRub) + " · Бон: " + formatRub(state.bonusBalanceRub);
  }

  function renderListView() {
    var isSlice4 = state.slice === 4;
    qs("#billing-page-heading").textContent = isSlice4 ? "Баланс и счета" : "Мои счета";
    qs("#billing-page-subtitle").textContent = isSlice4
      ? "Управление внутренним балансом, ручными счетами на оплату и журналом операций."
      : "Ручные счета на оплату и журнал операций (прямая оплата без баланса, Срез 3).";

    qs("#btn-open-topup").hidden = !isSlice4;
    qs("#btn-empty-topup").hidden = !isSlice4;
    qs("#slice4-balances-section").hidden = !isSlice4 || state.viewState !== "filled";

    if (isSlice4) {
      qs("#card-main-balance").textContent = formatRub(state.mainBalanceRub);
      qs("#card-bonus-balance").textContent = formatRub(state.bonusBalanceRub);
      var heldMinor = 0;
      var heldInvoiceId = "";
      for (var i = 0; i < state.invoices.length; i++) {
        if ((state.invoices[i].status === "AWAITING_PAYMENT" || state.invoices[i].status === "UNDER_REVIEW") && state.invoices[i].heldMinor > 0) {
          heldMinor += state.invoices[i].heldMinor;
          heldInvoiceId = state.invoices[i].id;
        }
      }
      qs("#card-held-balance").hidden = heldMinor <= 0;
      qs("#card-held-value").textContent = formatRub(heldMinor / 100);
      if (heldInvoiceId) {
        qs("#btn-open-held-invoice").textContent = "#" + heldInvoiceId;
        qs("#btn-open-held-invoice").setAttribute("data-open-invoice", heldInvoiceId);
      }
    }

    qs("#state-loading").hidden = state.viewState !== "loading";
    qs("#state-empty").hidden = state.viewState !== "empty";
    qs("#state-error").hidden = state.viewState !== "error";
    qs("#billing-filled-content").hidden = state.viewState !== "filled";

    if (state.viewState === "empty") {
      qs("#empty-state-desc").textContent = isSlice4
        ? "Активных счетов пока нет. Купите лицензию или пополните основной баланс."
        : "Активных счетов пока нет. Вы можете оформить покупку лицензии по прямому счёту.";
    }

    if (state.viewState !== "filled") return;

    // Filter and render invoices (limit=20 keyset)
    var filtered = state.invoices.filter(function (inv) {
      if (!isInvoiceVisibleInSlice(inv)) return false;
      return state.statusFilter === "ALL" || inv.status === state.statusFilter;
    });
    var visibleInv = filtered.slice(0, state.invoicesShown);
    var tbody = qs("#invoices-tbody");
    clearEl(tbody);

    if (visibleInv.length === 0) {
      var trEmpty = createEl("tr");
      var tdEmpty = createEl("td", "", "По выбранному фильтру счетов нет.");
      tdEmpty.colSpan = 6;
      trEmpty.appendChild(tdEmpty);
      tbody.appendChild(trEmpty);
    } else {
      visibleInv.forEach(function (inv) {
        var tr = createEl("tr");

        var tdId = createEl("td");
        var idBtn = createEl("button", "inline-link mono", "#" + inv.id);
        idBtn.type = "button";
        idBtn.addEventListener("click", function () {
          openInvoice(inv.id);
        });
        tdId.appendChild(idBtn);

        var tdPurpose = createEl("td", "", inv.purpose);

        var tdSum = createEl("td", "tabular");
        var displayTotal = isSlice4 ? inv.snapshot.totalRub : inv.snapshot.grossRub;
        tdSum.textContent = formatRub(displayTotal);

        var tdStatus = createEl("td");
        var meta = STATUS_META[inv.status] || { label: inv.status, badgeClass: "status-badge--info" };
        tdStatus.appendChild(createEl("span", "status-badge " + meta.badgeClass, meta.label));

        var tdDate = createEl("td", "", inv.createdAt);

        var tdAction = createEl("td", "td-actions");
        var openBtn = createEl("button", "btn btn--secondary btn--sm", "Открыть");
        openBtn.type = "button";
        openBtn.addEventListener("click", function () {
          openInvoice(inv.id);
        });
        tdAction.appendChild(openBtn);

        tr.appendChild(tdId);
        tr.appendChild(tdPurpose);
        tr.appendChild(tdSum);
        tr.appendChild(tdStatus);
        tr.appendChild(tdDate);
        tr.appendChild(tdAction);
        tbody.appendChild(tr);
      });
    }

    qs("#invoices-pagination-info").textContent = "Показано " + visibleInv.length + " из " + filtered.length;
    var hasMoreInv = visibleInv.length < filtered.length;
    qs("#btn-load-more-invoices").hidden = !hasMoreInv;

    // Render ledger_entries (limit=20 keyset)
    var ledgerFiltered = state.ledger.filter(function (entry) {
      return isSlice4 || !entry.slice4Only;
    });
    var visibleLedger = ledgerFiltered.slice(0, state.ledgerShown);
    var lTbody = qs("#ledger-tbody");
    clearEl(lTbody);

    visibleLedger.forEach(function (entry) {
      var tr = createEl("tr");
      tr.appendChild(createEl("td", "tabular", entry.date));
      tr.appendChild(createEl("td", "mono", entry.type));
      tr.appendChild(createEl("td", "", entry.source));
      tr.appendChild(createEl("td", "tabular", entry.amount));

      var tdInv = createEl("td", "mono");
      if (entry.invoiceId && entry.invoiceId !== "—") {
        var lBtn = createEl("button", "inline-link mono", entry.invoiceId);
        lBtn.type = "button";
        lBtn.addEventListener("click", function () {
          openInvoice(entry.invoiceId);
        });
        tdInv.appendChild(lBtn);
      } else {
        tdInv.textContent = "—";
      }
      tr.appendChild(tdInv);
      lTbody.appendChild(tr);
    });

    qs("#ledger-pagination-info").textContent = "Показано " + visibleLedger.length + " из " + ledgerFiltered.length;
    var hasMoreLedger = visibleLedger.length < ledgerFiltered.length;
    qs("#btn-load-more-ledger").hidden = !hasMoreLedger;
    var lastEntry = visibleLedger[visibleLedger.length - 1];
    qs("#ledger-cursor-chip").textContent = hasMoreLedger && lastEntry
      ? "nextCursor: " + encodeKeysetCursor("2026-11-27T12:45:00.000000Z", lastEntry.id)
      : "nextCursor: null";
  }

  function renderInvoiceView() {
    var inv = getActiveInvoice();
    if (!inv) return;
    var isSlice4 = state.slice === 4;

    qs("#invoice-route-chip").textContent = "/app/billing/invoices/" + inv.id;
    qs("#invoice-detail-heading").textContent = "Счёт #" + inv.id;
    qs("#invoice-purpose-text").textContent = "Назначение: " + inv.purpose;
    qs("#invoice-timer-text").textContent = "Действует до: " + inv.expiresAt + " (" + inv.remainingText + ")";
    qs("#invoice-payment-code").textContent = "Код: " + inv.paymentCode;

    var meta = STATUS_META[inv.status] || { label: inv.status, badgeClass: "status-badge--info" };
    var badge = qs("#invoice-status-badge");
    badge.className = "status-badge " + meta.badgeClass;
    badge.textContent = meta.label;

    // Top-up auto-renewal warning (Slice 4 only)
    qs("#invoice-topup-autorenew-warn").hidden = !(isSlice4 && inv.purposeType === "topup");

    // Breakdown (price_snapshot)
    var kv = qs("#invoice-breakdown-list");
    clearEl(kv);
    function addRow(label, val, isDisc) {
      var r = createEl("div", "kv-row" + (isDisc ? " kv-row--discount" : ""));
      r.appendChild(createEl("span", "kv-row__label", label));
      r.appendChild(createEl("span", "kv-row__value tabular", val));
      kv.appendChild(r);
    }

    addRow(inv.snapshot.itemsLabel, formatRub(inv.snapshot.grossRub), false);
    if (isSlice4) {
      if (inv.snapshot.promoRub < 0) {
        addRow(inv.snapshot.promoLabel, formatRub(inv.snapshot.promoRub), true);
      }
      if (inv.snapshot.personalRub < 0) {
        addRow("Персональная скидка клиента", formatRub(inv.snapshot.personalRub), true);
      }
      if (inv.snapshot.bonusRub < 0) {
        addRow("Списание бонусного баланса (приоритет бонусов, held_minor)", formatRub(inv.snapshot.bonusRub), true);
      }
    }

    var totalToPay = isSlice4 ? inv.snapshot.totalRub : inv.snapshot.grossRub;
    qs("#invoice-total-amount").textContent = formatRub(totalToPay);
    qs("#invoice-direct-note").textContent = isSlice4
      ? (inv.purposeType === "topup"
        ? "Пополнение основного баланса — после зачисления сработает автопродление просроченных лицензий."
        : "Прямая оплата заказа — не перехватывается автопродлением других лицензий.")
      : "Прямая оплата заказа по зафиксированному расчёту (price_snapshot).";

    // Requisites
    var ch = CHANNELS[inv.channel] || CHANNELS.usdt_trc20;
    qs("#invoice-channel-switch").value = inv.channel;
    qs("#req-label").textContent = ch.label;
    qs("#req-value").textContent = ch.value;
    qs("#req-meta").textContent = "Сумма перевода: " + formatRub(totalToPay) + " · " + ch.metaPrefix;
    qs("#clipboard-fallback-box").hidden = true;

    // Status Banner
    var banner = qs("#invoice-status-banner");
    var bTitle = qs("#invoice-status-banner-title");
    var bText = qs("#invoice-status-banner-text");
    var bActions = qs("#invoice-status-banner-actions");
    clearEl(bActions);
    banner.hidden = false;

    if (inv.status === "AWAITING_PAYMENT") {
      if (state.catalogBump20) {
        banner.className = "alert alert--ok";
        bTitle.textContent = "Цена тарифа в каталоге выросла на +20%, но сумма счёта не изменилась";
        bText.textContent = "В каталоге новая цена: " + formatRub(Math.round(inv.snapshot.grossRub * 1.2)) + ". Для этого счёта зафиксирован price_snapshot: " + formatRub(totalToPay) + ".";
      } else {
        banner.hidden = true;
      }
    } else if (inv.status === "UNDER_REVIEW") {
      banner.className = "alert alert--info";
      bTitle.textContent = inv.timerExpiredAfterProof
        ? "Таймер 24 ч истёк, но чек подан в срок — счёт остаётся в UNDER_REVIEW (Q-BILL-1)"
        : "Подтверждение отправлено на проверку администратору (UNDER_REVIEW)";
      bText.textContent = "Цена, валюта и состав заказа заморожены до решения администратора." +
        (isSlice4 && inv.heldMinor > 0 ? " Резерв held_minor (" + formatRub(inv.heldMinor / 100) + ") жёстко закреплён за этим счётом." : "");
    } else if (inv.status === "PAID") {
      banner.className = "alert alert--ok";
      bTitle.textContent = "Счёт оплачен и подтверждён (PAID)";
      bText.textContent = "Фактическое поступление привязано в inbound_settlements (1-к-1). Назначение исполнено по зафиксированным условиям.";
      var licLink = createEl("a", "btn btn--primary btn--sm", "Перейти в «Мои лицензии»");
      licLink.href = "../licenses/index.html";
      bActions.appendChild(licLink);
    } else if (inv.status === "REJECTED") {
      banner.className = "alert alert--error";
      bTitle.textContent = "Подтверждение отклонено администратором (REJECTED)";
      bText.textContent = (inv.rejectReason || "Платёж не подтверждён.") +
        (isSlice4 && inv.heldMinor > 0 ? " Резерв held_minor возвращён на баланс (Q-BILL-5)." : "");
      if (inv.timerExpiredAfterProof) {
        var newBtn = createEl("a", "btn btn--primary btn--sm", "Создать новый счёт по актуальной цене");
        newBtn.href = "../checkout/index.html?cfg=30d-2pc-seo1";
        bActions.appendChild(newBtn);
      }
    } else if (inv.status === "EXPIRED") {
      banner.className = "alert alert--error";
      bTitle.textContent = "Срок действия счёта истёк — 409 INVOICE_EXPIRED";
      bText.textContent = "Подтверждение не было подано в течение 24 ч. Фиксация цены снята" +
        (isSlice4 ? ", резерв held_minor разблокирован." : ".");
      var expNewBtn = createEl("a", "btn btn--primary btn--sm", "Создать новый счёт по актуальной цене");
      expNewBtn.href = "../checkout/index.html?cfg=30d-2pc-seo1";
      bActions.appendChild(expNewBtn);
      var lateBtn = createEl("button", "btn btn--secondary btn--sm", "Я уже перевёл деньги позже срока");
      lateBtn.type = "button";
      lateBtn.addEventListener("click", function () {
        inv.status = "LATE_PAYMENT_REVIEW";
        render();
        showToast("Счёт переведён в LATE_PAYMENT_REVIEW для ручного разбора.");
      });
      bActions.appendChild(lateBtn);
    } else if (inv.status === "LATE_PAYMENT_REVIEW") {
      banner.className = "alert alert--warn";
      bTitle.textContent = "Поздняя оплата на ручном разборе (LATE_PAYMENT_REVIEW)";
      bText.textContent = isSlice4
        ? "По Q-BILL-1 чек или перевод после истечения срока 24 ч не исполняется автоматически по старой цене. Администратор проверит поступление и примет единое решение (зачёт на баланс, доплата или возврат)."
        : "По Q-BILL-1 чек или перевод после истечения срока 24 ч не исполняется автоматически по старой цене. Администратор проверит поступление и примет единое решение (доплата или возврат).";
    } else if (inv.status === "UNDERPAID_REVIEW") {
      banner.className = "alert alert--warn";
      bTitle.textContent = "Недоплата — лицензия не выдаётся (UNDERPAID_REVIEW)";
      bText.textContent = isSlice4
        ? "Фактически поступило меньше суммы счёта. Администратор зафиксирует фактическую сумму и предложит доплату остатка, зачёт на баланс или возврат (Q-BILL-2)."
        : "Фактически поступило меньше суммы счёта. Администратор зафиксирует фактическую сумму и предложит доплату остатка или возврат (Q-BILL-2).";
    } else if (inv.status === "OVERPAID_REVIEW") {
      banner.className = "alert alert--info";
      bTitle.textContent = "Переплата — заказ исполнен, излишек зафиксирован (OVERPAID_REVIEW)";
      bText.textContent = isSlice4
        ? "Заказ исполнен по price_snapshot. Излишек зафиксирован администратором для зачисления на основной баланс или возврата (Q-BILL-2)."
        : "Заказ исполнен по price_snapshot. Излишек зафиксирован администратором для возврата (Q-BILL-2).";
    } else if (inv.status === "DUPLICATE_PAYMENT_SETTLEMENT") {
      banner.className = "alert alert--error";
      bTitle.textContent = "409 DUPLICATE_PAYMENT_SETTLEMENT / DUPLICATE_PROOF_DETECTED";
      bText.textContent = "Это фактическое поступление (settlement_key в inbound_settlements) или файл подтверждения (proof_sha256) уже привязано к счёту #INV-2026-000140. Повторный зачёт физически заблокирован.";
    }

    // Proof form visibility & lock
    var canSubmitProof = inv.status === "AWAITING_PAYMENT" || (inv.status === "REJECTED" && !inv.timerExpiredAfterProof);
    qs("#proof-form").hidden = !canSubmitProof;
    qs("#proof-idempotency-note").textContent = "idempotencyKey: proof_" + inv.id.toLowerCase() + "_v1";

    var subBox = qs("#submitted-proof-box");
    var subKv = qs("#submitted-proof-kv");
    clearEl(subKv);
    if (inv.proofTx || inv.proofFile) {
      subBox.hidden = false;
      function addSubRow(k, v) {
        var r = createEl("div", "kv-row");
        r.appendChild(createEl("span", "kv-row__label", k));
        r.appendChild(createEl("span", "kv-row__value mono", v));
        subKv.appendChild(r);
      }
      addSubRow("Хэш / номер перевода", inv.proofTx || "—");
      addSubRow("Файл подтверждения", inv.proofFile || "—");
      if (inv.proofSha) addSubRow("SHA-256 файла", inv.proofSha);
    } else {
      subBox.hidden = true;
    }
  }

  function render() {
    renderDemoBar();
    renderShellSlice();
    qs("#view-billing-list").hidden = state.view !== "list";
    qs("#view-invoice-detail").hidden = state.view !== "invoice";
    if (state.view === "list") {
      renderListView();
    } else {
      renderInvoiceView();
    }
  }

  function openInvoice(id) {
    var found = findInvoiceById(id);
    if (!found) {
      qs("#global-invoice-alert").hidden = false;
      qs("#global-invoice-alert-title").textContent = "Счёт не найден";
      qs("#global-invoice-alert-text").textContent = "Передан неизвестный или некорректный идентификатор счёта: «" + String(id) + "». Проверьте ссылку и выберите счёт из списка.";
      state.view = "list";
      render();
      return;
    }
    if (!isInvoiceVisibleInSlice(found)) {
      qs("#global-invoice-alert").hidden = false;
      qs("#global-invoice-alert-title").textContent = "Счёт недоступен в Срезе 3";
      qs("#global-invoice-alert-text").textContent = "Счёт #" + found.id + " относится к операциям, недоступным в режиме прямой оплаты (Срез 3). Выберите счёт заказа из списка.";
      state.view = "list";
      render();
      return;
    }
    qs("#global-invoice-alert").hidden = true;
    state.activeInvoiceId = found.id;
    state.view = "invoice";
    render();
  }

  function computeSha256Hex(file, cb) {
    if (window.crypto && window.crypto.subtle && file.arrayBuffer) {
      file.arrayBuffer().then(function (buf) {
        return window.crypto.subtle.digest("SHA-256", buf);
      }).then(function (hashBuf) {
        var arr = Array.prototype.slice.call(new Uint8Array(hashBuf));
        var hex = arr.map(function (b) { return ("00" + b.toString(16)).slice(-2); }).join("");
        cb(hex);
      }).catch(function () {
        cb("sha256_demo_" + file.size + "_" + file.name.length);
      });
    } else {
      cb("sha256_demo_" + file.size + "_" + file.name.length);
    }
  }

  function bindEvents() {
    // Demo bar controls
    qsa("[data-slice]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        state.slice = Number(btn.getAttribute("data-slice"));
        if (state.slice === 3) {
          qs("#topup-modal-backdrop").hidden = true;
          if (state.view === "invoice") {
            var cur = findInvoiceById(state.activeInvoiceId);
            if (cur && !isInvoiceVisibleInSlice(cur)) {
              state.view = "list";
              qs("#global-invoice-alert").hidden = true;
            }
          }
        }
        render();
      });
    });

    qsa("[data-view]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        state.view = btn.getAttribute("data-view");
        render();
      });
    });

    qsa("[data-view-state]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        state.viewState = btn.getAttribute("data-view-state");
        render();
      });
    });

    qs("#demo-invoice-status-select").addEventListener("change", function (e) {
      var inv = getActiveInvoice();
      if (!inv) return;
      inv.status = e.target.value;
      render();
    });

    qs("#toggle-clipboard-fallback").addEventListener("change", function (e) {
      state.clipboardFallbackForced = e.target.checked;
    });

    qs("#btn-test-bad-invoice").addEventListener("click", function () {
      openInvoice("<img src=x onerror=alert(1)>");
    });

    qs("#btn-reset-demo").addEventListener("click", function () {
      state.slice = 4;
      state.view = "list";
      state.viewState = "filled";
      state.statusFilter = "ALL";
      state.invoicesShown = PAGE_LIMIT;
      state.ledgerShown = PAGE_LIMIT;
      state.catalogBump20 = false;
      state.clipboardFallbackForced = false;
      state.invoices = makeDemoInvoices();
      state.ledger = makeDemoLedger();
      qs("#global-invoice-alert").hidden = true;
      clearUrlErrorState();
      render();
      showToast("Демо-состояние сброшено.");
    });

    qs("#btn-dismiss-invoice-alert").addEventListener("click", function () {
      qs("#global-invoice-alert").hidden = true;
    });

    // Mobile sidebar
    qs("#btn-open-sidebar").addEventListener("click", function () {
      qs("#app-sidebar").classList.add("sidebar--open");
      qs("#sidebar-backdrop").hidden = false;
      qs("#btn-open-sidebar").setAttribute("aria-expanded", "true");
    });
    function closeSidebar() {
      qs("#app-sidebar").classList.remove("sidebar--open");
      qs("#sidebar-backdrop").hidden = true;
      qs("#btn-open-sidebar").setAttribute("aria-expanded", "false");
    }
    qs("#btn-close-sidebar").addEventListener("click", closeSidebar);
    qs("#sidebar-backdrop").addEventListener("click", closeSidebar);

    // Filter & Pagination
    qs("#invoice-status-filter").addEventListener("change", function (e) {
      state.statusFilter = e.target.value;
      state.invoicesShown = PAGE_LIMIT;
      render();
    });

    qs("#btn-load-more-invoices").addEventListener("click", function () {
      state.invoicesShown += PAGE_LIMIT;
      render();
    });

    qs("#btn-load-more-ledger").addEventListener("click", function () {
      state.ledgerShown += PAGE_LIMIT;
      render();
    });

    qs("#btn-retry-load").addEventListener("click", function () {
      clearUrlErrorState();
      state.viewState = "filled";
      render();
      showToast("Данные биллинга загружены.");
    });

    qs("#btn-open-held-invoice").addEventListener("click", function () {
      var id = qs("#btn-open-held-invoice").getAttribute("data-open-invoice") || "INV-2026-000142";
      openInvoice(id);
    });

    // Invoice detail back & demos
    qs("#btn-back-to-billing").addEventListener("click", function () {
      state.view = "list";
      render();
    });

    qs("#btn-sim-catalog-bump").addEventListener("click", function () {
      state.catalogBump20 = !state.catalogBump20;
      render();
      showToast("Цена тарифа в каталоге изменена — сумма счёта осталась прежней.");
    });

    qs("#btn-sim-timer-expire").addEventListener("click", function () {
      var inv = getActiveInvoice();
      if (!inv) return;
      if (inv.status === "UNDER_REVIEW") {
        inv.timerExpiredAfterProof = true;
        render();
        showToast("Таймер 24 ч истёк, но чек подан в срок — счёт остаётся в UNDER_REVIEW.");
      } else if (inv.status === "AWAITING_PAYMENT" || inv.status === "REJECTED") {
        inv.status = "EXPIRED";
        inv.timerExpiredAfterProof = true;
        render();
        showToast("Таймер 24 ч истёк — 409 INVOICE_EXPIRED.");
      }
    });

    qs("#invoice-channel-switch").addEventListener("change", function (e) {
      var inv = getActiveInvoice();
      if (!inv) return;
      inv.channel = e.target.value;
      renderInvoiceView();
    });

    // Copy requisites + fallback
    qs("#btn-copy-req").addEventListener("click", function () {
      var text = qs("#req-value").textContent.trim();
      var useFallback = state.clipboardFallbackForced || !navigator.clipboard || !navigator.clipboard.writeText;
      if (useFallback) {
        var box = qs("#clipboard-fallback-box");
        var inp = qs("#clipboard-fallback-input");
        box.hidden = false;
        inp.value = text;
        inp.focus();
        inp.select();
        showToast("Буфер обмена недоступен — выделите реквизиты и нажмите Ctrl+C.");
        return;
      }
      navigator.clipboard.writeText(text).then(function () {
        showToast("Реквизиты скопированы.");
      }).catch(function () {
        var box = qs("#clipboard-fallback-box");
        var inp = qs("#clipboard-fallback-input");
        box.hidden = false;
        inp.value = text;
        inp.focus();
        inp.select();
      });
    });

    // File input preview + SHA-256
    qs("#proof-file-input").addEventListener("change", function (e) {
      var file = e.target.files && e.target.files[0];
      var errBox = qs("#proof-form-error");
      var metaBox = qs("#proof-file-meta");
      if (!file) {
        metaBox.hidden = true;
        return;
      }
      var allowed = ["image/png", "image/jpeg", "application/pdf"];
      var extOk = /\.(png|jpe?g|pdf)$/i.test(file.name);
      var mimeOk = !file.type || allowed.indexOf(file.type) !== -1;
      if (!extOk || !mimeOk) {
        errBox.hidden = false;
        qs("#proof-form-error-text").textContent = "Допустимы только файлы PNG, JPG или PDF.";
        e.target.value = "";
        metaBox.hidden = true;
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        errBox.hidden = false;
        qs("#proof-form-error-text").textContent = "Размер файла превышает 10 МБ.";
        e.target.value = "";
        metaBox.hidden = true;
        return;
      }
      errBox.hidden = true;
      qs("#proof-file-name").textContent = file.name;
      qs("#proof-file-size").textContent = Math.max(1, Math.round(file.size / 1024)) + " КБ";
      qs("#proof-file-sha").textContent = "вычисляется…";
      metaBox.hidden = false;
      computeSha256Hex(file, function (hex) {
        qs("#proof-file-sha").textContent = hex;
      });
    });

    // Submit proof with double-click guard
    qs("#proof-form").addEventListener("submit", function (e) {
      e.preventDefault();
      if (state.submittingProof) return;
      var inv = getActiveInvoice();
      if (!inv) return;

      var tx = qs("#proof-tx-input").value.trim();
      var fileInput = qs("#proof-file-input");
      var file = fileInput.files && fileInput.files[0];
      var errBox = qs("#proof-form-error");

      if (!tx && !file) {
        errBox.hidden = false;
        qs("#proof-form-error-text").textContent = "Укажите хэш транзакции / номер перевода или прикрепите файл подтверждения.";
        return;
      }
      errBox.hidden = true;
      state.submittingProof = true;
      var submitBtn = qs("#btn-submit-proof");
      submitBtn.disabled = true;
      submitBtn.textContent = "Отправка…";

      setTimeout(function () {
        inv.proofTx = tx || "Не указан";
        inv.proofFile = file ? file.name : "Не прикреплён";
        inv.proofSha = file ? qs("#proof-file-sha").textContent : "";
        inv.status = "UNDER_REVIEW";
        state.submittingProof = false;
        submitBtn.disabled = false;
        submitBtn.textContent = "Отправить на проверку администратору";
        render();
        showToast("Подтверждение отправлено. Счёт переведён в UNDER_REVIEW.");
      }, 150);
    });

    // Admin demo buttons
    qs("#btn-admin-approve").addEventListener("click", function () {
      var inv = getActiveInvoice();
      if (!inv) return;
      inv.status = "PAID";
      render();
      showToast("Администратор подтвердил счёт (PAID).");
    });

    qs("#btn-admin-reject").addEventListener("click", function () {
      var inv = getActiveInvoice();
      if (!inv) return;
      inv.status = "REJECTED";
      if (!inv.rejectReason) {
        inv.rejectReason = "Поступление не найдено в выписке.";
      }
      render();
      showToast("Администратор отклонил подтверждение (REJECTED).");
    });

    // Top-up modal (Slice 4)
    function openTopupModal() {
      qs("#topup-modal-backdrop").hidden = false;
      qs("#topup-amount-input").focus();
    }
    function closeTopupModal() {
      qs("#topup-modal-backdrop").hidden = true;
    }
    qs("#btn-open-topup").addEventListener("click", openTopupModal);
    qs("#btn-empty-topup").addEventListener("click", openTopupModal);
    qs("#btn-close-topup").addEventListener("click", closeTopupModal);
    qs("#btn-cancel-topup").addEventListener("click", closeTopupModal);

    qs("#topup-form").addEventListener("submit", function (e) {
      e.preventDefault();
      var amount = Math.max(500, parseInt(qs("#topup-amount-input").value, 10) || 3000);
      var channel = qs("#topup-channel-select").value;
      var newId = "INV-2026-000" + (143 + state.invoices.length);
      state.invoices.unshift({
        id: newId,
        purpose: "Пополнение основного баланса",
        purposeType: "topup",
        status: "AWAITING_PAYMENT",
        createdAt: "27.11.2026 15:05",
        expiresAt: "28.11.2026 15:05",
        remainingText: "осталось 24 ч 00 мин",
        paymentCode: "PGF-2026-" + (143 + state.invoices.length),
        channel: channel,
        heldMinor: 0,
        snapshot: {
          grossRub: amount,
          promoLabel: "",
          promoRub: 0,
          personalRub: 0,
          bonusRub: 0,
          mainHeldRub: 0,
          totalRub: amount,
          itemsLabel: "Пополнение основного баланса (Срез 4)"
        },
        timerExpiredAfterProof: false,
        proofTx: "",
        proofFile: "",
        proofSha: "",
        rejectReason: ""
      });
      closeTopupModal();
      state.viewState = "filled";
      openInvoice(newId);
      showToast("Создан счёт пополнения #" + newId);
    });

    // Help search modal (Ctrl+K)
    function openHelpModal() {
      qs("#help-modal-backdrop").hidden = false;
      qs("#help-search-input").focus();
    }
    function closeHelpModal() {
      qs("#help-modal-backdrop").hidden = true;
    }
    qs("#btn-open-help-search").addEventListener("click", openHelpModal);
    qs("#btn-close-help").addEventListener("click", closeHelpModal);
    document.addEventListener("keydown", function (e) {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        openHelpModal();
      } else if (e.key === "Escape") {
        closeHelpModal();
        closeTopupModal();
      }
    });

    // Non-implemented sidebar routes
    qsa("[data-nav-route]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var r = btn.getAttribute("data-nav-route");
        showToast("Раздел " + r + " — вне макета #623.");
      });
    });

    qs("#btn-logout").addEventListener("click", function () {
      showToast("Выход из аккаунта (демо).");
    });
  }

  function initFromUrl() {
    var params = new URLSearchParams(window.location.search || "");
    var sliceParam = params.get("slice");
    if (sliceParam === "3") state.slice = 3;
    if (sliceParam === "4") state.slice = 4;

    var stateParam = params.get("state");
    if (stateParam === "loading" || stateParam === "empty" || stateParam === "error" || stateParam === "filled") {
      state.viewState = stateParam;
    }

    var invParam = params.get("invoice");
    if (invParam !== null && invParam !== "") {
      openInvoice(invParam);
    } else {
      render();
    }
  }

  bindEvents();
  initFromUrl();
})();
