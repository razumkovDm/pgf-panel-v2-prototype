(function () {
  "use strict";

  /* =========================================================================
     Демонстрационные данные (синхронизированы с ТЗ #590 и #609)
     Все пользовательские и URL-строки выводятся строго через textContent.
     ========================================================================= */
  const INITIAL_LICENSES = [
    {
      publicId: "LIC-A1B2C3D4E5F6",
      name: "Рабочая ферма #1",
      status: "ACTIVE",
      statusLabel: "ACTIVE",
      termShort: "До: 25.12.2026 (осталось 30 дн.)",
      termDetail: "до 25.12.2026 (осталось 30 дн.)",
      nextChargeDate: "25.12.2026",
      features: { desktop: true, seo: true },
      source: "Прямая покупка",
      note: "Основной сервер Google/Яндекс",
      autoRenew: true,
      autoRenewEligible: true,
      key: "PGF-7K9M-4P2X-8Q5N-3W6R",
      keyStatus: "ACTIVE",
      rotationCounter: 1,
      devicesUsed: 2,
      devicesLimit: 3,
      renewCfg: "30d-3pc-seo1"
    },
    {
      publicId: "LIC-T9R4M2K8V1P5",
      name: "Пробный доступ",
      status: "TRIAL",
      statusLabel: "TRIAL",
      termShort: "До: 04.12.2026 (осталось 7 дн.)",
      termDetail: "до 04.12.2026 (осталось 7 дн., пробный период)",
      nextChargeDate: null,
      features: { desktop: true, seo: false },
      source: "Пробный период",
      note: "Проверка сценариев на рабочем ноутбуке",
      autoRenew: false,
      autoRenewEligible: false,
      key: "PGF-TRL2-9H4J-6C8V-5B3N",
      keyStatus: "ACTIVE",
      rotationCounter: 1,
      devicesUsed: 1,
      devicesLimit: 1,
      renewCfg: "30d-1pc-seo0"
    },
    {
      publicId: "LIC-G7H8J9K1L2M3",
      name: "Тестовый ПК",
      status: "EXPIRED",
      statusLabel: "EXPIRED",
      termShort: "Истекла: 20.11.2026",
      termDetail: "истекла 20.11.2026 (7 дн. назад)",
      nextChargeDate: "сразу после продления",
      features: { desktop: true, seo: false },
      source: "Перенесена от реселлера",
      note: "Резервная машина для тестов",
      autoRenew: false,
      autoRenewEligible: true,
      key: "PGF-5D2F-8G4H-1J6K-9L3M",
      keyStatus: "EXPIRED",
      rotationCounter: 2,
      devicesUsed: 1,
      devicesLimit: 1,
      renewCfg: "30d-1pc-seo0"
    },
    {
      publicId: "LIC-R4V6K8D2N9Q1",
      name: "Старый стенд #2",
      status: "REVOKED",
      statusLabel: "REVOKED",
      termShort: "Отозвана: 15.11.2026",
      termDetail: "отозвана 15.11.2026 (активация недоступна)",
      nextChargeDate: null,
      features: { desktop: true, seo: true },
      source: "Прямая покупка",
      note: "Аннулирована по обращению в поддержку #T-418",
      autoRenew: false,
      autoRenewEligible: false,
      key: "PGF-REV0-3X7Z-2C4V-8B1N",
      keyStatus: "REVOKED",
      rotationCounter: 1,
      devicesUsed: 0,
      devicesLimit: 2,
      renewCfg: null
    }
  ];

  const HELP_ARTICLES = [
    {
      title: "Как активировать ключ в Scenor Desktop",
      route: "/docs/activation",
      keywords: "активация ключ desktop handshake установка"
    },
    {
      title: "Ошибка KEY_REJECTED после замены ключа",
      route: "/wiki/error-key-rejected",
      keywords: "key_rejected ключ замена ошибка отклонён"
    },
    {
      title: "Ошибка NODE_LIMIT — превышен лимит устройств",
      route: "/wiki/error-node-limit",
      keywords: "node_limit устройства отвязка лимит слот"
    },
    {
      title: "Ошибка LEASE_EXPIRED и работа без сети (24 ч / 12 ч)",
      route: "/wiki/error-lease-expired",
      keywords: "lease_expired офлайн сеть проверка 24 12"
    },
    {
      title: "Перенос лицензии от реселлера в личный аккаунт",
      route: "/docs/reseller-transfer",
      keywords: "реселлер перенос код public id"
    }
  ];

  const ROUTE_PREVIEWS = {
    "/app": {
      title: "Главная кабинета",
      desc: "Сводка активных лицензий, последних счетов и быстрых ссылок на установщик Scenor."
    },
    "/app/billing": {
      title: "Баланс и счета",
      desc: "В Срезе 4 здесь отображаются основной и бонусный баланс, история проводок и выставленные ручные счета. В Срезе 3 — только список прямых ручных счетов."
    },
    "/app/referrals": {
      title: "Реферальная программа (Срез 4)",
      desc: "Реферальная ссылка, начисления бонусов 10% с оплат приглашённых клиентов и история начислений."
    },
    "/app/support": {
      title: "Поддержка Scenor",
      desc: "Создание обращения по лицензии. Передавайте оператору только Public ID (LIC-…), никогда не отправляйте лицензионный ключ."
    },
    "/app/downloads": {
      title: "Скачать Scenor Desktop",
      desc: "Официальный установщик Scenor для Windows x64 с проверкой контрольной суммы SHA-256 и списком изменений."
    },
    "/app/settings": {
      title: "Настройки аккаунта",
      desc: "Смена пароля, привязка официального Telegram-бота, 2FA и уведомления о продлении лицензий."
    },
    "/docs": {
      title: "Документация Scenor (публично)",
      desc: "Руководства по установке, активации ключа, настройке сценариев и прокси. Открыта всегда без авторизации."
    },
    "/docs/activation": {
      title: "Как активировать Scenor Desktop",
      desc: "Пошаговая инструкция: установите Scenor, вставьте ключ PGF-XXXX-XXXX-XXXX-XXXX в окне активации и дождитесь подтверждения."
    },
    "/wiki": {
      title: "Wiki и справочник ошибок (публично)",
      desc: "Разбор кодов ошибок KEY_REJECTED, NODE_LIMIT, LEASE_EXPIRED и TRIAL_LOCAL_DATA_TOO_OLD. Открыт всегда без авторизации."
    }
  };

  /* =========================================================================
     Состояние приложения
     ========================================================================= */
  const state = {
    licenses: INITIAL_LICENSES.map(function (item) {
      return Object.assign({}, item, {
        features: Object.assign({}, item.features)
      });
    }),
    slice: 4, // 4 = баланс + автопродление; 3 = прямой счёт без баланса и автопродления
    view: "list", // "list" | "detail"
    listState: "filled", // "filled" | "loading" | "empty" | "error"
    statusFilter: "ALL",
    searchQuery: "",
    selectedId: INITIAL_LICENSES[0].publicId,
    simulate409: false,
    forceClipboardFallback: false,
    isRotating: false,
    rotationSeq: 1,
    lastFocusedElement: null
  };

  /* =========================================================================
     Ссылки на DOM-узлы
     ========================================================================= */
  const els = {
    demoRoute: document.getElementById("demo-route-display"),
    sliceButtons: document.querySelectorAll("[data-slice]"),
    viewButtons: document.querySelectorAll("[data-view]"),
    listStateButtons: document.querySelectorAll("[data-list-state]"),
    toggle409: document.getElementById("toggle-conflict-409"),
    toggleClipboardFallback: document.getElementById("toggle-clipboard-fallback"),
    btnTestBadId: document.getElementById("btn-test-bad-id"),

    sidebar: document.getElementById("app-sidebar"),
    sidebarBackdrop: document.getElementById("sidebar-backdrop"),
    btnOpenSidebar: document.getElementById("btn-open-sidebar"),
    btnCloseSidebar: document.getElementById("btn-close-sidebar"),
    brandHomeLink: document.getElementById("brand-home-link"),
    navLicenses: document.getElementById("nav-licenses"),
    navLicensesCount: document.getElementById("nav-licenses-count"),
    navBillingLabel: document.getElementById("nav-billing-label"),
    navItemReferrals: document.getElementById("nav-item-referrals"),
    headerBalancePill: document.getElementById("header-balance-pill"),
    slice3Banner: document.getElementById("slice3-banner"),

    globalIdAlert: document.getElementById("global-id-alert"),
    globalIdAlertText: document.getElementById("global-id-alert-text"),
    btnDismissIdAlert: document.getElementById("btn-dismiss-id-alert"),

    viewList: document.getElementById("view-list"),
    viewDetail: document.getElementById("view-detail"),
    listTotalCount: document.getElementById("list-total-count"),
    listToolbar: document.getElementById("list-toolbar"),
    statusFilterTabs: document.querySelectorAll("[data-status-filter]"),
    searchInput: document.getElementById("license-search-input"),
    btnClearSearch: document.getElementById("btn-clear-search"),

    stateLoading: document.getElementById("state-loading"),
    stateEmpty: document.getElementById("state-empty"),
    stateError: document.getElementById("state-error"),
    stateFilled: document.getElementById("state-filled"),
    licenseListContainer: document.getElementById("license-list-container"),
    filterEmptyCard: document.getElementById("filter-empty-card"),
    filterEmptyMessage: document.getElementById("filter-empty-message"),
    btnResetFilters: document.getElementById("btn-reset-filters"),
    btnRetryLoad: document.getElementById("btn-retry-load"),

    btnTrialCta: document.getElementById("btn-trial-cta"),
    btnTransferCta: document.getElementById("btn-transfer-cta"),
    btnLogout: document.getElementById("btn-logout"),

    btnBackToList: document.getElementById("btn-back-to-list"),
    detailRouteBadge: document.getElementById("detail-route-badge"),
    detailNameView: document.getElementById("detail-name-view"),
    detailTitle: document.getElementById("detail-title"),
    btnEditName: document.getElementById("btn-edit-name"),
    detailNameForm: document.getElementById("detail-name-form"),
    inputEditName: document.getElementById("input-edit-name"),
    btnCancelName: document.getElementById("btn-cancel-name"),
    detailPublicId: document.getElementById("detail-public-id"),
    btnCopyPublicId: document.getElementById("btn-copy-public-id"),
    detailSource: document.getElementById("detail-source"),
    detailStatusBadge: document.getElementById("detail-status-badge"),
    detailNoteView: document.getElementById("detail-note-view"),
    detailNoteText: document.getElementById("detail-note-text"),
    btnEditNote: document.getElementById("btn-edit-note"),
    detailNoteForm: document.getElementById("detail-note-form"),
    inputEditNote: document.getElementById("input-edit-note"),
    btnCancelNote: document.getElementById("btn-cancel-note"),

    detailTerm: document.getElementById("detail-term"),
    detailEntitlements: document.getElementById("detail-entitlements"),
    detailDevicesLimit: document.getElementById("detail-devices-limit"),
    detailTrialBanner: document.getElementById("detail-trial-banner"),
    detailRevokedBanner: document.getElementById("detail-revoked-banner"),
    detailAutorenewSection: document.getElementById("detail-autorenew-section"),
    detailAutorenewPill: document.getElementById("detail-autorenew-pill"),
    detailAutorenewDesc: document.getElementById("detail-autorenew-desc"),
    btnToggleAutorenew: document.getElementById("btn-toggle-autorenew"),

    detailKeyStatusBadge: document.getElementById("detail-key-status-badge"),
    detailKeyRevision: document.getElementById("detail-key-revision"),
    keyRotatedBanner: document.getElementById("key-rotated-banner"),
    keyRotatedText: document.getElementById("key-rotated-text"),
    keyConflictBanner: document.getElementById("key-conflict-banner"),
    keyConflictText: document.getElementById("key-conflict-text"),
    keyClipboardFallbackBanner: document.getElementById("key-clipboard-fallback-banner"),
    detailKeyInput: document.getElementById("detail-key-input"),
    btnCopyKey: document.getElementById("btn-copy-key"),
    btnReplaceKey: document.getElementById("btn-replace-key"),

    actionDevices: document.getElementById("action-devices"),
    actionDevicesTitle: document.getElementById("action-devices-title"),
    actionRenew: document.getElementById("action-renew"),
    actionUpgrade: document.getElementById("action-upgrade"),
    actionSupportId: document.getElementById("action-support-id"),

    modalReplaceKey: document.getElementById("modal-replace-key"),
    modalReplaceLicenseName: document.getElementById("modal-replace-license-name"),
    modalReplacePublicId: document.getElementById("modal-replace-public-id"),
    modalReplaceDevices: document.getElementById("modal-replace-devices"),
    modalExpectedRev: document.getElementById("modal-expected-rev"),
    modalIdemKey: document.getElementById("modal-idem-key"),
    modalSimulate409: document.getElementById("modal-simulate-409"),
    btnConfirmReplace: document.getElementById("btn-confirm-replace"),
    btnCancelReplace: document.getElementById("btn-cancel-replace"),

    btnOpenHelpSearch: document.getElementById("btn-open-help-search"),
    modalHelpSearch: document.getElementById("modal-help-search"),
    helpSearchInput: document.getElementById("help-search-input"),
    helpResultsList: document.getElementById("help-results-list"),

    modalInfo: document.getElementById("modal-info"),
    modalInfoTitle: document.getElementById("modal-info-title"),
    modalInfoDesc: document.getElementById("modal-info-desc"),
    modalInfoRoute: document.getElementById("modal-info-route"),

    toastRegion: document.getElementById("toast-region")
  };

  /* =========================================================================
     Вспомогательные функции (строго без innerHTML)
     ========================================================================= */
  function createEl(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined && text !== null) node.textContent = String(text);
    return node;
  }

  function clearChildren(node) {
    while (node.firstChild) {
      node.removeChild(node.firstChild);
    }
  }

  function getLicenseById(publicId) {
    return state.licenses.find(function (lic) {
      return lic.publicId === publicId;
    }) || null;
  }

  function generateLicenseKey() {
    const alphabet = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";
    function block() {
      let out = "";
      for (let i = 0; i < 4; i += 1) {
        const idx = Math.floor(Math.random() * alphabet.length);
        out += alphabet.charAt(idx);
      }
      return out;
    }
    return "PGF-" + block() + "-" + block() + "-" + block() + "-" + block();
  }

  function showToast(message, variant) {
    while (els.toastRegion.children.length >= 2) {
      els.toastRegion.removeChild(els.toastRegion.firstChild);
    }
    const toast = createEl("div", "toast" + (variant ? " toast--" + variant : ""), message);
    els.toastRegion.appendChild(toast);
    window.setTimeout(function () {
      if (toast.parentNode) {
        toast.parentNode.removeChild(toast);
      }
    }, 3400);
  }

  function updateBrowserUrl(publicIdOrNull) {
    try {
      const url = new URL(window.location.href);
      if (publicIdOrNull) {
        url.searchParams.set("id", publicIdOrNull);
      } else {
        url.searchParams.delete("id");
      }
      window.history.replaceState({}, "", url.toString());
    } catch (_err) {
      // В некоторых окружениях file:// replaceState может быть ограничен — игнорируем безопасно.
    }
  }

  function openModal(modalEl) {
    state.lastFocusedElement = document.activeElement;
    modalEl.hidden = false;
    const focusable = modalEl.querySelector("input, button:not([disabled]), [tabindex]:not([tabindex='-1'])");
    if (focusable) focusable.focus();
  }

  function closeModal(modalEl) {
    modalEl.hidden = true;
    if (state.lastFocusedElement && typeof state.lastFocusedElement.focus === "function") {
      state.lastFocusedElement.focus();
    }
  }

  function showRouteInfo(route, customTitle, customDesc) {
    const info = ROUTE_PREVIEWS[route] || {
      title: customTitle || "Смежный экран Panel V2",
      desc: customDesc || "В реальной панели Panel V2 это действие открывает соответствующий маршрут."
    };
    els.modalInfoTitle.textContent = customTitle || info.title;
    els.modalInfoDesc.textContent = customDesc || info.desc;
    els.modalInfoRoute.textContent = "Канонический маршрут: " + route;
    openModal(els.modalInfo);
  }

  function copyTextWithFallback(text, options) {
    const opts = options || {};
    const useFallback = state.forceClipboardFallback || !navigator.clipboard || typeof navigator.clipboard.writeText !== "function";

    function runFallback() {
      if (opts.inputEl) {
        opts.inputEl.focus();
        opts.inputEl.select();
        if (typeof opts.inputEl.setSelectionRange === "function") {
          opts.inputEl.setSelectionRange(0, opts.inputEl.value.length);
        }
      } else if (opts.textNodeEl && window.getSelection) {
        const range = document.createRange();
        range.selectNodeContents(opts.textNodeEl);
        const sel = window.getSelection();
        sel.removeAllRanges();
        sel.addRange(range);
      }
      if (opts.fallbackBannerEl) {
        opts.fallbackBannerEl.hidden = false;
      }
      showToast(opts.fallbackToast || "Буфер недоступен — текст выделен, нажмите Ctrl+C", "warn");
    }

    if (useFallback) {
      runFallback();
      return;
    }

    navigator.clipboard.writeText(text).then(function () {
      if (opts.fallbackBannerEl) {
        opts.fallbackBannerEl.hidden = true;
      }
      showToast(opts.successToast || "Ключ скопирован", "ok");
    }).catch(function () {
      runFallback();
    });
  }

  /* =========================================================================
     Мобильное меню
     ========================================================================= */
  function setSidebarOpen(isOpen) {
    els.sidebar.classList.toggle("is-open", isOpen);
    els.sidebarBackdrop.hidden = !isOpen;
    els.btnOpenSidebar.setAttribute("aria-expanded", String(isOpen));
    if (isOpen) {
      els.btnCloseSidebar.focus();
    } else if (window.innerWidth <= 960) {
      els.btnOpenSidebar.focus();
    }
  }

  /* =========================================================================
     Рендеринг Среза 3 / Среза 4 и панели управления
     ========================================================================= */
  function syncDemoBarAndSlice() {
    const isSlice4 = state.slice === 4;

    els.sliceButtons.forEach(function (btn) {
      btn.setAttribute("aria-pressed", String(Number(btn.dataset.slice) === state.slice));
    });

    els.viewButtons.forEach(function (btn) {
      btn.setAttribute("aria-pressed", String(btn.dataset.view === state.view));
    });

    els.listStateButtons.forEach(function (btn) {
      btn.setAttribute("aria-pressed", String(btn.dataset.listState === state.listState));
    });

    els.headerBalancePill.hidden = !isSlice4;
    els.navItemReferrals.hidden = !isSlice4;
    els.navBillingLabel.textContent = isSlice4 ? "Баланс и счета" : "Счета";
    els.slice3Banner.hidden = isSlice4;

    if (state.view === "detail") {
      els.demoRoute.textContent = "/app/licenses/" + state.selectedId;
    } else {
      els.demoRoute.textContent = "/app/licenses";
    }
  }

  /* =========================================================================
     Рендеринг Экрана 1: Список «Мои лицензии» (/app/licenses)
     ========================================================================= */
  function buildEntitlementPills(features) {
    const wrap = createEl("div", "entitlement-pills");
    wrap.appendChild(createEl("span", "ent-pill", "✓ Desktop"));
    if (features.seo) {
      wrap.appendChild(createEl("span", "ent-pill", "✓ SEO на всю лицензию"));
    } else {
      wrap.appendChild(createEl("span", "ent-pill ent-pill--muted", "Без SEO"));
    }
    return wrap;
  }

  function renderLicenseCard(lic) {
    const card = createEl("article", "card license-card");
    card.dataset.publicId = lic.publicId;

    // Верхняя строка: название + Public ID + статус
    const top = createEl("div", "license-card__top");
    const titleGroup = createEl("div", "license-card__title-group");

    const titleLine = createEl("div", "license-card__title-line");
    const h2 = createEl("h2", "license-card__title", lic.name);
    const pid = createEl("code", "license-card__pid", lic.publicId);
    titleLine.appendChild(h2);
    titleLine.appendChild(pid);
    titleGroup.appendChild(titleLine);

    const meta = createEl("div", "license-card__meta");
    meta.appendChild(createEl("span", "", lic.termShort));
    meta.appendChild(createEl("span", "", "·"));
    meta.appendChild(buildEntitlementPills(lic.features));
    meta.appendChild(createEl("span", "", "·"));
    meta.appendChild(createEl("span", "", "Источник: " + lic.source));
    titleGroup.appendChild(meta);

    const statusBadge = createEl("span", "status-badge status-badge--" + lic.status, lic.statusLabel);
    top.appendChild(titleGroup);
    top.appendChild(statusBadge);
    card.appendChild(top);

    // Автопродление (строго только в Срезе 4 для подходящих лицензий)
    if (state.slice === 4 && lic.autoRenewEligible) {
      const arClass = lic.autoRenew ? "autorenew-pill autorenew-pill--on" : "autorenew-pill autorenew-pill--off";
      const arText = lic.autoRenew ? "● Автопродление включено" : "○ Автопродление выключено";
      card.appendChild(createEl("div", arClass, arText));
    }

    // Специальные пояснения для TRIAL и REVOKED
    if (lic.status === "TRIAL") {
      card.appendChild(
        createEl(
          "div",
          "license-card__notice license-card__notice--trial",
          "Пробный период: самостоятельная смена устройства на триале недоступна."
        )
      );
    } else if (lic.status === "REVOKED") {
      card.appendChild(
        createEl(
          "div",
          "license-card__notice license-card__notice--revoked",
          "Лицензия отозвана — активация и продление недоступны. При вопросах укажите Public ID в поддержке."
        )
      );
    }

    // Строка ключа (для ACTIVE и TRIAL — полный ключ + быстрая кнопка «Копировать»)
    if (lic.status === "ACTIVE" || lic.status === "TRIAL") {
      const keyRow = createEl("div", "license-card__key-row");
      keyRow.appendChild(createEl("span", "license-card__key-label", "Ключ:"));
      const keyValueEl = createEl("code", "license-card__key-value", lic.key);
      keyRow.appendChild(keyValueEl);

      const copyBtn = createEl("button", "btn btn--secondary btn--sm", "Копировать");
      copyBtn.type = "button";
      copyBtn.addEventListener("click", function () {
        copyTextWithFallback(lic.key, {
          textNodeEl: keyValueEl,
          successToast: "Ключ скопирован",
          fallbackToast: "Буфер недоступен — ключ выделен, нажмите Ctrl+C"
        });
      });
      keyRow.appendChild(copyBtn);
      card.appendChild(keyRow);
    }

    // Нижняя строка: устройства + кнопки действий
    const bottom = createEl("div", "license-card__bottom");
    const devWrap = createEl("div", "license-card__devices");
    devWrap.appendChild(document.createTextNode("Устройства: "));
    devWrap.appendChild(createEl("strong", "", lic.devicesUsed + " / " + lic.devicesLimit));
    bottom.appendChild(devWrap);

    const actions = createEl("div", "license-card__actions");

    if (lic.status === "EXPIRED") {
      const renewLink = createEl("a", "btn btn--primary btn--sm", "Продлить");
      renewLink.href = "../checkout/index.html?cfg=" + encodeURIComponent(lic.renewCfg || "30d-1pc-seo0") + "&renew=" + encodeURIComponent(lic.publicId);
      actions.appendChild(renewLink);
    }

    if (lic.status !== "REVOKED") {
      const devLink = createEl("a", "btn btn--secondary btn--sm", "Устройства →");
      devLink.href = "../devices/index.html?id=" + encodeURIComponent(lic.publicId);
      actions.appendChild(devLink);
    }

    const openBtn = createEl("button", "btn btn--primary btn--sm", "Открыть →");
    openBtn.type = "button";
    openBtn.addEventListener("click", function () {
      openDetailView(lic.publicId, true);
    });
    actions.appendChild(openBtn);

    bottom.appendChild(actions);
    card.appendChild(bottom);

    return card;
  }

  function renderListView() {
    els.viewList.hidden = false;
    els.viewDetail.hidden = true;

    const total = state.licenses.length;
    els.navLicensesCount.textContent = state.listState === "filled" ? String(total) : (state.listState === "empty" ? "0" : "…");
    els.listTotalCount.textContent = state.listState === "filled" ? String(total) : (state.listState === "empty" ? "0" : "—");

    // Показываем нужный блок матрицы состояний
    els.stateLoading.hidden = state.listState !== "loading";
    els.stateEmpty.hidden = state.listState !== "empty";
    els.stateError.hidden = state.listState !== "error";
    els.stateFilled.hidden = state.listState !== "filled";
    els.listToolbar.hidden = state.listState !== "filled";

    if (state.listState !== "filled") {
      return;
    }

    // Обновляем активный таб статуса
    els.statusFilterTabs.forEach(function (tab) {
      const isActive = tab.dataset.statusFilter === state.statusFilter;
      tab.classList.toggle("filter-tab--active", isActive);
      tab.setAttribute("aria-selected", String(isActive));
    });

    const queryRaw = state.searchQuery.trim();
    const queryLower = queryRaw.toLowerCase();
    els.btnClearSearch.hidden = queryRaw.length === 0;

    const filtered = state.licenses.filter(function (lic) {
      if (state.statusFilter !== "ALL" && lic.status !== state.statusFilter) {
        return false;
      }
      if (queryLower.length > 0) {
        const hayName = lic.name.toLowerCase();
        const hayId = lic.publicId.toLowerCase();
        return hayName.indexOf(queryLower) !== -1 || hayId.indexOf(queryLower) !== -1;
      }
      return true;
    });

    clearChildren(els.licenseListContainer);

    if (filtered.length === 0) {
      els.filterEmptyCard.hidden = false;
      if (queryRaw.length > 0) {
        // Строго через textContent — защита от DOM-XSS
        els.filterEmptyMessage.textContent = "По запросу «" + queryRaw + "» в выбранной категории лицензий не найдено.";
      } else {
        els.filterEmptyMessage.textContent = "В выбранном статусе лицензий нет.";
      }
      return;
    }

    els.filterEmptyCard.hidden = true;
    filtered.forEach(function (lic) {
      els.licenseListContainer.appendChild(renderLicenseCard(lic));
    });
  }

  /* =========================================================================
     Рендеринг Экрана 2: Карточка лицензии (/app/licenses/[id])
     ========================================================================= */
  function hideKeyBanners() {
    els.keyRotatedBanner.hidden = true;
    els.keyConflictBanner.hidden = true;
    els.keyClipboardFallbackBanner.hidden = true;
  }

  function renderDetailView() {
    const lic = getLicenseById(state.selectedId) || state.licenses[0];
    state.selectedId = lic.publicId;

    els.viewList.hidden = true;
    els.viewDetail.hidden = false;

    els.detailRouteBadge.textContent = "/app/licenses/" + lic.publicId;
    els.detailTitle.textContent = lic.name;
    els.detailPublicId.textContent = lic.publicId;
    els.detailSource.textContent = lic.source;

    els.detailStatusBadge.className = "status-badge status-badge--" + lic.status;
    els.detailStatusBadge.textContent = "Статус: " + lic.statusLabel;

    // Сбрасываем открытые формы редактирования при рендере
    els.detailNameView.hidden = false;
    els.detailNameForm.hidden = true;
    els.detailNoteView.hidden = false;
    els.detailNoteForm.hidden = true;

    els.detailNoteText.textContent = lic.note ? "«" + lic.note + "»" : "Не задано";

    els.detailTerm.textContent = lic.termDetail;
    clearChildren(els.detailEntitlements);
    els.detailEntitlements.appendChild(buildEntitlementPills(lic.features));
    els.detailDevicesLimit.textContent = lic.devicesUsed + " / " + lic.devicesLimit;

    els.detailTrialBanner.hidden = lic.status !== "TRIAL";
    els.detailRevokedBanner.hidden = lic.status !== "REVOKED";

    // Автопродление: показывается ТОЛЬКО в Срезе 4
    if (state.slice === 4 && lic.autoRenewEligible) {
      els.detailAutorenewSection.hidden = false;
      if (lic.autoRenew) {
        els.detailAutorenewPill.className = "autorenew-pill autorenew-pill--on";
        els.detailAutorenewPill.textContent = "● Автопродление включено";
        els.detailAutorenewDesc.textContent = "Следующее списание: " + lic.nextChargeDate + " с внутреннего баланса по актуальной цене.";
        els.btnToggleAutorenew.textContent = "Выключить";
      } else {
        els.detailAutorenewPill.className = "autorenew-pill autorenew-pill--off";
        els.detailAutorenewPill.textContent = "○ Автопродление выключено";
        els.detailAutorenewDesc.textContent = "Автопродление отключено. После окончания срока лицензию нужно продлить вручную.";
        els.btnToggleAutorenew.textContent = "Включить";
      }
    } else {
      els.detailAutorenewSection.hidden = true;
    }

    // Текущий лицензионный ключ (ТЗ 70 / §4.3)
    els.detailKeyStatusBadge.className = "status-badge status-badge--" + lic.keyStatus;
    els.detailKeyStatusBadge.textContent = "Ключ: " + lic.keyStatus;
    els.detailKeyRevision.textContent = "Ревизия #" + lic.rotationCounter;
    els.detailKeyInput.value = lic.key;

    const isRevoked = lic.status === "REVOKED";
    els.btnCopyKey.disabled = isRevoked;
    els.btnReplaceKey.disabled = isRevoked;

    // Действия по лицензии
    els.actionDevicesTitle.textContent = "Устройства этой лицензии (" + lic.devicesUsed + " / " + lic.devicesLimit + ") →";
    els.actionSupportId.textContent = lic.publicId;
    els.actionRenew.hidden = isRevoked;
    var renewTitleEl = els.actionRenew.querySelector(".action-tile__title");
    var renewDescEl = els.actionRenew.querySelector(".action-tile__desc");
    if (lic.status === "TRIAL") {
      if (renewTitleEl) renewTitleEl.textContent = "Купить платную лицензию →";
      if (renewDescEl) renewDescEl.textContent = "Переход с пробного периода на платную подписку с выбором ПК и SEO";
      els.actionRenew.setAttribute("href", "../checkout/index.html?cfg=30d-1pc-seo0");
    } else {
      if (renewTitleEl) renewTitleEl.textContent = "Продлить лицензию →";
      if (renewDescEl) renewDescEl.textContent = "Можно изменить доп. устройства и модуль SEO со следующего периода";
      els.actionRenew.setAttribute("href", "../checkout/index.html?cfg=" + encodeURIComponent(lic.renewCfg || "30d-1pc-seo0") + "&renew=" + encodeURIComponent(lic.publicId));
    }
    els.actionUpgrade.hidden = lic.status !== "ACTIVE";
  }

  function renderAll() {
    syncDemoBarAndSlice();
    if (state.view === "detail") {
      renderDetailView();
    } else {
      renderListView();
    }
  }

  function openListView(syncUrl) {
    state.view = "list";
    hideKeyBanners();
    if (syncUrl) updateBrowserUrl(null);
    renderAll();
    window.scrollTo(0, 0);
  }

  function openDetailView(publicId, syncUrl) {
    const lic = getLicenseById(publicId);
    if (!lic) {
      showUnknownIdAlert(publicId);
      state.view = "list";
      renderAll();
      window.scrollTo(0, 0);
      return;
    }
    els.globalIdAlert.hidden = true;
    state.selectedId = lic.publicId;
    state.view = "detail";
    hideKeyBanners();
    if (syncUrl) updateBrowserUrl(lic.publicId);
    renderAll();
    window.scrollTo(0, 0);
  }

  function showUnknownIdAlert(rawId) {
    const safeDisplay = String(rawId || "").slice(0, 120);
    // Строго через textContent — защита от DOM-XSS при malformed ?id=...
    els.globalIdAlertText.textContent =
      "Лицензия с идентификатором «" + safeDisplay + "» не найдена или идентификатор некорректен. Проверьте Public ID или выберите лицензию из списка ниже.";
    els.globalIdAlert.hidden = false;
  }

  /* =========================================================================
     Обработка URL ?id=... при загрузке
     ========================================================================= */
  function applyUrlParams() {
    try {
      const params = new URLSearchParams(window.location.search);
      const sliceParam = params.get("slice");
      if (sliceParam === "3" || sliceParam === "4") {
        state.slice = Number(sliceParam);
      }
      const listStateParam = params.get("state");
      if (["filled", "loading", "empty", "error"].indexOf(listStateParam) !== -1) {
        state.listState = listStateParam;
      }
      const idParam = params.get("id");
      if (idParam !== null && idParam !== "") {
        const found = getLicenseById(idParam);
        if (found) {
          state.selectedId = found.publicId;
          state.view = "detail";
          els.globalIdAlert.hidden = true;
        } else {
          state.view = "list";
          showUnknownIdAlert(idParam);
        }
      }
    } catch (_err) {
      // Безопасный fallback к списку
    }
  }

  /* =========================================================================
     Обработчики событий
     ========================================================================= */
  function bindEvents() {
    // Панель демо-стенда
    els.sliceButtons.forEach(function (btn) {
      btn.addEventListener("click", function () {
        state.slice = Number(btn.dataset.slice);
        renderAll();
      });
    });

    els.viewButtons.forEach(function (btn) {
      btn.addEventListener("click", function () {
        if (btn.dataset.view === "detail") {
          openDetailView(state.selectedId, true);
        } else {
          openListView(true);
        }
      });
    });

    els.listStateButtons.forEach(function (btn) {
      btn.addEventListener("click", function () {
        state.listState = btn.dataset.listState;
        state.view = "list";
        els.globalIdAlert.hidden = true;
        updateBrowserUrl(null);
        renderAll();
      });
    });

    els.toggle409.addEventListener("change", function () {
      state.simulate409 = els.toggle409.checked;
      els.modalSimulate409.checked = state.simulate409;
    });

    els.toggleClipboardFallback.addEventListener("change", function () {
      state.forceClipboardFallback = els.toggleClipboardFallback.checked;
    });

    els.btnTestBadId.addEventListener("click", function () {
      const payload = "<script>alert('xss')</script>";
      openDetailView(payload, false);
      showToast("Проверен безопасный вывод malformed ?id=", "ok");
    });

    els.btnDismissIdAlert.addEventListener("click", function () {
      els.globalIdAlert.hidden = true;
      openListView(true);
    });

    // Мобильное меню
    els.btnOpenSidebar.addEventListener("click", function () {
      setSidebarOpen(true);
    });
    els.btnCloseSidebar.addEventListener("click", function () {
      setSidebarOpen(false);
    });
    els.sidebarBackdrop.addEventListener("click", function () {
      setSidebarOpen(false);
    });

    // Навигация в сайдбаре и топбаре
    els.brandHomeLink.addEventListener("click", function (evt) {
      evt.preventDefault();
      openListView(true);
      if (window.innerWidth <= 960) setSidebarOpen(false);
    });

    document.querySelectorAll("[data-nav-route]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        const route = btn.dataset.navRoute;
        if (route === "/app/licenses") {
          openListView(true);
        } else if (route === "/app/billing") {
          window.location.href = "../billing/index.html";
        } else {
          showRouteInfo(route);
        }
        if (window.innerWidth <= 960) setSidebarOpen(false);
      });
    });

    els.btnLogout.addEventListener("click", function () {
      showToast("Демо-режим: выход из аккаунта перенаправляет на /login", "ok");
    });

    // Верхние CTA списка и пустого состояния
    function handleTrialClick() {
      showRouteInfo(
        "/app/trial",
        "Пробный период Scenor",
        "Двухэтапная проверка триала (Срез 4): выдаёт временный ключ на 1 ПК без самостоятельной смены устройства."
      );
    }

    function handleTransferClick() {
      showRouteInfo(
        "/app/licenses/transfer",
        "Перенос лицензии от реселлера",
        "Необратимый перенос лицензии в ваш аккаунт по отдельному коду подтверждения права покупателя (отдельно от лицензионного ключа)."
      );
    }

    els.btnTrialCta.addEventListener("click", handleTrialClick);
    els.btnTransferCta.addEventListener("click", handleTransferClick);
    document.querySelectorAll("[data-action='trial']").forEach(function (b) {
      b.addEventListener("click", handleTrialClick);
    });
    document.querySelectorAll("[data-action='transfer']").forEach(function (b) {
      b.addEventListener("click", handleTransferClick);
    });

    // Фильтры и поиск списка
    els.statusFilterTabs.forEach(function (tab) {
      tab.addEventListener("click", function () {
        state.statusFilter = tab.dataset.statusFilter;
        renderListView();
      });
    });

    els.searchInput.addEventListener("input", function () {
      state.searchQuery = els.searchInput.value;
      renderListView();
    });

    els.btnClearSearch.addEventListener("click", function () {
      state.searchQuery = "";
      els.searchInput.value = "";
      renderListView();
      els.searchInput.focus();
    });

    els.btnResetFilters.addEventListener("click", function () {
      state.statusFilter = "ALL";
      state.searchQuery = "";
      els.searchInput.value = "";
      renderListView();
    });

    // Кнопка «Повторить» в состоянии ошибки
    els.btnRetryLoad.addEventListener("click", function () {
      state.listState = "loading";
      renderAll();
      window.setTimeout(function () {
        state.listState = "filled";
        renderAll();
        showToast("Список лицензий загружен", "ok");
      }, 450);
    });

    // Карточка лицензии: Назад
    els.btnBackToList.addEventListener("click", function () {
      openListView(true);
    });

    // Карточка: копирование Public ID
    els.btnCopyPublicId.addEventListener("click", function () {
      const lic = getLicenseById(state.selectedId);
      if (!lic) return;
      copyTextWithFallback(lic.publicId, {
        textNodeEl: els.detailPublicId,
        successToast: "Public ID скопирован: " + lic.publicId,
        fallbackToast: "Public ID выделен — нажмите Ctrl+C"
      });
    });

    // Карточка: редактирование названия на месте
    els.btnEditName.addEventListener("click", function () {
      const lic = getLicenseById(state.selectedId);
      if (!lic) return;
      els.inputEditName.value = lic.name;
      els.detailNameView.hidden = true;
      els.detailNameForm.hidden = false;
      els.inputEditName.focus();
      els.inputEditName.select();
    });

    els.btnCancelName.addEventListener("click", function () {
      els.detailNameForm.hidden = true;
      els.detailNameView.hidden = false;
      els.btnEditName.focus();
    });

    els.detailNameForm.addEventListener("submit", function (evt) {
      evt.preventDefault();
      const lic = getLicenseById(state.selectedId);
      if (!lic) return;
      const nextName = els.inputEditName.value.trim();
      if (!nextName) {
        showToast("Введите название лицензии", "warn");
        els.inputEditName.focus();
        return;
      }
      lic.name = nextName;
      els.detailTitle.textContent = lic.name;
      els.detailNameForm.hidden = true;
      els.detailNameView.hidden = false;
      els.btnEditName.focus();
      showToast("Название лицензии сохранено", "ok");
    });

    // Карточка: редактирование примечания на месте
    els.btnEditNote.addEventListener("click", function () {
      const lic = getLicenseById(state.selectedId);
      if (!lic) return;
      els.inputEditNote.value = lic.note || "";
      els.detailNoteView.hidden = true;
      els.detailNoteForm.hidden = false;
      els.inputEditNote.focus();
    });

    els.btnCancelNote.addEventListener("click", function () {
      els.detailNoteForm.hidden = true;
      els.detailNoteView.hidden = false;
      els.btnEditNote.focus();
    });

    els.detailNoteForm.addEventListener("submit", function (evt) {
      evt.preventDefault();
      const lic = getLicenseById(state.selectedId);
      if (!lic) return;
      lic.note = els.inputEditNote.value.trim();
      els.detailNoteText.textContent = lic.note ? "«" + lic.note + "»" : "Не задано";
      els.detailNoteForm.hidden = true;
      els.detailNoteView.hidden = false;
      els.btnEditNote.focus();
      showToast("Личное примечание сохранено", "ok");
    });

    // Карточка: переключение автопродления (Срез 4)
    els.btnToggleAutorenew.addEventListener("click", function () {
      const lic = getLicenseById(state.selectedId);
      if (!lic || state.slice !== 4 || !lic.autoRenewEligible) return;
      lic.autoRenew = !lic.autoRenew;
      renderDetailView();
      showToast(
        lic.autoRenew ? "Автопродление включено" : "Автопродление выключено",
        "ok"
      );
    });

    // Карточка: копирование ключа (тост + fallback)
    els.btnCopyKey.addEventListener("click", function () {
      const lic = getLicenseById(state.selectedId);
      if (!lic || lic.status === "REVOKED") return;
      copyTextWithFallback(lic.key, {
        inputEl: els.detailKeyInput,
        fallbackBannerEl: els.keyClipboardFallbackBanner,
        successToast: "Ключ скопирован",
        fallbackToast: "Буфер недоступен — ключ выделен, нажмите Ctrl+C"
      });
    });

    // Карточка: открытие модалки замены ключа
    els.btnReplaceKey.addEventListener("click", function () {
      const lic = getLicenseById(state.selectedId);
      if (!lic || lic.status === "REVOKED") return;
      els.modalReplaceLicenseName.textContent = lic.name;
      els.modalReplacePublicId.textContent = lic.publicId;
      els.modalReplaceDevices.textContent = lic.devicesUsed + " / " + lic.devicesLimit;
      els.modalExpectedRev.textContent = String(lic.rotationCounter);
      els.modalIdemKey.textContent = "rot-" + lic.publicId.slice(-6).toLowerCase() + "-" + String(state.rotationSeq).padStart(4, "0");
      els.modalSimulate409.checked = state.simulate409;
      els.btnConfirmReplace.disabled = false;
      els.btnConfirmReplace.textContent = "Заменить ключ";
      openModal(els.modalReplaceKey);
    });

    els.modalSimulate409.addEventListener("change", function () {
      state.simulate409 = els.modalSimulate409.checked;
      els.toggle409.checked = state.simulate409;
    });

    // Карточка: подтверждение замены ключа (защита от двойного нажатия + 409 REVISION_CONFLICT)
    els.btnConfirmReplace.addEventListener("click", function () {
      if (state.isRotating) return;
      const lic = getLicenseById(state.selectedId);
      if (!lic) return;

      state.isRotating = true;
      els.btnConfirmReplace.disabled = true;
      els.btnCancelReplace.disabled = true;
      els.btnConfirmReplace.textContent = "Обновление ключа…";

      window.setTimeout(function () {
        state.isRotating = false;
        els.btnConfirmReplace.disabled = false;
        els.btnCancelReplace.disabled = false;
        els.btnConfirmReplace.textContent = "Заменить ключ";
        closeModal(els.modalReplaceKey);
        hideKeyBanners();

        state.rotationSeq += 1;

        if (state.simulate409) {
          // Сценарий 409 REVISION_CONFLICT: сервер уже обновил ключ в другой сессии → автообновление карточки
          const serverRev = lic.rotationCounter + 1;
          const serverKey = generateLicenseKey();
          lic.rotationCounter = serverRev;
          lic.key = serverKey;

          renderDetailView();
          els.keyConflictText.textContent =
            "Ключ уже был обновлён в другой вкладке или администратором (ожидалась ревизия #" +
            (serverRev - 1) +
            ", актуальная ревизия #" +
            serverRev +
            "). Карточка автоматически обновлена до текущего ключа.";
          els.keyConflictBanner.hidden = false;
          showToast("409 REVISION_CONFLICT — показан актуальный ключ (ревизия #" + serverRev + ")", "err");
          return;
        }

        // Успешная атомарная замена ключа на месте
        lic.rotationCounter += 1;
        lic.key = generateLicenseKey();
        renderDetailView();
        els.keyRotatedText.textContent =
          "Выпущен новый ключ (ревизия #" +
          lic.rotationCounter +
          "). Старый ключ немедленно отклонён сервером; срок действия и устройства (" +
          lic.devicesUsed + " / " + lic.devicesLimit +
          ") сохранены.";
        els.keyRotatedBanner.hidden = false;
        showToast("Ключ заменён на месте", "ok");
      }, 420);
    });

    // Карточка: плитки действий (переход на экран устройств #619 по решению владельца)
    els.actionDevices.addEventListener("click", function () {
      const lic = getLicenseById(state.selectedId);
      if (!lic) return;
      window.location.href = "../devices/index.html?id=" + encodeURIComponent(lic.publicId);
    });

    els.actionRenew.addEventListener("click", function (evt) {
      evt.preventDefault();
      const lic = getLicenseById(state.selectedId);
      if (!lic || lic.status === "REVOKED") return;
      if (lic.status === "TRIAL") {
        window.location.href = "../checkout/index.html?cfg=30d-1pc-seo0";
        return;
      }
      window.location.href = "../checkout/index.html?cfg=" + encodeURIComponent(lic.renewCfg || "30d-1pc-seo0") + "&renew=" + encodeURIComponent(lic.publicId);
    });

    els.actionUpgrade.addEventListener("click", function () {
      const lic = getLicenseById(state.selectedId);
      if (!lic) return;
      window.location.href = "../checkout/index.html?upgrade=" + encodeURIComponent(lic.publicId);
    });

    // Поиск помощи (Ctrl+K)
    function renderHelpResults(query) {
      const q = String(query || "").trim().toLowerCase();
      const matches = HELP_ARTICLES.filter(function (art) {
        if (!q) return true;
        return art.title.toLowerCase().indexOf(q) !== -1 || art.keywords.indexOf(q) !== -1 || art.route.indexOf(q) !== -1;
      });
      clearChildren(els.helpResultsList);
      if (matches.length === 0) {
        els.helpResultsList.appendChild(createEl("p", "modal__hint", "По запросу «" + query.trim() + "» статей не найдено."));
        return;
      }
      matches.forEach(function (art) {
        const btn = createEl("button", "help-result-item");
        btn.type = "button";
        btn.appendChild(createEl("span", "help-result-item__title", art.title));
        btn.appendChild(createEl("span", "help-result-item__route mono", art.route));
        btn.addEventListener("click", function () {
          closeModal(els.modalHelpSearch);
          showRouteInfo(art.route, art.title, "Публичная статья справки Scenor (доступна без авторизации).");
        });
        els.helpResultsList.appendChild(btn);
      });
    }

    els.btnOpenHelpSearch.addEventListener("click", function () {
      els.helpSearchInput.value = "";
      renderHelpResults("");
      openModal(els.modalHelpSearch);
    });

    els.helpSearchInput.addEventListener("input", function () {
      renderHelpResults(els.helpSearchInput.value);
    });

    // Закрытие модалок по кнопкам и клику по фону
    document.querySelectorAll("[data-close-modal]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        const modal = document.getElementById(btn.dataset.closeModal);
        if (modal) closeModal(modal);
      });
    });

    [els.modalReplaceKey, els.modalHelpSearch, els.modalInfo].forEach(function (backdrop) {
      backdrop.addEventListener("click", function (evt) {
        if (evt.target === backdrop && !state.isRotating) {
          closeModal(backdrop);
        }
      });
    });

    // Глобальные клавиши: Escape и Ctrl+K / Cmd+K
    document.addEventListener("keydown", function (evt) {
      if ((evt.ctrlKey || evt.metaKey) && evt.key.toLowerCase() === "k") {
        evt.preventDefault();
        els.helpSearchInput.value = "";
        renderHelpResults("");
        openModal(els.modalHelpSearch);
        return;
      }
      if (evt.key === "Escape") {
        if (!els.modalReplaceKey.hidden && !state.isRotating) {
          closeModal(els.modalReplaceKey);
        } else if (!els.modalHelpSearch.hidden) {
          closeModal(els.modalHelpSearch);
        } else if (!els.modalInfo.hidden) {
          closeModal(els.modalInfo);
        } else if (els.sidebar.classList.contains("is-open")) {
          setSidebarOpen(false);
        }
      }
    });
  }

  /* =========================================================================
     Инициализация
     ========================================================================= */
  applyUrlParams();
  bindEvents();
  renderAll();
})();
