(function () {
  "use strict";

  /* =========================================================================
     Scenor — Экран «Устройства лицензии» (/app/licenses/[id]/devices, #619)
     Строго без innerHTML / insertAdjacentHTML / eval / document.write.
     Все динамические строки и URL-параметры выводятся через textContent.
     ========================================================================= */

  const PAGE_LIMIT = 20;

  const EVENT_META = {
    BIND: { label: "Привязка", tagClass: "event-tag--bind" },
    UNBIND_CLIENT: { label: "Отвязка (клиент)", tagClass: "event-tag--unbind-client" },
    LIMIT_REDUCTION: { label: "Снижение лимита", tagClass: "event-tag--limit-reduction" },
    ADMIN: { label: "Администратор", tagClass: "event-tag--admin" }
  };

  const HELP_ARTICLES = [
    {
      title: "Ошибка NODE_LIMIT — превышен лимит устройств и правило Q-DEV-1",
      route: "/wiki/error-node-limit",
      keywords: "node_limit устройства отвязка лимит слот q-dev-1 снижение"
    },
    {
      title: "Политика офлайн-допуска 24 ч / 12 ч и ошибка LEASE_EXPIRED",
      route: "/wiki/error-lease-expired",
      keywords: "lease_expired 24 12 офлайн допуск проверка сеть"
    },
    {
      title: "Как активировать ключ в Scenor Desktop",
      route: "/docs/activation",
      keywords: "активация ключ desktop handshake установка пусто"
    },
    {
      title: "Лимит 3 отвязки за 30 дней (429 UNBIND_LIMIT_EXCEEDED)",
      route: "/wiki/error-unbind-limit",
      keywords: "429 unbind_limit_exceeded квота 30 дней поддержка сброс"
    },
    {
      title: "Ограничения пробного периода (403 TRIAL_UNBIND_FORBIDDEN)",
      route: "/wiki/error-trial-unbind",
      keywords: "403 trial триал смена устройства запрещено"
    }
  ];

  const ROUTE_PREVIEWS = {
    "/app": {
      title: "Главная кабинета (/app)",
      desc: "Сводка активных лицензий, последние уведомления и быстрые действия клиента."
    },
    "/app/billing": {
      title: "Баланс и счета (/app/billing)",
      desc: "Просмотр внутреннего баланса (основной и бонусный в Срезе 4) и история ручных счетов."
    },
    "/app/referrals": {
      title: "Реферальная программа (/app/referrals)",
      desc: "Реферальная ссылка, начисления бонусов и история приглашений (доступно с Среза 4)."
    },
    "/app/support": {
      title: "Поддержка (/app/support)",
      desc: "Создание обращения по Public ID лицензии (например, для индивидуального сброса счётчика отвязок администратором). Никогда не передавайте в тикет лицензионный ключ PGF-…."
    },
    "/app/downloads": {
      title: "Скачать Scenor (/app/downloads)",
      desc: "Актуальный дистрибутив Scenor Desktop для Windows x64 и контрольная сумма SHA-256."
    },
    "/app/settings": {
      title: "Настройки аккаунта (/app/settings)",
      desc: "Привязка официального Telegram-бота, 2FA и уведомления об отвязках и продлении."
    },
    "/docs": {
      title: "Документация (/docs)",
      desc: "Публичное руководство пользователя Scenor — всегда открыто без авторизации."
    },
    "/docs/activation": {
      title: "Инструкция по активации (/docs/activation)",
      desc: "Пошаговый ввод ключа PGF-… в Scenor Desktop (Windows x64) и первая онлайн-проверка handshake."
    },
    "/wiki": {
      title: "Wiki и коды ошибок (/wiki)",
      desc: "Публичный справочник симптомов и решений ошибок Desktop и веб-панели (NODE_LIMIT, LEASE_EXPIRED, KEY_REJECTED)."
    },
    "/wiki/error-lease-expired": {
      title: "Политика 24 ч / 12 ч и LEASE_EXPIRED (/wiki/error-lease-expired)",
      desc: "При старте Scenor делает немедленный handshake, далее проверяет лицензию каждые 12 ч. Подписанный офлайн-допуск действует до 24 ч (не дольше срока подписки). После отвязки слот освобождается сразу, а старый ПК остановится на ближайшей проверке (≤ 12 ч) или по истечении допуска (≤ 24 ч)."
    },
    "/wiki/error-node-limit": {
      title: "Ошибка NODE_LIMIT (/wiki/error-node-limit)",
      desc: "Возникает, когда число привязанных ПК превышает лимит лицензии (например, 3 из 1 после снижения тарифа). Отвяжите лишние устройства — при NODE_LIMIT квота 3/30 дн. не расходуется (Q-DEV-1)."
    },
    "/wiki/error-unbind-limit": {
      title: "429 UNBIND_LIMIT_EXCEEDED (/wiki/error-unbind-limit)",
      desc: "За последние скользящие 30 дней уже выполнено 3 самостоятельные отвязки. Дождитесь освобождения ближайшего слота квоты или обратитесь в поддержку с Public ID лицензии для индивидуального сброса."
    },
    "/wiki/error-trial-unbind": {
      title: "403 TRIAL_UNBIND_FORBIDDEN (/wiki/error-trial-unbind)",
      desc: "На пробной лицензии самостоятельная отвязка устройства заблокирована. Оформите платную лицензию для управления слотами или напишите в поддержку."
    }
  };

  function pad2(n) {
    return String(n).padStart(2, "0");
  }

  function makeCursor(isoTimestamp, uuid) {
    const raw = "v2|" + isoTimestamp + "|" + uuid;
    try {
      return btoa(raw).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
    } catch (_) {
      return raw;
    }
  }

  function buildRichHistory(publicId) {
    const baseEntries = [
      {
        id: "e1000028-0000-4000-8000-000000000028",
        iso: "2026-11-20T14:12:08.412000Z",
        dateText: "20.11.2026 14:12",
        type: "UNBIND_CLIENT",
        deviceId: "PC-77aa88bb",
        comment: "Слот освобождён; уведомление отправлено в Telegram"
      },
      {
        id: "e1000027-0000-4000-8000-000000000027",
        iso: "2026-11-15T09:00:14.105000Z",
        dateText: "15.11.2026 09:00",
        type: "BIND",
        deviceId: "PC-9f8e7d6c",
        comment: "Успешный handshake (pgF 0.1.0, Windows x64)"
      },
      {
        id: "e1000026-0000-4000-8000-000000000026",
        iso: "2026-11-01T10:25:42.881000Z",
        dateText: "01.11.2026 10:25",
        type: "BIND",
        deviceId: "PC-a1b2c3d4",
        comment: "Первичная активация ключа в Scenor Desktop"
      },
      {
        id: "e1000025-0000-4000-8000-000000000025",
        iso: "2026-10-28T18:40:11.204000Z",
        dateText: "28.10.2026 18:40",
        type: "ADMIN",
        deviceId: "PC-31cc44dd",
        comment: "Сброс счётчика отвязок по тикету #T-392 (администратор)"
      },
      {
        id: "e1000024-0000-4000-8000-000000000024",
        iso: "2026-10-22T12:15:09.000000Z",
        dateText: "22.10.2026 12:15",
        type: "LIMIT_REDUCTION",
        deviceId: "PC-44bb22aa",
        comment: "Автоотвязка на границе периода (квота 3/30 дн. не списана, Q-DEV-1)"
      },
      {
        id: "e1000023-0000-4000-8000-000000000023",
        iso: "2026-10-19T16:04:33.512000Z",
        dateText: "19.10.2026 16:04",
        type: "BIND",
        deviceId: "PC-77aa88bb",
        comment: "Успешный handshake (pgF 0.1.0)"
      }
    ];

    const extraTemplates = [
      { type: "BIND", deviceId: "PC-44bb22aa", comment: "Успешный handshake (pgF 0.1.0)" },
      { type: "UNBIND_CLIENT", deviceId: "PC-19ef20ab", comment: "Слот освобождён клиентом" },
      { type: "BIND", deviceId: "PC-19ef20ab", comment: "Успешный handshake (pgF 0.1.0)" },
      { type: "ADMIN", deviceId: "PC-08cd12ef", comment: "Отвязка администратором по запросу #T-340" },
      { type: "BIND", deviceId: "PC-08cd12ef", comment: "Первичная активация на сервере стенда" },
      { type: "LIMIT_REDUCTION", deviceId: "PC-62aa90bc", comment: "Вынужденная отвязка при NODE_LIMIT (Q-DEV-1)" },
      { type: "BIND", deviceId: "PC-62aa90bc", comment: "Успешный handshake (pgF 0.0.9)" },
      { type: "UNBIND_CLIENT", deviceId: "PC-50de71fa", comment: "Перенос на новый рабочий ПК" }
    ];

    const entries = baseEntries.slice();
    for (let i = 0; i < 22; i += 1) {
      const tpl = extraTemplates[i % extraTemplates.length];
      const day = Math.max(1, 18 - Math.floor(i / 2));
      const month = i < 16 ? 10 : 9;
      const hour = (9 + (i * 3) % 12);
      const min = (10 + (i * 7) % 45);
      const seq = 22 - i;
      entries.push({
        id: "e10000" + pad2(seq) + "-0000-4000-8000-0000000000" + pad2(seq),
        iso: "2026-" + pad2(month) + "-" + pad2(day) + "T" + pad2(hour) + ":" + pad2(min) + ":00.000000Z",
        dateText: pad2(day) + "." + pad2(month) + ".2026 " + pad2(hour) + ":" + pad2(min),
        type: tpl.type,
        deviceId: tpl.deviceId + (i > 7 ? "-" + (i % 4) : ""),
        comment: tpl.comment + " (" + publicId + ")"
      });
    }
    return entries;
  }

  function createInitialScenarios() {
    return {
      active: {
        scenarioKey: "active",
        publicId: "LIC-A1B2C3D4E5F6",
        name: "Рабочая ферма #1",
        status: "ACTIVE",
        termText: "Действует до 25.12.2026 (осталось 28 дн.)",
        rightsText: "Права: Desktop, SEO",
        devicesLimit: 3,
        quotaUsed: 1,
        quotaLimit: 3,
        nextQuotaReleaseDate: "20.12.2026",
        nextQuotaReleaseNote: "отвязка от 20.11.2026",
        downgradeWarning: null,
        nodeLimitActive: false,
        nodeLimitRestored: false,
        devices: [
          {
            id: "PC-a1b2c3d4",
            appVersion: "pgF 0.1.0",
            boundAt: "01.11.2026",
            lastSeen: "2 ч назад",
            leaseUntil: "27.11.2026 08:15",
            os: "Windows 11 x64"
          },
          {
            id: "PC-9f8e7d6c",
            appVersion: "pgF 0.1.0",
            boundAt: "15.11.2026",
            lastSeen: "5 ч назад",
            leaseUntil: "27.11.2026 05:10",
            os: "Windows Server 2022"
          }
        ],
        history: buildRichHistory("LIC-A1B2C3D4E5F6")
      },

      limit429: {
        scenarioKey: "limit429",
        publicId: "LIC-A1B2C3D4E5F6",
        name: "Рабочая ферма #1",
        status: "ACTIVE",
        termText: "Действует до 25.12.2026 (осталось 28 дн.)",
        rightsText: "Права: Desktop, SEO",
        devicesLimit: 3,
        quotaUsed: 3,
        quotaLimit: 3,
        nextQuotaReleaseDate: "05.12.2026",
        nextQuotaReleaseNote: "самая ранняя из 3 отвязок — 05.11.2026",
        downgradeWarning: null,
        nodeLimitActive: false,
        nodeLimitRestored: false,
        devices: [
          {
            id: "PC-a1b2c3d4",
            appVersion: "pgF 0.1.0",
            boundAt: "01.11.2026",
            lastSeen: "1 ч назад",
            leaseUntil: "27.11.2026 09:15",
            os: "Windows 11 x64"
          },
          {
            id: "PC-9f8e7d6c",
            appVersion: "pgF 0.1.0",
            boundAt: "15.11.2026",
            lastSeen: "4 ч назад",
            leaseUntil: "27.11.2026 06:10",
            os: "Windows Server 2022"
          }
        ],
        history: [
          {
            id: "e4290003-0000-4000-8000-000000000003",
            iso: "2026-11-24T17:30:00.000000Z",
            dateText: "24.11.2026 17:30",
            type: "UNBIND_CLIENT",
            deviceId: "PC-88ff11aa",
            comment: "Отвязка #3 за 30 дней — квота исчерпана"
          },
          {
            id: "e4290002-0000-4000-8000-000000000002",
            iso: "2026-11-18T11:20:00.000000Z",
            dateText: "18.11.2026 11:20",
            type: "UNBIND_CLIENT",
            deviceId: "PC-66dd44ee",
            comment: "Отвязка #2 за 30 дней — слот освобождён"
          },
          {
            id: "e4290001-0000-4000-8000-000000000001",
            iso: "2026-11-05T13:05:00.000000Z",
            dateText: "05.11.2026 13:05",
            type: "UNBIND_CLIENT",
            deviceId: "PC-22bb33cc",
            comment: "Отвязка #1 за 30 дней — освободит квоту 05.12.2026"
          }
        ].concat(buildRichHistory("LIC-A1B2C3D4E5F6").slice(1))
      },

      trial: {
        scenarioKey: "trial",
        publicId: "LIC-T9R4M2K8V1P5",
        name: "Пробный доступ",
        status: "TRIAL",
        termText: "Действует до 04.12.2026 (осталось 7 дн., пробный период)",
        rightsText: "Права: Desktop",
        devicesLimit: 1,
        quotaUsed: 0,
        quotaLimit: 0,
        nextQuotaReleaseDate: null,
        nextQuotaReleaseNote: null,
        downgradeWarning: null,
        nodeLimitActive: false,
        nodeLimitRestored: false,
        devices: [
          {
            id: "PC-trl10293",
            appVersion: "pgF 0.1.0",
            boundAt: "26.11.2026",
            lastSeen: "35 мин назад",
            leaseUntil: "27.11.2026 11:40",
            os: "Windows 11 x64"
          }
        ],
        history: [
          {
            id: "etrl0001-0000-4000-8000-000000000001",
            iso: "2026-11-26T10:15:00.000000Z",
            dateText: "26.11.2026 10:15",
            type: "BIND",
            deviceId: "PC-trl10293",
            comment: "Активация пробного периода (трёхфазная проверка пройдена)"
          }
        ]
      },

      expired: {
        scenarioKey: "expired",
        publicId: "LIC-G7H8J9K1L2M3",
        name: "Тестовый ПК",
        status: "EXPIRED",
        termText: "Истекла 20.11.2026 (ключ и устройства сохраняются до продления)",
        rightsText: "Права: Desktop",
        devicesLimit: 1,
        quotaUsed: 0,
        quotaLimit: 3,
        nextQuotaReleaseDate: null,
        nextQuotaReleaseNote: "отвязок за последние 30 дней не было",
        downgradeWarning: null,
        nodeLimitActive: false,
        nodeLimitRestored: false,
        devices: [
          {
            id: "PC-exp44102",
            appVersion: "pgF 0.1.0",
            boundAt: "21.10.2026",
            lastSeen: "7 дн. назад",
            leaseUntil: "Истёк 20.11.2026",
            os: "Windows 10 x64"
          }
        ],
        history: [
          {
            id: "eexp0001-0000-4000-8000-000000000001",
            iso: "2026-10-21T11:45:00.000000Z",
            dateText: "21.10.2026 11:45",
            type: "BIND",
            deviceId: "PC-exp44102",
            comment: "Успешный handshake (перенесена от реселлера)"
          }
        ]
      },

      revoked: {
        scenarioKey: "revoked",
        publicId: "LIC-R4V6K8D2N9Q1",
        name: "Старый стенд #2",
        status: "REVOKED",
        termText: "Отозвана 15.11.2026 (обращение #T-418)",
        rightsText: "Права: Desktop, SEO",
        devicesLimit: 2,
        quotaUsed: 0,
        quotaLimit: 3,
        nextQuotaReleaseDate: null,
        nextQuotaReleaseNote: null,
        downgradeWarning: null,
        nodeLimitActive: false,
        nodeLimitRestored: false,
        devices: [
          {
            id: "PC-rev00912",
            appVersion: "pgF 0.1.0",
            boundAt: "02.10.2026",
            lastSeen: "12 дн. назад",
            leaseUntil: "Отозван сервером (REVOKED)",
            os: "Windows 11 x64"
          }
        ],
        history: [
          {
            id: "erev0002-0000-4000-8000-000000000002",
            iso: "2026-11-15T15:00:00.000000Z",
            dateText: "15.11.2026 15:00",
            type: "ADMIN",
            deviceId: "PC-rev00912",
            comment: "Лицензия отозвана администратором (#T-418); действия заблокированы"
          },
          {
            id: "erev0001-0000-4000-8000-000000000001",
            iso: "2026-10-02T09:30:00.000000Z",
            dateText: "02.10.2026 09:30",
            type: "BIND",
            deviceId: "PC-rev00912",
            comment: "Успешный handshake"
          }
        ]
      },

      downgrade_warn: {
        scenarioKey: "downgrade_warn",
        publicId: "LIC-A1B2C3D4E5F6",
        name: "Рабочая ферма #1",
        status: "ACTIVE",
        termText: "Текущий период до 25.12.2026 · далее снижение лимита",
        rightsText: "Права: Desktop, SEO",
        devicesLimit: 3,
        quotaUsed: 1,
        quotaLimit: 3,
        nextQuotaReleaseDate: "20.12.2026",
        nextQuotaReleaseNote: "отвязка от 20.11.2026",
        downgradeWarning: {
          switchDate: "25.12.2026",
          nextLimit: 1,
          selectedKeepDeviceIds: ["PC-a1b2c3d4"],
          savedKeepDeviceIds: null
        },
        nodeLimitActive: false,
        nodeLimitRestored: false,
        devices: [
          {
            id: "PC-a1b2c3d4",
            appVersion: "pgF 0.1.0",
            boundAt: "01.11.2026",
            lastSeen: "2 ч назад",
            leaseUntil: "27.11.2026 08:15",
            os: "Windows 11 x64"
          },
          {
            id: "PC-9f8e7d6c",
            appVersion: "pgF 0.1.0",
            boundAt: "15.11.2026",
            lastSeen: "5 ч назад",
            leaseUntil: "27.11.2026 05:10",
            os: "Windows Server 2022"
          },
          {
            id: "PC-5e4d3c2b",
            appVersion: "pgF 0.1.0",
            boundAt: "24.11.2026",
            lastSeen: "1 ч назад",
            leaseUntil: "27.11.2026 09:05",
            os: "Windows 10 x64"
          }
        ],
        history: buildRichHistory("LIC-A1B2C3D4E5F6")
      },

      node_limit: {
        scenarioKey: "node_limit",
        publicId: "LIC-A1B2C3D4E5F6",
        name: "Рабочая ферма #1",
        status: "ACTIVE",
        termText: "Новый период до 25.01.2027 (лимит снижен с 3 до 1)",
        rightsText: "Права: Desktop, SEO",
        devicesLimit: 1,
        quotaUsed: 1,
        quotaLimit: 3,
        nextQuotaReleaseDate: "20.12.2026",
        nextQuotaReleaseNote: "отвязка от 20.11.2026",
        downgradeWarning: null,
        nodeLimitActive: true,
        nodeLimitRestored: false,
        devices: [
          {
            id: "PC-a1b2c3d4",
            appVersion: "pgF 0.1.0",
            boundAt: "01.11.2026",
            lastSeen: "12 мин назад",
            leaseUntil: "Отказ NODE_LIMIT",
            os: "Windows 11 x64"
          },
          {
            id: "PC-9f8e7d6c",
            appVersion: "pgF 0.1.0",
            boundAt: "15.11.2026",
            lastSeen: "1 ч назад",
            leaseUntil: "Отказ NODE_LIMIT",
            os: "Windows Server 2022"
          },
          {
            id: "PC-5e4d3c2b",
            appVersion: "pgF 0.1.0",
            boundAt: "24.11.2026",
            lastSeen: "3 ч назад",
            leaseUntil: "Отказ NODE_LIMIT",
            os: "Windows 10 x64"
          }
        ],
        history: [
          {
            id: "enl00001-0000-4000-8000-000000000001",
            iso: "2026-11-27T00:00:01.000000Z",
            dateText: "27.11.2026 00:00",
            type: "LIMIT_REDUCTION",
            deviceId: "3 устройства",
            comment: "Граница периода: лимит стал 1, активных 3 → режим NODE_LIMIT"
          }
        ].concat(buildRichHistory("LIC-A1B2C3D4E5F6"))
      }
    };
  }

  const ID_TO_SCENARIO = {
    "LIC-A1B2C3D4E5F6": "active",
    "LIC-T9R4M2K8V1P5": "trial",
    "LIC-G7H8J9K1L2M3": "expired",
    "LIC-R4V6K8D2N9Q1": "revoked"
  };

  /* =========================================================================
     Состояние приложения
     ========================================================================= */
  let scenarios = createInitialScenarios();

  const state = {
    slice: 4,
    scenarioKey: "active",
    viewState: "filled", // filled | loading | empty | error
    invalidIdParam: null,
    historyFilter: "ALL",
    historyVisibleCount: PAGE_LIMIT,
    pendingUnbindDeviceId: null,
    pendingUnbindIdemKey: null,
    isUnbinding: false,
    unbindingDeviceId: null,
    idemCounter: 100
  };

  /* =========================================================================
     Ссылки на DOM
     ========================================================================= */
  const els = {
    demoRouteDisplay: document.getElementById("demo-route-display"),
    scenarioSelect: document.getElementById("demo-scenario-select"),
    sliceButtons: Array.from(document.querySelectorAll("[data-slice]")),
    viewStateButtons: Array.from(document.querySelectorAll("[data-view-state]")),
    btnTestBadId: document.getElementById("btn-test-bad-id"),
    btnResetDemo: document.getElementById("btn-reset-demo"),

    sidebar: document.getElementById("app-sidebar"),
    sidebarBackdrop: document.getElementById("sidebar-backdrop"),
    btnOpenSidebar: document.getElementById("btn-open-sidebar"),
    btnCloseSidebar: document.getElementById("btn-close-sidebar"),
    navItemReferrals: document.getElementById("nav-item-referrals"),
    navBillingLabel: document.getElementById("nav-billing-label"),
    headerBalancePill: document.getElementById("header-balance-pill"),
    slice3Banner: document.getElementById("slice3-banner"),

    globalIdAlert: document.getElementById("global-id-alert"),
    globalIdAlertText: document.getElementById("global-id-alert-text"),
    btnDismissIdAlert: document.getElementById("btn-dismiss-id-alert"),

    backToLicenseLink: document.getElementById("back-to-license-link"),
    backToLicenseText: document.getElementById("back-to-license-text"),
    backToLicenseRoute: document.getElementById("back-to-license-route"),

    pageHeading: document.getElementById("devices-page-heading"),
    statusBadge: document.getElementById("license-status-badge"),
    nodeLimitHeaderBadge: document.getElementById("node-limit-header-badge"),
    licensePublicId: document.getElementById("license-public-id"),
    licenseTermText: document.getElementById("license-term-text"),
    licenseRightsText: document.getElementById("license-rights-text"),
    btnBuySlot: document.getElementById("btn-buy-slot"),

    cardSlotsSummary: document.getElementById("card-slots-summary"),
    slotsCounterText: document.getElementById("slots-counter-text"),
    slotsMeter: document.getElementById("slots-meter"),
    slotsMeterFill: document.getElementById("slots-meter-fill"),
    slotsHintText: document.getElementById("slots-hint-text"),

    cardQuotaSummary: document.getElementById("card-quota-summary"),
    quotaPill: document.getElementById("quota-pill"),
    quotaMainText: document.getElementById("quota-main-text"),
    quotaHintText: document.getElementById("quota-hint-text"),

    scenarioBanners: document.getElementById("scenario-banners"),

    activeDevicesCount: document.getElementById("active-devices-count"),
    activeDevicesSubtitle: document.getElementById("active-devices-subtitle"),
    downgradeSaveWrap: document.getElementById("downgrade-save-wrap"),
    downgradeSelectionCounter: document.getElementById("downgrade-selection-counter"),
    btnSaveKeepChoice: document.getElementById("btn-save-keep-choice"),
    devicesStateContainer: document.getElementById("devices-state-container"),

    historyCountPill: document.getElementById("history-count-pill"),
    historyFilterButtons: Array.from(document.querySelectorAll("[data-history-filter]")),
    historyContainer: document.getElementById("history-container"),
    historyFooter: document.getElementById("history-footer"),
    historyPagingSummary: document.getElementById("history-paging-summary"),
    historyCursorDisplay: document.getElementById("history-cursor-display"),
    btnHistoryLoadMore: document.getElementById("btn-history-load-more"),

    unbindModal: document.getElementById("unbind-modal"),
    btnCloseUnbindModal: document.getElementById("btn-close-unbind-modal"),
    modalUnbindDeviceId: document.getElementById("modal-unbind-device-id"),
    modalUnbindLicenseName: document.getElementById("modal-unbind-license-name"),
    modalUnbindIdemKey: document.getElementById("modal-unbind-idem-key"),
    modalUnbindQuotaNote: document.getElementById("modal-unbind-quota-note"),
    modalUnbindError: document.getElementById("modal-unbind-error"),
    modalUnbindErrorTitle: document.getElementById("modal-unbind-error-title"),
    modalUnbindErrorText: document.getElementById("modal-unbind-error-text"),
    btnCancelUnbind: document.getElementById("btn-cancel-unbind"),
    btnConfirmUnbind: document.getElementById("btn-confirm-unbind"),

    helpSearchModal: document.getElementById("help-search-modal"),
    btnOpenHelpSearch: document.getElementById("btn-open-help-search"),
    btnCloseHelpModal: document.getElementById("btn-close-help-modal"),
    helpSearchInput: document.getElementById("help-search-input"),
    helpSearchResults: document.getElementById("help-search-results"),

    routePreviewModal: document.getElementById("route-preview-modal"),
    routePreviewTitle: document.getElementById("route-preview-title"),
    routePreviewPath: document.getElementById("route-preview-path"),
    routePreviewDesc: document.getElementById("route-preview-desc"),
    btnCloseRouteModal: document.getElementById("btn-close-route-modal"),
    btnOkRouteModal: document.getElementById("btn-ok-route-modal"),

    toastRegion: document.getElementById("toast-region"),
    btnLogout: document.getElementById("btn-logout")
  };

  /* =========================================================================
     Утилиты создания DOM (строго без innerHTML)
     ========================================================================= */
  function clearNode(node) {
    while (node.firstChild) {
      node.removeChild(node.firstChild);
    }
  }

  function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) {
      node.className = className;
    }
    if (text !== undefined && text !== null) {
      node.textContent = String(text);
    }
    return node;
  }

  function getCurrentLicense() {
    return scenarios[state.scenarioKey];
  }

  function isNodeLimitExceeded(lic) {
    return Boolean(lic.nodeLimitActive && lic.devices.length > lic.devicesLimit);
  }

  function showToast(message, variant) {
    const toast = el("div", "toast" + (variant ? " toast--" + variant : ""), message);
    els.toastRegion.appendChild(toast);
    window.setTimeout(function () {
      if (toast.parentNode) {
        toast.parentNode.removeChild(toast);
      }
    }, 4500);
  }

  function updateUrlParams(patch) {
    try {
      const url = new URL(window.location.href);
      Object.keys(patch).forEach(function (key) {
        const val = patch[key];
        if (val === null || val === undefined || val === "") {
          url.searchParams.delete(key);
        } else {
          url.searchParams.set(key, String(val));
        }
      });
      window.history.replaceState(null, "", url.toString());
    } catch (_) {
      /* file:// в отдельных окружениях может ограничивать replaceState */
    }
  }

  /* =========================================================================
     Рендер: верхний каркас, Срез 3/4 и заголовок
     ========================================================================= */
  function renderDemoControls() {
    const lic = getCurrentLicense();
    els.demoRouteDisplay.textContent = "/app/licenses/" + lic.publicId + "/devices";
    els.scenarioSelect.value = state.scenarioKey;

    els.sliceButtons.forEach(function (btn) {
      const active = Number(btn.getAttribute("data-slice")) === state.slice;
      btn.setAttribute("aria-pressed", active ? "true" : "false");
    });

    els.viewStateButtons.forEach(function (btn) {
      const active = btn.getAttribute("data-view-state") === state.viewState;
      btn.setAttribute("aria-pressed", active ? "true" : "false");
    });
  }

  function renderSliceVisibility() {
    const isSlice3 = state.slice === 3;
    els.headerBalancePill.hidden = isSlice3;
    els.navItemReferrals.hidden = isSlice3;
    els.slice3Banner.hidden = !isSlice3;
    els.navBillingLabel.textContent = isSlice3 ? "Счета" : "Баланс и счета";
  }

  function renderInvalidIdAlert() {
    if (!state.invalidIdParam) {
      els.globalIdAlert.hidden = true;
      return;
    }
    els.globalIdAlert.hidden = false;
    els.globalIdAlertText.textContent =
      "Параметр ?id=«" +
      state.invalidIdParam +
      "» не соответствует ни одной лицензии аккаунта или содержит недопустимый формат. Показана лицензия по умолчанию «Рабочая ферма #1».";
  }

  function renderHeaderAndSummary() {
    const lic = getCurrentLicense();
    const used = state.viewState === "empty" ? 0 : lic.devices.length;
    const limit = lic.devicesLimit;
    const exceeded = isNodeLimitExceeded(lic) && state.viewState === "filled";

    const safeHref = "../licenses/index.html?id=" + encodeURIComponent(lic.publicId);
    els.backToLicenseLink.setAttribute("href", safeHref);
    els.backToLicenseText.textContent = "Назад к карточке «" + lic.name + "»";
    els.backToLicenseRoute.textContent = "/app/licenses/" + lic.publicId;

    els.pageHeading.textContent = "Устройства лицензии «" + lic.name + "»";
    els.licensePublicId.textContent = lic.publicId;
    els.licenseTermText.textContent = lic.termText;
    els.licenseRightsText.textContent = lic.rightsText;

    els.statusBadge.textContent = lic.status;
    els.statusBadge.className = "status-badge status-badge--" + lic.status.toLowerCase();
    els.nodeLimitHeaderBadge.hidden = !exceeded;

    // Кнопка «+ Докупить устройство» доступна только для ACTIVE
    const canBuySlot = lic.status === "ACTIVE";
    els.btnBuySlot.disabled = !canBuySlot;
    if (lic.status === "REVOKED") {
      els.btnBuySlot.setAttribute("title", "Недоступно: лицензия отозвана (REVOKED)");
    } else if (lic.status === "TRIAL") {
      els.btnBuySlot.setAttribute("title", "Докупка слотов доступна только для платной лицензии ACTIVE");
    } else if (lic.status === "EXPIRED") {
      els.btnBuySlot.setAttribute("title", "Сначала продлите лицензию, затем докупите устройства");
    } else {
      els.btnBuySlot.setAttribute("title", "Переход к пропорциональной докупке слотов (/app/billing/checkout?upgrade=" + lic.publicId + ")");
    }

    // Карточка слотов
    els.slotsCounterText.textContent = used + " из " + limit;
    els.slotsCounterText.className = "summary-card__value" + (exceeded ? " summary-card__value--danger" : "");
    els.cardSlotsSummary.className = "card summary-card" + (exceeded ? " summary-card--danger" : "");

    const pct = limit > 0 ? Math.min(100, Math.round((used / limit) * 100)) : 0;
    els.slotsMeter.setAttribute("aria-valuemax", String(Math.max(limit, used)));
    els.slotsMeter.setAttribute("aria-valuenow", String(used));
    els.slotsMeterFill.style.width = pct + "%";
    if (exceeded) {
      els.slotsMeterFill.className = "slot-meter__fill slot-meter__fill--danger";
      const toRemove = used - limit;
      els.slotsHintText.textContent =
        "Превышение лимита на " + toRemove + " ПК (NODE_LIMIT). Отвяжите лишние устройства — квота 3/30 дн. не спишется (Q-DEV-1).";
    } else if (used === 0) {
      els.slotsMeterFill.className = "slot-meter__fill slot-meter__fill--ok";
      els.slotsHintText.textContent = "Все слоты свободны (" + limit + "). Введите ключ в Scenor Desktop для привязки ПК.";
    } else if (used >= limit) {
      els.slotsMeterFill.className = "slot-meter__fill slot-meter__fill--warn";
      els.slotsHintText.textContent = "Все слоты заняты. Чтобы подключить новый ПК, отвяжите старое устройство или докупите слот.";
    } else {
      els.slotsMeterFill.className = "slot-meter__fill slot-meter__fill--ok";
      const free = limit - used;
      els.slotsHintText.textContent = "Свободно слотов: " + free + ". Новое устройство можно активировать сразу в Scenor Desktop.";
    }

    // Карточка квоты 3/30 дн.
    els.cardQuotaSummary.className = "card summary-card";
    if (lic.status === "TRIAL") {
      els.quotaPill.className = "quota-pill quota-pill--plan";
      els.quotaPill.textContent = "Триал: недоступно";
      els.quotaMainText.textContent = "Самостоятельная смена устройства на триале недоступна";
      els.quotaHintText.textContent = "Сервер вернёт 403 TRIAL_UNBIND_FORBIDDEN. Для смены ПК перейдите на платную лицензию или напишите в поддержку.";
    } else if (lic.status === "REVOKED") {
      els.quotaPill.className = "quota-pill quota-pill--error";
      els.quotaPill.textContent = "Отключено";
      els.quotaMainText.textContent = "Лицензия отозвана — отвязка устройств недоступна";
      els.quotaHintText.textContent = "Все операции по устройствам и слотам заблокированы.";
    } else {
      const remaining = Math.max(0, lic.quotaLimit - lic.quotaUsed);
      els.quotaMainText.textContent =
        "Использовано " + lic.quotaUsed + " из " + lic.quotaLimit + " за скользящие 30 дней";

      if (exceeded) {
        els.quotaPill.className = "quota-pill";
        els.quotaPill.textContent = "Q-DEV-1: не расходуется";
        els.quotaHintText.textContent =
          "Остаток обычной квоты (" + remaining + " из " + lic.quotaLimit + ") сохранится — вынужденная отвязка при NODE_LIMIT не списывает квоту.";
      } else if (remaining === 0) {
        els.cardQuotaSummary.className = "card summary-card summary-card--danger";
        els.quotaPill.className = "quota-pill quota-pill--error";
        els.quotaPill.textContent = "Исчерпано (429)";
        els.quotaHintText.textContent =
          "Ближайшее освобождение слота квоты: " +
          (lic.nextQuotaReleaseDate || "через 30 дней") +
          ". Для досрочного сброса обратитесь в поддержку с Public ID.";
      } else {
        els.quotaPill.className = "quota-pill" + (remaining === 1 ? " quota-pill--warn" : "");
        els.quotaPill.textContent = "Осталось: " + remaining + " из " + lic.quotaLimit;
        if (lic.nextQuotaReleaseDate) {
          els.quotaHintText.textContent =
            "Ближайшее освобождение квоты: " +
            lic.nextQuotaReleaseDate +
            (lic.nextQuotaReleaseNote ? " (" + lic.nextQuotaReleaseNote + ")." : ".");
        } else {
          els.quotaHintText.textContent = "За последние 30 дней самостоятельных отвязок не было.";
        }
      }
    }
  }

  /* =========================================================================
     Рендер: контекстные баннеры сценариев
     ========================================================================= */
  function createAlertBox(variant, titleText, bodyText, subnoteText, actions, roleValue) {
    const box = el("div", "alert alert--" + variant);
    if (roleValue) {
      box.setAttribute("role", roleValue);
    }

    const content = el("div", "alert__content");
    content.appendChild(el("strong", "alert__title", titleText));
    content.appendChild(el("p", "alert__text", bodyText));
    if (subnoteText) {
      content.appendChild(el("p", "alert__subnote", subnoteText));
    }
    box.appendChild(content);

    if (actions && actions.length > 0) {
      const actionsWrap = el("div", "alert__actions");
      actions.forEach(function (act) {
        actionsWrap.appendChild(act);
      });
      box.appendChild(actionsWrap);
    }

    return box;
  }

  function renderScenarioBanners() {
    clearNode(els.scenarioBanners);
    const lic = getCurrentLicense();

    // 1. REVOKED
    if (lic.status === "REVOKED") {
      const supportBtn = el("button", "btn btn--secondary btn--sm", "Написать в поддержку");
      supportBtn.type = "button";
      supportBtn.addEventListener("click", function () {
        openRoutePreview("/app/support");
      });
      els.scenarioBanners.appendChild(
        createAlertBox(
          "error",
          "Лицензия отозвана (REVOKED)",
          "Лицензия «" + lic.name + "» (" + lic.publicId + ") аннулирована. Отвязка устройств и докупка дополнительных слотов отключены.",
          "Если отзыв произошёл по ошибке, обратитесь в поддержку и укажите только Public ID (" + lic.publicId + "), никогда не ключ.",
          [supportBtn],
          "alert"
        )
      );
      return;
    }

    // 2. TRIAL (403 TRIAL_UNBIND_FORBIDDEN)
    if (lic.status === "TRIAL") {
      const buyLink = el("a", "btn btn--primary btn--sm", "Купить платную лицензию");
      buyLink.setAttribute("href", "../checkout/index.html?cfg=30d-1pc-seo0");

      const supportBtn = el("button", "btn btn--secondary btn--sm", "Написать в поддержку");
      supportBtn.type = "button";
      supportBtn.addEventListener("click", function () {
        openRoutePreview("/app/support");
      });

      els.scenarioBanners.appendChild(
        createAlertBox(
          "plan",
          "Самостоятельная смена устройства на триале недоступна (403 TRIAL_UNBIND_FORBIDDEN)",
          "На пробной лицензии кнопка «Отвязать» заблокирована. Чтобы переносить лицензию между ПК и докупать слоты, оформите платную лицензию.",
          "При технических проблемах на триале обратитесь в поддержку, указав только Public ID (" + lic.publicId + ").",
          [buyLink, supportBtn],
          "status"
        )
      );
      return;
    }

    // 3. EXPIRED
    if (lic.status === "EXPIRED") {
      const renewLink = el("a", "btn btn--primary btn--sm", "Продлить лицензию");
      renewLink.setAttribute("href", "../checkout/index.html?cfg=30d-1pc-seo0&renew=" + encodeURIComponent(lic.publicId));
      els.scenarioBanners.appendChild(
        createAlertBox(
          "warn",
          "Срок лицензии истёк (EXPIRED)",
          "Привязанные устройства и ключ сохраняются. После продления Scenor Desktop возобновит работу на этом же ПК без повторной активации.",
          null,
          [renewLink],
          "status"
        )
      );
    }

    // 4. Активный NODE_LIMIT (3 из 1, Q-DEV-1)
    if (isNodeLimitExceeded(lic)) {
      const toRemove = lic.devices.length - lic.devicesLimit;
      const wikiBtn = el("button", "btn btn--secondary btn--sm", "Как исправить (Wiki)");
      wikiBtn.type = "button";
      wikiBtn.addEventListener("click", function () {
        openRoutePreview("/wiki/error-node-limit");
      });

      els.scenarioBanners.appendChild(
        createAlertBox(
          "error",
          "Превышен лимит устройств: NODE_LIMIT (" + lic.devices.length + " из " + lic.devicesLimit + ")",
          "На границе оплаченного периода число привязанных ПК превышает новый лимит (" +
            lic.devicesLimit +
            "). Все привязанные ПК получают отказ NODE_LIMIT, пока активных устройств больше лимита. Отвяжите ещё " +
            toRemove +
            " устр.",
          "Правило Q-DEV-1: вынужденная отвязка лишних устройств при снижении лимита НЕ расходует вашу обычную квоту 3 отвязки за 30 дней.",
          [wikiBtn],
          "alert"
        )
      );
    } else if (lic.nodeLimitRestored) {
      els.scenarioBanners.appendChild(
        createAlertBox(
          "ok",
          "Лимит восстановлен — оставшееся устройство получит ACTIVE при следующей проверке",
          "Число активных устройств (" +
            lic.devices.length +
            " из " +
            lic.devicesLimit +
            ") соответствует лимиту. Квота самостоятельных отвязок 3/30 дн. не израсходована (Q-DEV-1). Перезапустите Scenor Desktop на оставшемся ПК для немедленной проверки.",
          null,
          [],
          "status"
        )
      );
    }

    // 5. Предупреждение о снижении лимита до границы периода (§5.2)
    if (lic.downgradeWarning) {
      const dw = lic.downgradeWarning;
      const limitWord = dw.nextLimit === 1 ? "1 устройство" : dw.nextLimit + " устройства";
      const hasSaved = Array.isArray(dw.savedKeepDeviceIds);
      const savedList = hasSaved && dw.savedKeepDeviceIds.length > 0 ? dw.savedKeepDeviceIds.join(", ") : "ни одного (все ПК будут отвязаны)";
      const savedText = hasSaved
        ? "Сохранено: на границе периода (" + dw.switchDate + ") останутся " + savedList + "; остальные ПК будут автоматически отвязаны без расхода квоты 3/30 дн. (Q-DEV-1)."
        : "Отметьте чекбоксами ниже до " + dw.nextLimit + " ПК, которые нужно оставить активными — остальные будут автоматически отвязаны в момент переключения периода без расхода квоты 3/30 дн. (Q-DEV-1).";

      const btnLimit1 = el("button", dw.nextLimit === 1 ? "btn btn--primary btn--sm" : "btn btn--secondary btn--sm", "Пример: 3 → 1");
      btnLimit1.type = "button";
      btnLimit1.addEventListener("click", function () {
        dw.nextLimit = 1;
        dw.selectedKeepDeviceIds = dw.selectedKeepDeviceIds.slice(0, 1);
        dw.savedKeepDeviceIds = null;
        renderAll();
      });

      const btnLimit2 = el("button", dw.nextLimit === 2 ? "btn btn--primary btn--sm" : "btn btn--secondary btn--sm", "Пример: 3 → 2 (мультивыбор)");
      btnLimit2.type = "button";
      btnLimit2.addEventListener("click", function () {
        dw.nextLimit = 2;
        if (dw.selectedKeepDeviceIds.length < 2 && lic.devices.length >= 2) {
          dw.selectedKeepDeviceIds = lic.devices.slice(0, 2).map(function (d) { return d.id; });
        }
        dw.savedKeepDeviceIds = null;
        renderAll();
      });

      els.scenarioBanners.appendChild(
        createAlertBox(
          hasSaved ? "ok" : "warn",
          "Со следующего периода (" + dw.switchDate + ") лимит станет " + limitWord,
          "Сейчас действует текущий оплаченный лимит (" +
            lic.devicesLimit +
            "). С " +
            dw.switchDate +
            " сверхлимитные устройства потребуется отвязать, иначе при проверке все ПК получат NODE_LIMIT.",
          savedText,
          [btnLimit1, btnLimit2],
          "status"
        )
      );
    }

    // 6. 429 UNBIND_LIMIT_EXCEEDED (если квота 3/3 исчерпана и нет NODE_LIMIT)
    if (!isNodeLimitExceeded(lic) && lic.quotaLimit > 0 && lic.quotaUsed >= lic.quotaLimit) {
      const supportBtn = el("button", "btn btn--primary btn--sm", "Написать в поддержку");
      supportBtn.type = "button";
      supportBtn.addEventListener("click", function () {
        openRoutePreview("/app/support");
      });

      const wikiBtn = el("button", "btn btn--secondary btn--sm", "О лимите 3/30 дн.");
      wikiBtn.type = "button";
      wikiBtn.addEventListener("click", function () {
        openRoutePreview("/wiki/error-unbind-limit");
      });

      els.scenarioBanners.appendChild(
        createAlertBox(
          "error",
          "Лимит 3 отвязки за 30 дней исчерпан (429 UNBIND_LIMIT_EXCEEDED)",
          "Ближайший слот квоты освободится " +
            (lic.nextQuotaReleaseDate || "через 30 дней") +
            ". Для индивидуального сброса счётчика администратором обратитесь в поддержку.",
          "Важно: в обращении передавайте только Public ID (" + lic.publicId + "), никогда не лицензионный ключ PGF-….",
          [supportBtn, wikiBtn],
          "alert"
        )
      );
    }
  }

  /* =========================================================================
     Рендер: секция «Активные устройства» (матрица состояний)
     ========================================================================= */
  function renderDevicesSection() {
    clearNode(els.devicesStateContainer);
    const lic = getCurrentLicense();

    const showDowngradeControls = Boolean(lic.downgradeWarning && state.viewState === "filled" && lic.devices.length > 1);
    els.downgradeSaveWrap.hidden = !showDowngradeControls;

    if (state.viewState === "loading") {
      els.activeDevicesCount.textContent = "…";
      els.activeDevicesSubtitle.textContent = "Загружаем список привязанных устройств…";
      const wrap = el("div", "skeleton-list");
      wrap.setAttribute("role", "status");
      wrap.setAttribute("aria-busy", "true");
      wrap.setAttribute("aria-label", "Загрузка списка устройств");
      for (let i = 0; i < 3; i += 1) {
        const sk = el("div", "skeleton-card");
        sk.appendChild(el("div", "skeleton-line skeleton-line--title"));
        sk.appendChild(el("div", "skeleton-line skeleton-line--meta"));
        wrap.appendChild(sk);
      }
      els.devicesStateContainer.appendChild(wrap);
      return;
    }

    if (state.viewState === "error") {
      els.activeDevicesCount.textContent = "—";
      els.activeDevicesSubtitle.textContent = "Не удалось получить данные от сервера";

      const box = el("div", "state-box state-box--error");
      box.setAttribute("role", "alert");
      box.appendChild(el("h3", "state-box__title", "Не удалось загрузить устройства"));
      box.appendChild(
        el(
          "p",
          "state-box__text",
          "Сервер временно не ответил при загрузке привязанных ПК. Ваши активные устройства и квота отвязок не затронуты — повторите запрос."
        )
      );

      const actions = el("div", "state-box__actions");
      const retryBtn = el("button", "btn btn--primary", "Повторить");
      retryBtn.type = "button";
      retryBtn.id = "btn-retry-devices";
      retryBtn.addEventListener("click", handleRetryFromError);

      const wikiBtn = el("button", "btn btn--secondary", "Wiki и ошибки");
      wikiBtn.type = "button";
      wikiBtn.addEventListener("click", function () {
        openRoutePreview("/wiki");
      });

      actions.appendChild(retryBtn);
      actions.appendChild(wikiBtn);
      box.appendChild(actions);
      els.devicesStateContainer.appendChild(box);
      return;
    }

    if (state.viewState === "empty" || lic.devices.length === 0) {
      els.activeDevicesCount.textContent = "0";
      els.activeDevicesSubtitle.textContent = "К этой лицензии сейчас не привязан ни один ПК";

      const box = el("div", "state-box");
      box.appendChild(el("h3", "state-box__title", "Нет привязанных устройств"));
      box.appendChild(
        el(
          "p",
          "state-box__text",
          "Введите ключ в Scenor (pgF) на вашем ПК — устройство появится здесь сразу после первой онлайн-проверки."
        )
      );

      const actions = el("div", "state-box__actions");
      const docsBtn = el("button", "btn btn--primary", "Как активировать (/docs/activation)");
      docsBtn.type = "button";
      docsBtn.id = "btn-empty-activation-docs";
      docsBtn.addEventListener("click", function () {
        openRoutePreview("/docs/activation");
      });

      const backCardLink = el("a", "btn btn--secondary", "Открыть карточку лицензии за ключом");
      backCardLink.setAttribute("href", "../licenses/index.html?id=" + encodeURIComponent(lic.publicId));

      actions.appendChild(docsBtn);
      actions.appendChild(backCardLink);
      box.appendChild(actions);
      els.devicesStateContainer.appendChild(box);
      return;
    }

    // state === "filled"
    els.activeDevicesCount.textContent = String(lic.devices.length);
    if (lic.downgradeWarning) {
      els.downgradeSelectionCounter.textContent =
        "Выбрано: " + lic.downgradeWarning.selectedKeepDeviceIds.length + " из " + lic.downgradeWarning.nextLimit;
      els.activeDevicesSubtitle.textContent =
        "Отметьте чекбоксами до " +
        lic.downgradeWarning.nextLimit +
        " ПК, которые останутся активными после " +
        lic.downgradeWarning.switchDate;
    } else {
      els.activeDevicesSubtitle.textContent = isNodeLimitExceeded(lic)
        ? "Отвяжите лишние ПК до лимита " + lic.devicesLimit + " — квота 3/30 дн. не расходуется"
        : "ПК с действующей привязкой к этой лицензии";
    }

    const list = el("div", "device-list");
    const exceeded = isNodeLimitExceeded(lic);

    lic.devices.forEach(function (dev) {
      const isBusy = state.isUnbinding && state.unbindingDeviceId === dev.id;
      const dw = lic.downgradeWarning;
      const isKeepSelected = Boolean(dw && dw.selectedKeepDeviceIds.indexOf(dev.id) !== -1);
      const isKeepDisabled = Boolean(
        dw && !isKeepSelected && dw.selectedKeepDeviceIds.length >= dw.nextLimit
      );

      let rowClass = "device-row";
      if (isBusy) {
        rowClass += " device-row--busy";
      } else if (exceeded) {
        rowClass += " device-row--node-limit";
      } else if (isKeepSelected) {
        rowClass += " device-row--keep-selected";
      }

      const row = el("article", rowClass);
      row.setAttribute("data-device-id", dev.id);

      const main = el("div", "device-row__main");

      const top = el("div", "device-row__top");
      top.appendChild(el("span", "device-id", dev.id));
      top.appendChild(el("span", "device-version", dev.appVersion));
      top.appendChild(el("span", "device-version", dev.os));

      if (exceeded) {
        top.appendChild(el("span", "status-badge status-badge--error", "NODE_LIMIT"));
      } else if (dw && Array.isArray(dw.savedKeepDeviceIds)) {
        if (dw.savedKeepDeviceIds.indexOf(dev.id) !== -1) {
          top.appendChild(el("span", "status-badge status-badge--active", "Остаётся после " + dw.switchDate));
        } else {
          top.appendChild(el("span", "status-badge status-badge--expired", "Автоотвязка " + dw.switchDate));
        }
      }
      main.appendChild(top);

      const meta = el("div", "device-meta");
      meta.appendChild(el("span", "device-meta__item", "Привязано: " + dev.boundAt));
      meta.appendChild(el("span", "device-meta__item", "Последняя проверка: " + dev.lastSeen));
      meta.appendChild(el("span", "device-meta__item", "Допуск до: " + dev.leaseUntil));
      main.appendChild(meta);

      // Универсальный чекбокс выбора оставляемых устройств при снижении лимита (§5.2, работает для 3→1, 10→5 и др.)
      if (dw) {
        const keepLabel = el(
          "label",
          "device-keep-label" + (isKeepDisabled ? " device-keep-label--disabled" : "")
        );
        const checkbox = document.createElement("input");
        checkbox.type = "checkbox";
        checkbox.name = "keep-device-checkbox";
        checkbox.value = dev.id;
        checkbox.checked = isKeepSelected;
        checkbox.disabled = isKeepDisabled;
        if (isKeepDisabled) {
          keepLabel.setAttribute(
            "title",
            "Уже выбрано максимум устройств (" + dw.nextLimit + "). Снимите галочку с другого ПК, чтобы выбрать этот."
          );
        }
        checkbox.addEventListener("change", function () {
          if (checkbox.checked) {
            if (
              dw.selectedKeepDeviceIds.indexOf(dev.id) === -1 &&
              dw.selectedKeepDeviceIds.length < dw.nextLimit
            ) {
              dw.selectedKeepDeviceIds.push(dev.id);
            }
          } else {
            dw.selectedKeepDeviceIds = dw.selectedKeepDeviceIds.filter(function (id) {
              return id !== dev.id;
            });
          }
          renderDevicesSection();
        });
        keepLabel.appendChild(checkbox);
        keepLabel.appendChild(
          el("span", "", "Оставить активным со следующего периода (" + dw.switchDate + ")")
        );
        main.appendChild(keepLabel);
      }

      row.appendChild(main);

      // Действия строки устройства
      const actions = el("div", "device-row__actions");
      if (isBusy) {
        const spinner = el("span", "device-spinner");
        spinner.appendChild(el("span", "spinner-dot"));
        spinner.appendChild(el("span", "", "Отвязываем…"));
        actions.appendChild(spinner);
      } else {
        const unbindBtn = el(
          "button",
          exceeded ? "btn btn--danger btn--sm" : "btn btn--danger-outline btn--sm",
          exceeded ? "Отвязать (без квоты)" : "Отвязать"
        );
        unbindBtn.type = "button";
        unbindBtn.setAttribute("data-unbind-device", dev.id);

        if (lic.status === "TRIAL") {
          unbindBtn.disabled = true;
          unbindBtn.setAttribute("title", "403 TRIAL_UNBIND_FORBIDDEN: самостоятельная смена устройства на триале недоступна");
        } else if (lic.status === "REVOKED") {
          unbindBtn.disabled = true;
          unbindBtn.setAttribute("title", "Действие недоступно: лицензия отозвана (REVOKED)");
        } else {
          unbindBtn.addEventListener("click", function () {
            openUnbindModal(dev.id);
          });
        }

        actions.appendChild(unbindBtn);
      }

      row.appendChild(actions);
      list.appendChild(row);
    });

    els.devicesStateContainer.appendChild(list);
  }

  /* =========================================================================
     Рендер: история привязок и отвязок (keyset-пагинация, limit=20)
     ========================================================================= */
  function getFilteredHistory() {
    const lic = getCurrentLicense();
    if (state.historyFilter === "ALL") {
      return lic.history;
    }
    return lic.history.filter(function (item) {
      return item.type === state.historyFilter;
    });
  }

  function renderHistorySection() {
    clearNode(els.historyContainer);

    els.historyFilterButtons.forEach(function (btn) {
      const active = btn.getAttribute("data-history-filter") === state.historyFilter;
      btn.setAttribute("aria-pressed", active ? "true" : "false");
      btn.className = "filter-chip" + (active ? " filter-chip--active" : "");
    });

    const filtered = getFilteredHistory();
    const total = filtered.length;
    const shownCount = Math.min(state.historyVisibleCount, total);
    const pageItems = filtered.slice(0, shownCount);

    els.historyCountPill.textContent = shownCount + " из " + total;

    if (total === 0) {
      const emptyBox = el("div", "state-box");
      emptyBox.appendChild(el("h3", "state-box__title", "Записей по выбранному фильтру нет"));
      emptyBox.appendChild(el("p", "state-box__text", "Выберите «Все», чтобы увидеть полную хронологию привязок и отвязок."));
      els.historyContainer.appendChild(emptyBox);
      els.historyFooter.hidden = true;
      return;
    }

    els.historyFooter.hidden = false;

    // Десктопная таблица
    const tableWrap = el("div", "history-table-wrap");
    const table = el("table", "history-table");
    const thead = document.createElement("thead");
    const headRow = document.createElement("tr");
    ["Дата и время", "Событие", "Устройство", "Комментарий"].forEach(function (colTitle) {
      headRow.appendChild(el("th", "", colTitle));
    });
    thead.appendChild(headRow);
    table.appendChild(thead);

    const tbody = document.createElement("tbody");
    pageItems.forEach(function (item) {
      const tr = document.createElement("tr");
      tr.appendChild(el("td", "mono", item.dateText));

      const evCell = document.createElement("td");
      const meta = EVENT_META[item.type] || { label: item.type, tagClass: "" };
      evCell.appendChild(el("span", "event-tag " + meta.tagClass, meta.label));
      tr.appendChild(evCell);

      tr.appendChild(el("td", "mono", item.deviceId));
      tr.appendChild(el("td", "", item.comment));
      tbody.appendChild(tr);
    });
    table.appendChild(tbody);
    tableWrap.appendChild(table);
    els.historyContainer.appendChild(tableWrap);

    // Мобильные карточки (<= 720 px, без горизонтального переполнения)
    const mobileList = el("div", "history-cards-mobile");
    pageItems.forEach(function (item) {
      const card = el("div", "history-mobile-card");
      const top = el("div", "history-mobile-card__top");
      const meta = EVENT_META[item.type] || { label: item.type, tagClass: "" };
      top.appendChild(el("span", "event-tag " + meta.tagClass, meta.label));
      top.appendChild(el("span", "history-mobile-card__date mono", item.dateText));
      card.appendChild(top);
      card.appendChild(el("div", "mono", item.deviceId));
      card.appendChild(el("div", "history-mobile-card__comment", item.comment));
      mobileList.appendChild(card);
    });
    els.historyContainer.appendChild(mobileList);

    // Футер keyset-пагинации
    const remaining = total - shownCount;
    els.historyPagingSummary.textContent = "Показано " + shownCount + " из " + total + " записей (limit=" + PAGE_LIMIT + ")";

    if (remaining > 0) {
      const lastItem = pageItems[pageItems.length - 1];
      const nextCursor = makeCursor(lastItem.iso, lastItem.id);
      els.historyCursorDisplay.textContent = "nextCursor: " + nextCursor.slice(0, 34) + "…";
      els.btnHistoryLoadMore.hidden = false;
      els.btnHistoryLoadMore.textContent = "Показать ещё (" + Math.min(PAGE_LIMIT, remaining) + " из " + remaining + ")";
    } else {
      els.historyCursorDisplay.textContent = "nextCursor: null (показана вся история)";
      els.btnHistoryLoadMore.hidden = true;
    }
  }

  /* =========================================================================
     Операция отвязки устройства (модалка, защита от двойного клика, 429, Q-DEV-1)
     ========================================================================= */
  function openUnbindModal(deviceId) {
    if (state.isUnbinding) {
      return;
    }
    const lic = getCurrentLicense();
    if (lic.status === "TRIAL" || lic.status === "REVOKED") {
      return;
    }

    state.idemCounter += 1;
    state.pendingUnbindDeviceId = deviceId;
    state.pendingUnbindIdemKey = "idem-unbind-" + lic.publicId.slice(-6).toLowerCase() + "-" + state.idemCounter;

    els.modalUnbindDeviceId.textContent = deviceId;
    els.modalUnbindLicenseName.textContent = lic.name + " (" + lic.publicId + ")";
    els.modalUnbindIdemKey.textContent = state.pendingUnbindIdemKey;
    els.modalUnbindError.hidden = true;

    const exceeded = isNodeLimitExceeded(lic);
    const remaining = Math.max(0, lic.quotaLimit - lic.quotaUsed);

    if (exceeded) {
      els.modalUnbindQuotaNote.className = "modal-notice modal-notice--qdev";
      els.modalUnbindQuotaNote.textContent =
        "Вынужденная отвязка при NODE_LIMIT (Q-DEV-1): квота 3/30 дн. НЕ расходуется (остаток останется " +
        remaining +
        " из " +
        lic.quotaLimit +
        ").";
    } else if (remaining === 0) {
      els.modalUnbindQuotaNote.className = "modal-notice modal-notice--warn";
      els.modalUnbindQuotaNote.textContent =
        "Квота 3 из 3 за скользящие 30 дней исчерпана. Подтверждение вернёт серверный отказ 429 UNBIND_LIMIT_EXCEEDED (ближайшее освобождение: " +
        (lic.nextQuotaReleaseDate || "через 30 дней") +
        ").";
    } else {
      els.modalUnbindQuotaNote.className = "modal-notice";
      els.modalUnbindQuotaNote.textContent =
        "Будет использована 1 самостоятельная отвязка из 3 за скользящие 30 дней (после операции останется " +
        (remaining - 1) +
        " из " +
        lic.quotaLimit +
        ").";
    }

    els.btnConfirmUnbind.disabled = false;
    els.btnConfirmUnbind.textContent = "Отвязать устройство";
    els.btnCancelUnbind.disabled = false;
    els.btnCloseUnbindModal.disabled = false;

    els.unbindModal.hidden = false;
    els.btnConfirmUnbind.focus();
  }

  function closeUnbindModal(force) {
    if (state.isUnbinding && !force) {
      return;
    }
    els.unbindModal.hidden = true;
    state.pendingUnbindDeviceId = null;
    state.pendingUnbindIdemKey = null;
  }

  function confirmUnbind() {
    if (state.isUnbinding || !state.pendingUnbindDeviceId) {
      return;
    }

    const lic = getCurrentLicense();
    const deviceId = state.pendingUnbindDeviceId;
    const exceeded = isNodeLimitExceeded(lic);

    // Защита от двойного клика и блокировка закрытия во время выполнения
    state.isUnbinding = true;
    state.unbindingDeviceId = deviceId;
    els.btnConfirmUnbind.disabled = true;
    els.btnConfirmUnbind.textContent = "Отвязываем…";
    els.btnCancelUnbind.disabled = true;
    els.btnCloseUnbindModal.disabled = true;
    els.modalUnbindError.hidden = true;

    renderDevicesSection();

    window.setTimeout(function () {
      state.isUnbinding = false;
      state.unbindingDeviceId = null;

      // Проверка 429 UNBIND_LIMIT_EXCEEDED (только если не NODE_LIMIT)
      if (!exceeded && lic.quotaLimit > 0 && lic.quotaUsed >= lic.quotaLimit) {
        els.btnConfirmUnbind.disabled = false;
        els.btnConfirmUnbind.textContent = "Повторить попытку";
        els.btnCancelUnbind.disabled = false;
        els.btnCloseUnbindModal.disabled = false;

        els.modalUnbindError.hidden = false;
        els.modalUnbindErrorTitle.textContent = "429 UNBIND_LIMIT_EXCEEDED — лимит 3 отвязки за 30 дней исчерпан";
        els.modalUnbindErrorText.textContent =
          "Ближайший слот квоты освободится " +
          (lic.nextQuotaReleaseDate || "через 30 дней") +
          ". Для досрочного сброса напишите в поддержку (/app/support), указав только Public ID " +
          lic.publicId +
          " (без ключа).";

        showToast("429 UNBIND_LIMIT_EXCEEDED: лимит 3 отвязки за 30 дней исчерпан.", "error");
        renderDevicesSection();
        return;
      }

      // Штатная отвязка или вынужденная отвязка при NODE_LIMIT (Q-DEV-1)
      lic.devices = lic.devices.filter(function (d) {
        return d.id !== deviceId;
      });
      if (lic.downgradeWarning) {
        lic.downgradeWarning.selectedKeepDeviceIds = lic.downgradeWarning.selectedKeepDeviceIds.filter(function (id) {
          return id !== deviceId;
        });
        if (Array.isArray(lic.downgradeWarning.savedKeepDeviceIds)) {
          lic.downgradeWarning.savedKeepDeviceIds = lic.downgradeWarning.savedKeepDeviceIds.filter(function (id) {
            return id !== deviceId;
          });
        }
      }

      if (!exceeded) {
        lic.quotaUsed = Math.min(lic.quotaLimit, lic.quotaUsed + 1);
      }

      const now = new Date();
      const dateStr =
        pad2(now.getDate()) +
        "." +
        pad2(now.getMonth() + 1) +
        "." +
        now.getFullYear() +
        " " +
        pad2(now.getHours()) +
        ":" +
        pad2(now.getMinutes());

      const newEvent = {
        id: "e90000" + pad2(state.idemCounter % 99) + "-0000-4000-8000-000000000099",
        iso: now.toISOString(),
        dateText: dateStr,
        type: exceeded ? "LIMIT_REDUCTION" : "UNBIND_CLIENT",
        deviceId: deviceId,
        comment: exceeded
          ? "Вынужденная отвязка при NODE_LIMIT (квота 3/30 дн. не списана, Q-DEV-1)"
          : "Слот освобождён; уведомление отправлено в Telegram"
      };
      lic.history.unshift(newEvent);

      if (exceeded && lic.devices.length <= lic.devicesLimit) {
        lic.nodeLimitActive = false;
        lic.nodeLimitRestored = true;
        lic.devices.forEach(function (d) {
          d.leaseUntil = "Получит ACTIVE при проверке";
        });
      }

      closeUnbindModal(true);
      renderAll();

      if (exceeded && lic.nodeLimitRestored) {
        showToast(
          "Устройство " + deviceId + " отвязано без расхода квоты (Q-DEV-1). Лимит восстановлен — оставшееся устройство получит ACTIVE.",
          "ok"
        );
      } else if (exceeded) {
        showToast(
          "Устройство " + deviceId + " отвязано без расхода квоты (Q-DEV-1). Осталось отвязать: " + (lic.devices.length - lic.devicesLimit) + ".",
          "ok"
        );
      } else {
        showToast(
          "Устройство " + deviceId + " отвязано. Слот освобождён, уведомление отправлено в Telegram.",
          "ok"
        );
      }
    }, 420);
  }

  /* =========================================================================
     Повтор после ошибки загрузки + очистка state=error в URL
     ========================================================================= */
  function handleRetryFromError() {
    state.viewState = "loading";
    updateUrlParams({ state: null });
    renderAll();

    window.setTimeout(function () {
      state.viewState = "filled";
      renderAll();
      showToast("Список устройств успешно загружен.", "ok");
    }, 320);
  }

  /* =========================================================================
     Модалки справки (Ctrl+K) и предпросмотра маршрутов
     ========================================================================= */
  function openRoutePreview(routePath) {
    const info = ROUTE_PREVIEWS[routePath] || {
      title: "Маршрут Panel V2",
      desc: "Смежный экран клиентского кабинета Scenor."
    };
    els.routePreviewTitle.textContent = info.title;
    els.routePreviewPath.textContent = routePath;
    els.routePreviewDesc.textContent = info.desc;
    els.routePreviewModal.hidden = false;
    els.btnOkRouteModal.focus();
  }

  function closeRoutePreview() {
    els.routePreviewModal.hidden = true;
  }

  function renderHelpResults(query) {
    clearNode(els.helpSearchResults);
    const q = (query || "").trim().toLowerCase();
    const matches = HELP_ARTICLES.filter(function (art) {
      if (!q) {
        return true;
      }
      return (
        art.title.toLowerCase().indexOf(q) !== -1 ||
        art.route.toLowerCase().indexOf(q) !== -1 ||
        art.keywords.toLowerCase().indexOf(q) !== -1
      );
    });

    if (matches.length === 0) {
      const li = el("li", "modal-text", "По запросу «" + query + "» статей не найдено.");
      els.helpSearchResults.appendChild(li);
      return;
    }

    matches.forEach(function (art) {
      const li = document.createElement("li");
      const btn = el("button", "help-result-btn");
      btn.type = "button";
      btn.appendChild(el("span", "help-result-btn__title", art.title));
      btn.appendChild(el("span", "help-result-btn__route", art.route));
      btn.addEventListener("click", function () {
        closeHelpSearch();
        openRoutePreview(art.route);
      });
      li.appendChild(btn);
      els.helpSearchResults.appendChild(li);
    });
  }

  function openHelpSearch() {
    els.helpSearchModal.hidden = false;
    els.helpSearchInput.value = "";
    renderHelpResults("");
    els.helpSearchInput.focus();
  }

  function closeHelpSearch() {
    els.helpSearchModal.hidden = true;
  }

  /* =========================================================================
     Мобильное меню
     ========================================================================= */
  function openMobileSidebar() {
    els.sidebar.classList.add("is-open");
    els.sidebarBackdrop.hidden = false;
    els.btnOpenSidebar.setAttribute("aria-expanded", "true");
    els.btnCloseSidebar.focus();
  }

  function closeMobileSidebar() {
    els.sidebar.classList.remove("is-open");
    els.sidebarBackdrop.hidden = true;
    els.btnOpenSidebar.setAttribute("aria-expanded", "false");
  }

  /* =========================================================================
     Общий перерендер
     ========================================================================= */
  function renderAll() {
    renderDemoControls();
    renderSliceVisibility();
    renderInvalidIdAlert();
    renderHeaderAndSummary();
    renderScenarioBanners();
    renderDevicesSection();
    renderHistorySection();
  }

  /* =========================================================================
     Разбор URL-параметров при загрузке (?id=, ?state=, ?scenario=, ?slice=)
     ========================================================================= */
  function parseInitialUrl() {
    let params;
    try {
      params = new URLSearchParams(window.location.search);
    } catch (_) {
      return;
    }

    const sliceParam = params.get("slice");
    if (sliceParam === "3" || sliceParam === "4") {
      state.slice = Number(sliceParam);
    }

    const scenarioParam = params.get("scenario");
    if (scenarioParam && Object.prototype.hasOwnProperty.call(scenarios, scenarioParam)) {
      state.scenarioKey = scenarioParam;
    } else {
      const idParam = params.get("id");
      if (idParam !== null && idParam !== "") {
        if (Object.prototype.hasOwnProperty.call(ID_TO_SCENARIO, idParam)) {
          state.scenarioKey = ID_TO_SCENARIO[idParam];
          state.invalidIdParam = null;
        } else {
          state.scenarioKey = "active";
          state.invalidIdParam = idParam;
        }
      }
    }

    const stateParam = params.get("state");
    if (
      stateParam === "filled" ||
      stateParam === "loading" ||
      stateParam === "empty" ||
      stateParam === "error"
    ) {
      state.viewState = stateParam;
    }
  }

  /* =========================================================================
     Подписка на события
     ========================================================================= */
  function bindEvents() {
    // Переключатель Среза 3 / 4
    els.sliceButtons.forEach(function (btn) {
      btn.addEventListener("click", function () {
        state.slice = Number(btn.getAttribute("data-slice"));
        renderAll();
      });
    });

    // Выбор сценария в демо-панели
    els.scenarioSelect.addEventListener("change", function () {
      state.scenarioKey = els.scenarioSelect.value;
      state.invalidIdParam = null;
      state.historyFilter = "ALL";
      state.historyVisibleCount = PAGE_LIMIT;
      if (state.viewState !== "filled") {
        state.viewState = "filled";
      }
      updateUrlParams({ scenario: state.scenarioKey, id: null, state: null });
      renderAll();
    });

    // Переключатель матрицы состояний
    els.viewStateButtons.forEach(function (btn) {
      btn.addEventListener("click", function () {
        state.viewState = btn.getAttribute("data-view-state");
        updateUrlParams({ state: state.viewState === "filled" ? null : state.viewState });
        renderAll();
      });
    });

    // Тест ?id=bad (проверка защиты от DOM-XSS)
    els.btnTestBadId.addEventListener("click", function () {
      const payload = "<img src=x onerror=alert(1)>";
      state.invalidIdParam = payload;
      updateUrlParams({ id: payload });
      renderInvalidIdAlert();
      els.globalIdAlert.scrollIntoView({ behavior: "smooth", block: "nearest" });
    });

    // Сброс демо-состояния
    els.btnResetDemo.addEventListener("click", function () {
      scenarios = createInitialScenarios();
      state.slice = 4;
      state.scenarioKey = "active";
      state.viewState = "filled";
      state.invalidIdParam = null;
      state.historyFilter = "ALL";
      state.historyVisibleCount = PAGE_LIMIT;
      updateUrlParams({ id: null, state: null, scenario: null, slice: null });
      renderAll();
      showToast("Демонстрационные данные сброшены.", "ok");
    });

    // Закрытие алерта ?id=bad
    els.btnDismissIdAlert.addEventListener("click", function () {
      state.invalidIdParam = null;
      state.scenarioKey = "active";
      updateUrlParams({ id: null });
      renderAll();
    });

    // Кнопка «+ Докупить устройство»
    els.btnBuySlot.addEventListener("click", function () {
      const lic = getCurrentLicense();
      if (lic.status !== "ACTIVE") {
        return;
      }
      window.location.href = "../checkout/index.html?upgrade=" + encodeURIComponent(lic.publicId);
    });

    // Сохранение выбора оставляемых устройств при снижении лимита (§5.2)
    els.btnSaveKeepChoice.addEventListener("click", function () {
      const lic = getCurrentLicense();
      if (!lic.downgradeWarning) {
        return;
      }
      const dw = lic.downgradeWarning;
      dw.savedKeepDeviceIds = dw.selectedKeepDeviceIds.slice(0, dw.nextLimit);
      renderAll();
      const keptSummary = dw.savedKeepDeviceIds.length > 0
        ? dw.savedKeepDeviceIds.join(", ")
        : "ни одного (все ПК будут отвязаны)";
      showToast(
        "Сохранено: после " +
          dw.switchDate +
          " останутся " +
          keptSummary +
          ". Автоотвязка остальных ПК не расходует квоту 3/30 дн. (Q-DEV-1).",
        "ok"
      );
    });

    // Фильтры истории
    els.historyFilterButtons.forEach(function (btn) {
      btn.addEventListener("click", function () {
        state.historyFilter = btn.getAttribute("data-history-filter");
        state.historyVisibleCount = PAGE_LIMIT;
        renderHistorySection();
      });
    });

    // Keyset-кнопка «Показать ещё»
    els.btnHistoryLoadMore.addEventListener("click", function () {
      state.historyVisibleCount += PAGE_LIMIT;
      renderHistorySection();
    });

    // Модалка отвязки
    els.btnConfirmUnbind.addEventListener("click", confirmUnbind);
    els.btnCancelUnbind.addEventListener("click", function () {
      closeUnbindModal(false);
    });
    els.btnCloseUnbindModal.addEventListener("click", function () {
      closeUnbindModal(false);
    });
    els.unbindModal.addEventListener("click", function (ev) {
      if (ev.target === els.unbindModal) {
        closeUnbindModal(false);
      }
    });

    // Поиск помощи (Ctrl+K)
    els.btnOpenHelpSearch.addEventListener("click", openHelpSearch);
    els.btnCloseHelpModal.addEventListener("click", closeHelpSearch);
    els.helpSearchModal.addEventListener("click", function (ev) {
      if (ev.target === els.helpSearchModal) {
        closeHelpSearch();
      }
    });
    els.helpSearchInput.addEventListener("input", function () {
      renderHelpResults(els.helpSearchInput.value);
    });

    // Предпросмотр маршрутов
    document.querySelectorAll("[data-nav-route]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        closeMobileSidebar();
        const route = btn.getAttribute("data-nav-route");
        if (route === "/app/billing") {
          window.location.href = "../billing/index.html";
          return;
        }
        openRoutePreview(route);
      });
    });
    els.btnCloseRouteModal.addEventListener("click", closeRoutePreview);
    els.btnOkRouteModal.addEventListener("click", closeRoutePreview);
    els.routePreviewModal.addEventListener("click", function (ev) {
      if (ev.target === els.routePreviewModal) {
        closeRoutePreview();
      }
    });

    // Мобильное меню
    els.btnOpenSidebar.addEventListener("click", openMobileSidebar);
    els.btnCloseSidebar.addEventListener("click", closeMobileSidebar);
    els.sidebarBackdrop.addEventListener("click", closeMobileSidebar);

    // Выход
    els.btnLogout.addEventListener("click", function () {
      showToast("В боевой панели выполняется выход из сессии (POST /api/auth/logout).");
    });

    // Глобальные клавиши (Ctrl+K и Escape)
    document.addEventListener("keydown", function (ev) {
      if ((ev.ctrlKey || ev.metaKey) && ev.key.toLowerCase() === "k") {
        ev.preventDefault();
        openHelpSearch();
        return;
      }
      if (ev.key === "Escape") {
        if (!els.unbindModal.hidden) {
          closeUnbindModal(false);
        } else if (!els.helpSearchModal.hidden) {
          closeHelpSearch();
        } else if (!els.routePreviewModal.hidden) {
          closeRoutePreview();
        } else if (els.sidebar.classList.contains("is-open")) {
          closeMobileSidebar();
        }
      }
    });
  }

  /* =========================================================================
     Инициализация
     ========================================================================= */
  parseInitialUrl();
  bindEvents();
  renderAll();
})();
