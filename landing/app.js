/* ==========================================================================
   pgF PANEL-V2 — Landing Page & Pricing Calculator Logic (Zero dependencies)
   Supports: Design V2 screen tabs, mobile menu, FAQ accordion, period/device/SEO
   pricing calculator, authenticated discounts/promo/bonuses, cfg transfer
   across login/register -> checkout, and K2/K3 storefront state simulation.
   ========================================================================== */

(function () {
  'use strict';

  // --- Demo Plan Configuration (in production supplied by /admin/plans & /admin/settings) ---
  var DEMO_PLAN_CONFIG = {
    isDemo: true,
    trialDays: 14,
    baseDevicesIncluded: 1,
    maxExtraDevices: 9,
    periods: {
      30:  { days: 30,  label: '30 дней',  basePrice: 2900,  extraDevicePrice: 700,  seoPrice: 1200 },
      90:  { days: 90,  label: '90 дней',  basePrice: 8100,  extraDevicePrice: 1950, seoPrice: 3300 },
      180: { days: 180, label: '180 дней', basePrice: 15000, extraDevicePrice: 3600, seoPrice: 6000 },
      365: { days: 365, label: '365 дней', basePrice: 27600, extraDevicePrice: 6600, seoPrice: 10800 }
    },
    userConditions: {
      personalDiscountPct: 10,
      bonusBalance: 500,
      promoCodes: {
        PGF500: { type: 'fixed', value: 500, label: 'Промокод PGF500 (−500 ₽)' },
        START5: { type: 'pct',   value: 5,   label: 'Промокод START5 (−5%)' }
      }
    }
  };

  // --- Runtime State ---
  var state = {
    visibility: 'PUBLIC_WITH_PRICES', // PUBLIC_WITH_PRICES | PUBLIC_PRICES_AUTH_ONLY | PRIVATE_AUTH_ONLY
    auth: 'guest',                    // guest | user
    registration: 'OPEN',             // OPEN | INVITE_ONLY
    trialEnabled: true,
    salesPaused: false,
    maintenance: false,
    showReviewsTemplate: true,

    // Calculator state
    periodDays: 30,
    extraDevices: 0,
    includeSeo: false,
    seoMode: 'addon',                 // addon | included | disabled
    invalidConfigDemo: false,
    requestedUnavailableMsg: '',

    // Authenticated user options
    promoCode: '',
    promoError: '',
    useBonus: false,

    // Flow modal state
    flowOpen: false,
    flowMode: 'auth',                 // auth | checkout
    flowAuthTab: 'login',             // login | register
    flowNext: '/app/billing/checkout',// /app/billing/checkout | /#pricing | /app | trial
    flowCfg: ''
  };

  // --- Helpers ---
  function qs(sel, root) {
    return (root || document).querySelector(sel);
  }
  function qsa(sel, root) {
    return Array.prototype.slice.call((root || document).querySelectorAll(sel));
  }
  function formatRub(num) {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '\u00a0') + '\u00a0₽';
  }
  function getPeriodConfig() {
    return DEMO_PLAN_CONFIG.periods[state.periodDays] || DEMO_PLAN_CONFIG.periods[30];
  }
  function getEffectiveSeoIncluded() {
    if (state.seoMode === 'included') return true;
    if (state.seoMode === 'disabled') return false;
    return !!state.includeSeo;
  }
  function encodeCfg() {
    var totalDevices = DEMO_PLAN_CONFIG.baseDevicesIncluded + state.extraDevices;
    var seoFlag = getEffectiveSeoIncluded() ? '1' : '0';
    return state.periodDays + 'd-' + totalDevices + 'pc-seo' + seoFlag;
  }
  function parseAndApplyCfg(cfgStr) {
    if (!cfgStr) return;
    var m = /^(\d+)d-(\d+)pc-seo([01])$/.exec(cfgStr.trim());
    if (!m) {
      state.requestedUnavailableMsg = 'Передана некорректная конфигурация «' + cfgStr + '». Скорректируйте параметры расчёта.';
      return;
    }
    var days = parseInt(m[1], 10);
    var totalPc = parseInt(m[2], 10);
    var seoReq = m[3] === '1';

    if (!DEMO_PLAN_CONFIG.periods[days]) {
      state.requestedUnavailableMsg = 'Выбранный срок (' + days + ' дн.) недоступен в текущих настройках тарифа.';
      return;
    }
    state.periodDays = days;
    var extra = totalPc - DEMO_PLAN_CONFIG.baseDevicesIncluded;
    if (extra < 0 || extra > DEMO_PLAN_CONFIG.maxExtraDevices) {
      state.requestedUnavailableMsg = 'Количество устройств (' + totalPc + ' ПК) выходит за допустимый предел конфигурации (1–' + (1 + DEMO_PLAN_CONFIG.maxExtraDevices) + ' ПК).';
      return;
    }
    state.extraDevices = extra;
    if (seoReq && state.seoMode === 'disabled') {
      state.includeSeo = false;
      state.requestedUnavailableMsg = 'Опция SEO из сохранённой конфигурации сейчас отключена в настройках тарифа.';
      return;
    }
    state.includeSeo = seoReq;
    state.requestedUnavailableMsg = '';
  }

  function calculatePricing() {
    var p = getPeriodConfig();
    var totalDevices = DEMO_PLAN_CONFIG.baseDevicesIncluded + state.extraDevices;
    var seoIncluded = getEffectiveSeoIncluded();
    var extraCost = state.extraDevices * p.extraDevicePrice;
    var seoCost = state.seoMode === 'addon' && seoIncluded ? p.seoPrice : 0;
    var grossTotal = p.basePrice + extraCost + seoCost;

    var personalDiscountAmt = 0;
    var promoDiscountAmt = 0;
    var bonusAppliedAmt = 0;
    var netTotal = grossTotal;

    if (state.auth === 'user') {
      personalDiscountAmt = Math.round(grossTotal * (DEMO_PLAN_CONFIG.userConditions.personalDiscountPct / 100));
      netTotal = Math.max(0, grossTotal - personalDiscountAmt);

      if (state.promoCode && DEMO_PLAN_CONFIG.userConditions.promoCodes[state.promoCode]) {
        var promo = DEMO_PLAN_CONFIG.userConditions.promoCodes[state.promoCode];
        if (promo.type === 'fixed') {
          promoDiscountAmt = Math.min(netTotal, promo.value);
        } else if (promo.type === 'pct') {
          promoDiscountAmt = Math.round(netTotal * (promo.value / 100));
        }
        netTotal = Math.max(0, netTotal - promoDiscountAmt);
      }

      if (state.useBonus) {
        bonusAppliedAmt = Math.min(netTotal, DEMO_PLAN_CONFIG.userConditions.bonusBalance);
        netTotal = Math.max(0, netTotal - bonusAppliedAmt);
      }
    }

    return {
      period: p,
      totalDevices: totalDevices,
      seoIncluded: seoIncluded,
      baseCost: p.basePrice,
      extraCost: extraCost,
      seoCost: seoCost,
      grossTotal: grossTotal,
      personalDiscountAmt: personalDiscountAmt,
      promoDiscountAmt: promoDiscountAmt,
      bonusAppliedAmt: bonusAppliedAmt,
      netTotal: netTotal
    };
  }

  // --- 1. Product Showcase Tabs (4 Design V2 screens) ---
  function initShowcaseTabs() {
    var tabs = qsa('[data-screen-tab]');
    var panels = qsa('[data-screen-panel]');
    var captionSets = qsa('[data-screen-captions]');
    var sidebarItems = qsa('[data-dv2-nav]');

    function activate(id) {
      tabs.forEach(function (btn) {
        var active = btn.getAttribute('data-screen-tab') === id;
        btn.classList.toggle('is-active', active);
        btn.setAttribute('aria-selected', active ? 'true' : 'false');
      });
      panels.forEach(function (panel) {
        var active = panel.getAttribute('data-screen-panel') === id;
        panel.classList.toggle('is-hidden', !active);
      });
      captionSets.forEach(function (cap) {
        var active = cap.getAttribute('data-screen-captions') === id;
        cap.classList.toggle('is-hidden', !active);
      });
      sidebarItems.forEach(function (item) {
        var targets = (item.getAttribute('data-dv2-nav') || '').split(',');
        item.classList.toggle('is-active', targets.indexOf(id) !== -1);
      });
    }

    tabs.forEach(function (btn) {
      btn.addEventListener('click', function () {
        activate(btn.getAttribute('data-screen-tab'));
      });
    });

    activate('projects');
  }

  // --- 2. Mobile Navigation Drawer ---
  function initMobileNav() {
    var toggle = qs('#nav-toggle');
    var drawer = qs('#mobile-drawer');
    if (!toggle || !drawer) return;

    function setOpen(open) {
      drawer.classList.toggle('is-open', open);
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
      toggle.setAttribute('aria-label', open ? 'Закрыть меню' : 'Открыть меню');
      document.body.style.overflow = open || state.flowOpen ? 'hidden' : '';
    }

    toggle.addEventListener('click', function () {
      setOpen(!drawer.classList.contains('is-open'));
    });

    qsa('a', drawer).forEach(function (link) {
      link.addEventListener('click', function () {
        setOpen(false);
      });
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && drawer.classList.contains('is-open')) {
        setOpen(false);
        toggle.focus();
      }
    });
  }

  // --- 3. FAQ Accordion ---
  function initFaq() {
    qsa('.faq-item__btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var item = btn.closest('.faq-item');
        var isOpen = item.classList.contains('is-open');
        item.classList.toggle('is-open', !isOpen);
        btn.setAttribute('aria-expanded', !isOpen ? 'true' : 'false');
      });
    });
  }

  // --- 4. Calculator UI Updates ---
  function getUnavailableMessage() {
    if (state.salesPaused) {
      return 'Оформление новых подписок временно приостановлено администратором. Действующие лицензии продолжают работу.';
    }
    if (state.invalidConfigDemo) {
      return 'Выбранная конфигурация недоступна: выбранный лимит устройств или опция ограничены текущими настройками тарифа.';
    }
    if (state.requestedUnavailableMsg) {
      return state.requestedUnavailableMsg;
    }
    return '';
  }

  function updateCalculatorUI() {
    var calc = calculatePricing();
    var p = calc.period;
    var isUser = state.auth === 'user';

    // Period pills
    qsa('[data-period]').forEach(function (btn) {
      var days = parseInt(btn.getAttribute('data-period'), 10);
      var active = days === state.periodDays;
      btn.classList.toggle('is-active', active);
      btn.setAttribute('aria-checked', active ? 'true' : 'false');
      var cfg = DEMO_PLAN_CONFIG.periods[days];
      var hint = qs('.period-pill__hint', btn);
      if (cfg && hint) hint.textContent = formatRub(cfg.basePrice) + '*';
    });

    // Extra devices stepper
    var devCountEl = qs('#demo-devices-count');
    var devUnitPriceEl = qs('#demo-extra-dev-unit-price');
    var devMinus = qs('#demo-dev-minus');
    var devPlus = qs('#demo-dev-plus');
    if (devCountEl) devCountEl.textContent = String(state.extraDevices);
    if (devUnitPriceEl) devUnitPriceEl.textContent = '+' + formatRub(p.extraDevicePrice) + '/ПК*';
    if (devMinus) devMinus.disabled = state.extraDevices <= 0;
    if (devPlus) devPlus.disabled = state.extraDevices >= DEMO_PLAN_CONFIG.maxExtraDevices;

    // SEO option row (3 states: addon / included / disabled)
    var seoRow = qs('#demo-seo-row');
    var seoToggle = qs('#demo-seo-toggle');
    var seoBadge = qs('#demo-seo-badge');
    var seoHint = qs('#demo-seo-hint');
    if (seoToggle && seoBadge && seoRow) {
      seoBadge.classList.remove('seo-state-badge--included', 'seo-state-badge--disabled');
      seoRow.classList.remove('plan-option-row--disabled');

      if (state.seoMode === 'included') {
        seoToggle.checked = true;
        seoToggle.disabled = true;
        seoBadge.textContent = 'Включён в тариф (0 ₽)';
        seoBadge.classList.add('seo-state-badge--included');
        if (seoHint) seoHint.textContent = 'SEO-модуль уже включён в стоимость основного тарифа на всю лицензию целиком.';
      } else if (state.seoMode === 'disabled') {
        seoToggle.checked = false;
        seoToggle.disabled = true;
        seoRow.classList.add('plan-option-row--disabled');
        seoBadge.textContent = 'Недоступен по тарифу';
        seoBadge.classList.add('seo-state-badge--disabled');
        if (seoHint) seoHint.textContent = 'Опция SEO-аудита сейчас отключена в настройках тарифа панели.';
      } else {
        seoToggle.disabled = false;
        seoToggle.checked = !!state.includeSeo;
        seoBadge.textContent = '+' + formatRub(p.seoPrice) + '*';
        if (seoHint) seoHint.textContent = 'Сравнение исходного HTML и страницы после JavaScript; подключается сразу на все устройства выбранной лицензии.';
      }
    }

    // Authenticated user benefits vs Guest note
    var userBox = qs('#user-benefits-box');
    var guestNote = qs('#guest-benefits-note');
    var promoStatus = qs('#demo-promo-status');
    var bonusAppliedEl = qs('#demo-bonus-applied');
    if (userBox && guestNote) {
      userBox.classList.toggle('is-hidden', !isUser);
      guestNote.classList.toggle('is-hidden', isUser);
    }
    if (promoStatus) {
      if (state.promoError) {
        promoStatus.textContent = state.promoError;
        promoStatus.className = 'promo-status promo-status--err';
      } else if (state.promoCode && DEMO_PLAN_CONFIG.userConditions.promoCodes[state.promoCode]) {
        promoStatus.textContent = DEMO_PLAN_CONFIG.userConditions.promoCodes[state.promoCode].label + ' применён';
        promoStatus.className = 'promo-status';
      } else {
        promoStatus.className = 'promo-status is-hidden';
      }
    }
    if (bonusAppliedEl) {
      bonusAppliedEl.textContent = calc.bonusAppliedAmt > 0 ? '−' + formatRub(calc.bonusAppliedAmt) : '0 ₽';
    }

    // Total & breakdown
    var amountEl = qs('#demo-price-amount');
    var strikeEl = qs('#demo-price-before-discount');
    var periodLabelEl = qs('#demo-period-label');
    var totalDevEl = qs('#demo-total-devices');
    var breakdownEl = qs('#demo-price-breakdown');
    var routeHintEl = qs('#buy-route-hint');

    if (amountEl) amountEl.textContent = formatRub(calc.netTotal);
    if (strikeEl) {
      var hasDiscounts = isUser && calc.netTotal < calc.grossTotal;
      strikeEl.textContent = formatRub(calc.grossTotal);
      strikeEl.classList.toggle('is-hidden', !hasDiscounts);
    }
    if (periodLabelEl) periodLabelEl.textContent = p.label;
    if (totalDevEl) totalDevEl.textContent = String(calc.totalDevices);

    if (breakdownEl) {
      var parts = ['База (1 ПК, ' + p.label + '): ' + formatRub(calc.baseCost)];
      if (state.extraDevices > 0) {
        parts.push('+' + state.extraDevices + ' ПК: ' + formatRub(calc.extraCost));
      }
      if (state.seoMode === 'included') {
        parts.push('SEO: включён в тариф');
      } else if (state.seoMode === 'disabled') {
        parts.push('SEO: недоступен');
      } else if (calc.seoIncluded) {
        parts.push('SEO (на лицензию): +' + formatRub(calc.seoCost));
      } else {
        parts.push('SEO: не выбран');
      }
      if (isUser && calc.personalDiscountAmt > 0) {
        parts.push('скидка 10%: −' + formatRub(calc.personalDiscountAmt));
      }
      if (isUser && calc.promoDiscountAmt > 0) {
        parts.push('промокод: −' + formatRub(calc.promoDiscountAmt));
      }
      if (isUser && calc.bonusAppliedAmt > 0) {
        parts.push('бонусы: −' + formatRub(calc.bonusAppliedAmt));
      }
      breakdownEl.textContent = parts.join(' · ') + ' · Демонстрационные значения';
    }

    var cfg = encodeCfg();
    state.flowCfg = cfg;
    if (routeHintEl) {
      routeHintEl.textContent = 'cfg: ' + cfg;
    }

    // Error / unavailable config & Buy button state
    var errMsg = getUnavailableMessage();
    var errBox = qs('#calc-error-box');
    var buyBtn = qs('#buy-subscription-btn');
    if (errBox) {
      errBox.textContent = errMsg;
      errBox.classList.toggle('is-hidden', !errMsg);
    }
    if (buyBtn) {
      var buyDisabled = !!errMsg;
      buyBtn.disabled = buyDisabled;
      buyBtn.classList.toggle('btn--disabled', buyDisabled);
      buyBtn.textContent = state.salesPaused ? 'Покупки на паузе' : 'Купить подписку';
    }

    // Refresh checkout view if currently open
    if (state.flowOpen && state.flowMode === 'checkout') {
      renderFlowModal();
    }
  }

  function initCalculator() {
    qsa('[data-period]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        state.periodDays = parseInt(btn.getAttribute('data-period'), 10);
        state.requestedUnavailableMsg = '';
        updateCalculatorUI();
      });
    });

    var minus = qs('#demo-dev-minus');
    var plus = qs('#demo-dev-plus');
    var seoCheck = qs('#demo-seo-toggle');
    var promoInput = qs('#demo-promo-input');
    var promoApply = qs('#demo-promo-apply');
    var bonusToggle = qs('#demo-bonus-toggle');

    if (minus) {
      minus.addEventListener('click', function () {
        if (state.extraDevices > 0) {
          state.extraDevices -= 1;
          state.requestedUnavailableMsg = '';
          updateCalculatorUI();
        }
      });
    }
    if (plus) {
      plus.addEventListener('click', function () {
        if (state.extraDevices < DEMO_PLAN_CONFIG.maxExtraDevices) {
          state.extraDevices += 1;
          state.requestedUnavailableMsg = '';
          updateCalculatorUI();
        }
      });
    }
    if (seoCheck) {
      seoCheck.addEventListener('change', function () {
        if (state.seoMode === 'addon') {
          state.includeSeo = !!seoCheck.checked;
          state.requestedUnavailableMsg = '';
          updateCalculatorUI();
        }
      });
    }
    if (promoApply && promoInput) {
      promoApply.addEventListener('click', function () {
        var code = promoInput.value.trim().toUpperCase();
        if (!code) {
          state.promoCode = '';
          state.promoError = '';
        } else if (DEMO_PLAN_CONFIG.userConditions.promoCodes[code]) {
          state.promoCode = code;
          state.promoError = '';
        } else {
          state.promoCode = '';
          state.promoError = 'Промокод «' + code + '» не найден (попробуйте PGF500 или START5).';
        }
        updateCalculatorUI();
      });
    }
    if (bonusToggle) {
      bonusToggle.addEventListener('change', function () {
        state.useBonus = !!bonusToggle.checked;
        updateCalculatorUI();
      });
    }

    updateCalculatorUI();
  }

  // --- 5. Storefront State Engine (K3) ---
  function setAnchorEnabled(el, enabled, href) {
    if (enabled) {
      el.setAttribute('href', href);
      el.removeAttribute('aria-disabled');
      el.removeAttribute('tabindex');
      el.classList.remove('btn--disabled');
    } else {
      if (!el.getAttribute('data-original-href') && el.getAttribute('href')) {
        el.setAttribute('data-original-href', el.getAttribute('href'));
      }
      el.removeAttribute('href');
      el.setAttribute('aria-disabled', 'true');
      el.setAttribute('tabindex', '-1');
      el.classList.add('btn--disabled');
    }
  }

  function applyStorefrontState() {
    var publicShell = qs('#public-shell');
    var privateShell = qs('#private-shell');

    var isPrivate = state.visibility === 'PRIVATE_AUTH_ONLY' && state.auth === 'guest';
    var isAuthOnlyPrices = state.visibility === 'PUBLIC_PRICES_AUTH_ONLY' && state.auth === 'guest';
    var isUser = state.auth === 'user';
    var isInviteOnly = state.registration === 'INVITE_ONLY';
    var canShowTrial =
      state.trialEnabled &&
      !state.salesPaused &&
      !state.maintenance &&
      (!isInviteOnly || isUser);

    // 5.1 Switch between public landing and compact private login
    if (publicShell && privateShell) {
      publicShell.classList.toggle('is-hidden', isPrivate);
      privateShell.classList.toggle('is-hidden', !isPrivate);
    }

    // 5.2 Maintenance & Sales paused banners
    var maintBanner = qs('#banner-maintenance');
    var salesBanner = qs('#banner-sales-paused');
    if (maintBanner) maintBanner.classList.toggle('is-hidden', !state.maintenance);
    if (salesBanner) salesBanner.classList.toggle('is-hidden', !state.salesPaused || state.maintenance);

    var privMaintBanner = qs('#private-banner-maintenance');
    if (privMaintBanner) privMaintBanner.classList.toggle('is-hidden', !state.maintenance);

    // 5.3 Auth links (Header, Banners, Step 2, Final CTA, Footer): Войти (/login) vs В кабинет (/app)
    qsa('[data-auth-link]').forEach(function (el) {
      el.textContent = isUser ? 'В кабинет' : 'Войти';
      el.setAttribute('href', isUser ? '/app' : '/login');
    });

    // 5.4 Primary pricing CTA in Header, Hero, Mobile Drawer, Final CTA
    var primaryCtaText = 'Рассчитать стоимость';
    var primaryCtaHref = '#pricing';
    var primaryEnabled = true;

    if (state.salesPaused) {
      primaryCtaText = 'Покупки временно на паузе';
      primaryEnabled = false;
    } else if (isAuthOnlyPrices) {
      primaryCtaText = 'Войти, чтобы увидеть цены';
      primaryCtaHref = '/login?next=/%23pricing';
    }

    qsa('[data-primary-pricing-cta]').forEach(function (el) {
      el.textContent = primaryCtaText;
      setAnchorEnabled(el, primaryEnabled, primaryCtaHref);
    });

    // Top nav & footer pricing links always point to #pricing (or remain navigable to tariff section description)
    qsa('[data-pricing-nav-link]').forEach(function (el) {
      setAnchorEnabled(el, true, '#pricing');
    });

    // 5.5 Trial CTA & #trial card visibility
    qsa('[data-trial-cta]').forEach(function (el) {
      el.classList.toggle('is-hidden', !canShowTrial);
      if (el.tagName === 'BUTTON') {
        el.disabled = !canShowTrial;
      } else {
        setAnchorEnabled(el, canShowTrial, '#trial');
      }
    });

    var trialCard = qs('#trial');
    var pricingGrid = qs('#pricing-grid');
    if (trialCard && pricingGrid) {
      trialCard.classList.toggle('is-hidden', !canShowTrial);
      pricingGrid.classList.toggle('pricing-grid--single', !canShowTrial);
    }

    // 5.6 Invite-only / Sales paused / Trial disabled status notes in Hero
    var heroNote = qs('#hero-status-note');
    if (heroNote) {
      var notes = [];
      if (isInviteOnly && !isUser) {
        notes.push('Регистрация новых аккаунтов сейчас открыта только по приглашению (?invite=). Действующие клиенты могут войти и оформить подписку без ограничений.');
      }
      if (!state.trialEnabled && !state.salesPaused) {
        notes.push('Пробный период временно отключён в настройках панели. Доступны расчёт основного тарифа и открытая справка.');
      }
      if (state.salesPaused) {
        notes.push('Оформление новых покупок и пополнение баланса временно приостановлены. Действующие лицензии pgF продолжают работу.');
      }
      heroNote.textContent = notes.join(' ');
      heroNote.classList.toggle('is-hidden', notes.length === 0);
    }

    // 5.7 Public calculator vs Auth-only price gate
    var pricePublicBlock = qs('#price-public-block');
    var priceAuthGate = qs('#price-auth-gate');
    var planDemoBadge = qs('#plan-demo-badge');
    if (pricePublicBlock && priceAuthGate) {
      pricePublicBlock.classList.toggle('is-hidden', isAuthOnlyPrices);
      priceAuthGate.classList.toggle('is-hidden', !isAuthOnlyPrices);
    }
    if (planDemoBadge) {
      planDemoBadge.classList.toggle('is-hidden', isAuthOnlyPrices);
    }

    // 5.8 Private view registration note
    var privRegLink = qs('#private-register-link');
    var privInviteNote = qs('#private-invite-note');
    if (privRegLink && privInviteNote) {
      privRegLink.classList.toggle('is-hidden', isInviteOnly);
      privInviteNote.classList.toggle('is-hidden', !isInviteOnly);
    }

    // 5.9 Testimonials template section toggle
    var reviewsSection = qs('#reviews-template');
    if (reviewsSection) {
      reviewsSection.classList.toggle('is-hidden', !state.showReviewsTemplate);
    }

    updateCalculatorUI();
  }

  // --- 6. Checkout / Login / Register Flow Simulator (K2 / K3) ---
  function renderFlowModal() {
    var backdrop = qs('#flow-backdrop');
    var routeBadge = qs('#flow-route-badge');
    var titleEl = qs('#flow-modal-title');
    var cfgBox = qs('#flow-cfg-summary');
    var cfgText = qs('#flow-cfg-text');
    var cfgPrice = qs('#flow-cfg-price');
    var authView = qs('#flow-auth-view');
    var checkoutView = qs('#flow-checkout-view');
    var tabLogin = qs('#flow-tab-login');
    var tabReg = qs('#flow-tab-register');
    var inviteField = qs('#flow-invite-field');
    var authSubmit = qs('#flow-auth-submit');
    var authHint = qs('#flow-auth-hint');
    var authErr = qs('#flow-auth-error');

    if (!backdrop) return;
    backdrop.classList.toggle('is-hidden', !state.flowOpen);
    document.body.style.overflow = state.flowOpen ? 'hidden' : '';
    if (!state.flowOpen) return;

    var calc = calculatePricing();
    var cfg = state.flowCfg || encodeCfg();
    var hasCfg = state.flowNext === '/app/billing/checkout';
    var seoLabel = state.seoMode === 'included' ? 'SEO включён в тариф' : (calc.seoIncluded ? 'SEO-аудит вкл.' : 'SEO-аудит выкл.');

    if (cfgBox && cfgText && cfgPrice) {
      cfgBox.classList.toggle('is-hidden', !hasCfg);
      if (hasCfg) {
        cfgText.textContent = 'Срок: ' + calc.period.label + ' · Устройства: ' + calc.totalDevices + ' ПК · ' + seoLabel;
        cfgPrice.textContent = 'Предварительный итог: ' + formatRub(calc.netTotal) + ' (демо)';
      }
    }

    if (authErr) authErr.classList.add('is-hidden');

    if (state.flowMode === 'auth') {
      authView.classList.remove('is-hidden');
      checkoutView.classList.add('is-hidden');

      var isReg = state.flowAuthTab === 'register';
      var routePrefix = isReg ? '/register' : '/login';
      var nextQuery = '?next=' + encodeURIComponent(state.flowNext) + (hasCfg ? '&cfg=' + encodeURIComponent(cfg) : '');
      if (routeBadge) routeBadge.textContent = routePrefix + nextQuery;

      if (titleEl) {
        if (state.flowNext === '/#pricing') {
          titleEl.textContent = 'Вход для просмотра цен и расчёта';
        } else if (state.flowNext === 'trial') {
          titleEl.textContent = isReg ? 'Регистрация и оформление пробного периода' : 'Вход для оформления пробного периода';
        } else if (hasCfg) {
          titleEl.textContent = isReg ? 'Регистрация перед оформлением подписки' : 'Вход перед оформлением подписки';
        } else {
          titleEl.textContent = isReg ? 'Регистрация аккаунта pgF' : 'Вход в личный кабинет pgF';
        }
      }

      if (tabLogin && tabReg) {
        tabLogin.classList.toggle('is-active', !isReg);
        tabReg.classList.toggle('is-active', isReg);
        tabLogin.setAttribute('aria-selected', !isReg ? 'true' : 'false');
        tabReg.setAttribute('aria-selected', isReg ? 'true' : 'false');
        tabReg.textContent = state.registration === 'INVITE_ONLY' ? 'Регистрация (по приглашению)' : 'Регистрация (/register)';
      }

      if (inviteField) {
        inviteField.classList.toggle('is-hidden', !(isReg && state.registration === 'INVITE_ONLY'));
      }

      if (authSubmit) {
        if (state.flowNext === '/#pricing') {
          authSubmit.textContent = isReg ? 'Зарегистрироваться и вернуться к расчёту' : 'Войти и вернуться к расчёту';
        } else if (hasCfg) {
          authSubmit.textContent = isReg ? 'Зарегистрироваться и перейти к оформлению' : 'Войти и перейти к оформлению';
        } else {
          authSubmit.textContent = isReg ? 'Зарегистрироваться' : 'Войти';
        }
      }

      if (authHint) {
        if (state.flowNext === '/#pricing') {
          authHint.textContent = 'После успешной авторизации вы сразу вернётесь к калькулятору /#pricing с доступными ценами.';
        } else if (hasCfg) {
          authHint.textContent = 'Выбранные срок (' + calc.period.label + '), устройства (' + calc.totalDevices + ' ПК) и опция SEO сохранятся в параметре cfg и откроются сразу на оформлении.';
        } else {
          authHint.textContent = 'Локальная имитация авторизации для проверки переходов в статическом макете.';
        }
      }
    } else {
      // Checkout simulation view (/app/billing/checkout?cfg=...)
      authView.classList.add('is-hidden');
      checkoutView.classList.remove('is-hidden');

      var checkoutPath = state.flowNext === 'trial'
        ? '/app/billing/checkout?trial=1'
        : '/app/billing/checkout?cfg=' + cfg;

      if (routeBadge) routeBadge.textContent = checkoutPath;
      if (titleEl) {
        titleEl.textContent = state.flowNext === 'trial'
          ? 'Оформление пробного периода (14 дней*)'
          : 'Оформление подписки pgF';
      }

      var cfgCodeEl = qs('#flow-checkout-cfg-code');
      if (cfgCodeEl) {
        cfgCodeEl.textContent = state.flowNext === 'trial' ? 'trial=1' : 'cfg=' + cfg;
      }

      var rowsEl = qs('#flow-checkout-rows');
      if (rowsEl) {
        if (state.flowNext === 'trial') {
          rowsEl.innerHTML =
            '<tr><td style="color:var(--text-muted);">Тип лицензии</td><td>Пробный период (демо-срок 14 дней*)</td></tr>' +
            '<tr><td style="color:var(--text-muted);">Устройства</td><td>1 ПК (сменить ПК на триале нельзя)</td></tr>' +
            '<tr><td style="color:var(--text-muted);">Подтверждение email</td><td>Обязательно перед активацией</td></tr>' +
            '<tr><td style="color:var(--text-muted);">К оплате</td><td><strong>0 ₽</strong></td></tr>';
        } else {
          var html =
            '<tr><td style="color:var(--text-muted);">Срок подписки</td><td><strong>' + calc.period.label + '</strong></td></tr>' +
            '<tr><td style="color:var(--text-muted);">Количество устройств</td><td><strong>' + calc.totalDevices + ' ПК</strong> (база 1 + доп. ' + state.extraDevices + ')</td></tr>' +
            '<tr><td style="color:var(--text-muted);">Опция SEO-аудита</td><td><strong>' + seoLabel + '</strong></td></tr>' +
            '<tr><td style="color:var(--text-muted);">Стоимость конфигурации</td><td>' + formatRub(calc.grossTotal) + '</td></tr>';
          if (calc.personalDiscountAmt > 0) {
            html += '<tr><td style="color:var(--text-muted);">Персональная скидка (10%)</td><td>−' + formatRub(calc.personalDiscountAmt) + '</td></tr>';
          }
          if (calc.promoDiscountAmt > 0) {
            html += '<tr><td style="color:var(--text-muted);">Промокод (' + state.promoCode + ')</td><td>−' + formatRub(calc.promoDiscountAmt) + '</td></tr>';
          }
          if (calc.bonusAppliedAmt > 0) {
            html += '<tr><td style="color:var(--text-muted);">Списание с бонусного баланса</td><td>−' + formatRub(calc.bonusAppliedAmt) + '</td></tr>';
          }
          html += '<tr><td style="color:var(--text-muted);">Итого к оплате (демо)</td><td><strong style="font-size:15px;">' + formatRub(calc.netTotal) + '</strong></td></tr>';
          rowsEl.innerHTML = html;
        }
      }

      var invoiceBox = qs('#flow-invoice-created');
      var createInvoiceBtn = qs('#flow-create-invoice-btn');
      if (invoiceBox) invoiceBox.classList.add('is-hidden');
      if (createInvoiceBtn) {
        createInvoiceBtn.textContent = state.flowNext === 'trial' ? 'Активировать пробный период (демо)' : 'Выставить счёт (демо)';
        createInvoiceBtn.disabled = false;
      }
    }
  }

  function openFlow(mode, nextTarget, cfg) {
    state.flowOpen = true;
    state.flowMode = mode;
    state.flowAuthTab = 'login';
    state.flowNext = nextTarget || '/app/billing/checkout';
    state.flowCfg = cfg || encodeCfg();
    renderFlowModal();
  }

  function closeFlow() {
    state.flowOpen = false;
    renderFlowModal();
  }

  function syncPreviewPanelInputs() {
    var visSelect = qs('#ctrl-visibility');
    var authSelect = qs('#ctrl-auth');
    var regSelect = qs('#ctrl-registration');
    var seoSelect = qs('#ctrl-seo-mode');
    var trialChk = qs('#ctrl-trial');
    var pausedChk = qs('#ctrl-paused');
    var maintChk = qs('#ctrl-maintenance');
    var reviewsChk = qs('#ctrl-reviews');
    var invalidChk = qs('#ctrl-invalid-cfg');

    if (visSelect) visSelect.value = state.visibility;
    if (authSelect) authSelect.value = state.auth;
    if (regSelect) regSelect.value = state.registration;
    if (seoSelect) seoSelect.value = state.seoMode;
    if (trialChk) trialChk.checked = state.trialEnabled;
    if (pausedChk) pausedChk.checked = state.salesPaused;
    if (maintChk) maintChk.checked = state.maintenance;
    if (reviewsChk) reviewsChk.checked = state.showReviewsTemplate;
    if (invalidChk) invalidChk.checked = state.invalidConfigDemo;
  }

  function initFlowModal() {
    var closeBtn = qs('#flow-close-btn');
    var backdrop = qs('#flow-backdrop');
    var tabLogin = qs('#flow-tab-login');
    var tabReg = qs('#flow-tab-register');
    var authForm = qs('#flow-auth-form');
    var createInvBtn = qs('#flow-create-invoice-btn');
    var backToCalcBtn = qs('#flow-back-to-calc-btn');
    var buyBtn = qs('#buy-subscription-btn');
    var trialBtn = qs('#trial-start-btn');
    var loginForPricesBtn = qs('#login-to-see-prices-btn');

    if (closeBtn) closeBtn.addEventListener('click', closeFlow);
    if (backdrop) {
      backdrop.addEventListener('click', function (e) {
        if (e.target === backdrop) closeFlow();
      });
    }
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && state.flowOpen) closeFlow();
    });

    if (tabLogin) {
      tabLogin.addEventListener('click', function () {
        state.flowAuthTab = 'login';
        renderFlowModal();
      });
    }
    if (tabReg) {
      tabReg.addEventListener('click', function () {
        state.flowAuthTab = 'register';
        renderFlowModal();
      });
    }

    if (buyBtn) {
      buyBtn.addEventListener('click', function () {
        if (buyBtn.disabled || getUnavailableMessage()) return;
        var cfg = encodeCfg();
        if (state.auth === 'user') {
          openFlow('checkout', '/app/billing/checkout', cfg);
        } else {
          openFlow('auth', '/app/billing/checkout', cfg);
        }
      });
    }

    if (trialBtn) {
      trialBtn.addEventListener('click', function () {
        if (trialBtn.disabled) return;
        if (state.auth === 'user') {
          openFlow('checkout', 'trial', '');
        } else {
          openFlow('auth', 'trial', '');
        }
      });
    }

    if (loginForPricesBtn) {
      loginForPricesBtn.addEventListener('click', function (e) {
        e.preventDefault();
        openFlow('auth', '/#pricing', '');
      });
    }

    if (authForm) {
      authForm.addEventListener('submit', function (e) {
        e.preventDefault();
        var authErr = qs('#flow-auth-error');
        if (state.flowAuthTab === 'register' && state.registration === 'INVITE_ONLY') {
          var invVal = (qs('#flow-invite-input') && qs('#flow-invite-input').value || '').trim();
          if (!invVal) {
            if (authErr) {
              authErr.textContent = 'При закрытой регистрации укажите действующий код приглашения (например, INVITE-DEMO).';
              authErr.classList.remove('is-hidden');
            }
            return;
          }
        }

        // Log user in
        state.auth = 'user';
        syncPreviewPanelInputs();
        applyStorefrontState();

        if (state.flowNext === '/#pricing') {
          closeFlow();
          var pricingSec = qs('#pricing');
          if (pricingSec) pricingSec.scrollIntoView({ behavior: 'smooth' });
        } else if (state.flowNext === '/app/billing/checkout' || state.flowNext === 'trial') {
          state.flowMode = 'checkout';
          renderFlowModal();
        } else {
          closeFlow();
          showRouteToast('/app (вход выполнен)');
        }
      });
    }

    if (createInvBtn) {
      createInvBtn.addEventListener('click', function () {
        var invoiceBox = qs('#flow-invoice-created');
        if (invoiceBox) invoiceBox.classList.remove('is-hidden');
        createInvBtn.disabled = true;
      });
    }

    if (backToCalcBtn) {
      backToCalcBtn.addEventListener('click', function () {
        closeFlow();
        var pricingSec = qs('#pricing');
        if (pricingSec) pricingSec.scrollIntoView({ behavior: 'smooth' });
      });
    }
  }

  // --- 7. Preview Controls & URL State Presets ---
  function initPreviewControls() {
    var root = qs('#preview-controls');
    if (!root) return;

    var params = new URLSearchParams(window.location.search);
    if (params.get('clean') === '1') {
      root.classList.add('is-hidden');
    }
    if (params.get('reviews') === '0') {
      state.showReviewsTemplate = false;
    }

    var preset = params.get('state');
    if (preset === 'prices_auth') {
      state.visibility = 'PUBLIC_PRICES_AUTH_ONLY';
    } else if (preset === 'private') {
      state.visibility = 'PRIVATE_AUTH_ONLY';
    } else if (preset === 'maintenance') {
      state.maintenance = true;
      state.trialEnabled = false;
    } else if (preset === 'paused') {
      state.salesPaused = true;
      state.trialEnabled = false;
    } else if (preset === 'invite') {
      state.registration = 'INVITE_ONLY';
    } else if (preset === 'user') {
      state.auth = 'user';
    }

    var seoParam = params.get('seo');
    if (seoParam === 'included' || seoParam === 'disabled' || seoParam === 'addon') {
      state.seoMode = seoParam;
    }
    if (params.get('invalid') === '1') {
      state.invalidConfigDemo = true;
    }
    if (params.get('cfg')) {
      parseAndApplyCfg(params.get('cfg'));
    }

    syncPreviewPanelInputs();

    var toggleBtn = qs('#preview-toggle-btn');
    var visSelect = qs('#ctrl-visibility');
    var authSelect = qs('#ctrl-auth');
    var regSelect = qs('#ctrl-registration');
    var seoSelect = qs('#ctrl-seo-mode');
    var trialChk = qs('#ctrl-trial');
    var pausedChk = qs('#ctrl-paused');
    var maintChk = qs('#ctrl-maintenance');
    var reviewsChk = qs('#ctrl-reviews');
    var invalidChk = qs('#ctrl-invalid-cfg');

    if (toggleBtn) {
      toggleBtn.addEventListener('click', function () {
        var open = !root.classList.contains('is-open');
        root.classList.toggle('is-open', open);
        toggleBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
      });
    }

    if (visSelect) {
      visSelect.addEventListener('change', function () {
        state.visibility = visSelect.value;
        applyStorefrontState();
      });
    }
    if (authSelect) {
      authSelect.addEventListener('change', function () {
        state.auth = authSelect.value;
        applyStorefrontState();
      });
    }
    if (regSelect) {
      regSelect.addEventListener('change', function () {
        state.registration = regSelect.value;
        applyStorefrontState();
      });
    }
    if (seoSelect) {
      seoSelect.addEventListener('change', function () {
        state.seoMode = seoSelect.value;
        state.requestedUnavailableMsg = '';
        applyStorefrontState();
      });
    }
    if (trialChk) {
      trialChk.addEventListener('change', function () {
        state.trialEnabled = !!trialChk.checked;
        applyStorefrontState();
      });
    }
    if (pausedChk) {
      pausedChk.addEventListener('change', function () {
        state.salesPaused = !!pausedChk.checked;
        applyStorefrontState();
      });
    }
    if (maintChk) {
      maintChk.addEventListener('change', function () {
        state.maintenance = !!maintChk.checked;
        applyStorefrontState();
      });
    }
    if (reviewsChk) {
      reviewsChk.addEventListener('change', function () {
        state.showReviewsTemplate = !!reviewsChk.checked;
        applyStorefrontState();
      });
    }
    if (invalidChk) {
      invalidChk.addEventListener('change', function () {
        state.invalidConfigDemo = !!invalidChk.checked;
        applyStorefrontState();
      });
    }

    applyStorefrontState();
  }

  // --- 8. Route Preview Toast & Anchor Handling ---
  var toastTimer = null;
  function showRouteToast(routeText) {
    var toast = qs('#route-toast');
    if (!toast) return;
    toast.innerHTML = 'Переход в PANEL-V2: <code>' + routeText + '</code> (статический макет главной <code>/</code>)';
    toast.classList.add('is-visible');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () {
      toast.classList.remove('is-visible');
    }, 3200);
  }

  function initRoutePreviewToast() {
    document.addEventListener('click', function (e) {
      var link = e.target.closest('a');
      if (!link) return;

      // Disabled anchors must never navigate
      if (link.classList.contains('btn--disabled') || link.getAttribute('aria-disabled') === 'true') {
        e.preventDefault();
        return;
      }

      var href = link.getAttribute('href') || '';
      if (!href || href.charAt(0) === '#') return;

      // Auth-only pricing CTA -> open login modal returning to /#pricing
      if (link.hasAttribute('data-primary-pricing-cta') && state.visibility === 'PUBLIC_PRICES_AUTH_ONLY' && state.auth === 'guest') {
        e.preventDefault();
        openFlow('auth', '/#pricing', '');
        return;
      }

      // Guest login link -> open auth modal
      if (link.hasAttribute('data-auth-link') && state.auth === 'guest') {
        e.preventDefault();
        openFlow('auth', '/app', '');
        return;
      }

      // In standalone file:// or GitHub Pages static preview, show target route instead of 404
      if (href.charAt(0) === '/' && (window.location.protocol === 'file:' || window.location.hostname.indexOf('github.io') !== -1)) {
        e.preventDefault();
        showRouteToast(href);
      }
    });

    // Private storefront login form simulation
    var privForm = qs('#private-login-form');
    if (privForm) {
      privForm.addEventListener('submit', function (e) {
        e.preventDefault();
        state.auth = 'user';
        syncPreviewPanelInputs();
        applyStorefrontState();
        showRouteToast('/app (вход из закрытой витрины)');
      });
    }
  }

  // --- Boot ---
  document.addEventListener('DOMContentLoaded', function () {
    initShowcaseTabs();
    initMobileNav();
    initFaq();
    initCalculator();
    initFlowModal();
    initPreviewControls();
    initRoutePreviewToast();
  });
})();
