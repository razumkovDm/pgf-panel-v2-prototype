/* ==========================================================================
   pgF PANEL-V2 — Checkout & Manual Invoice Mockup Logic (#609)
   Zero dependencies. Uses #604 DEMO_PLAN_CONFIG rates & cfg format.
   Covers K1 (config + mobile + unavailable), K2 (invoice lifecycle, price lock,
   timely proof after timer expiry, expired vs late payment), K3 (Slice 3 vs 4,
   balance sufficient/insufficient, discounts/promo/bonus priority, combined
   reserve, auto-renewal default).
   ========================================================================== */

(function () {
  'use strict';

  var DEMO_PLAN_CONFIG = {
    currency: 'RUB',
    currencySymbol: '₽',
    baseDevicesIncluded: 1,
    maxExtraDevices: 9,
    periods: {
      30:  { days: 30,  label: '30 дней',  basePrice: 2900,  extraDevicePrice: 700,  seoPrice: 1200 },
      90:  { days: 90,  label: '90 дней',  basePrice: 8100,  extraDevicePrice: 1950, seoPrice: 3300 },
      180: { days: 180, label: '180 дней', basePrice: 15000, extraDevicePrice: 3600, seoPrice: 6000 },
      365: { days: 365, label: '365 дней', basePrice: 27600, extraDevicePrice: 6600, seoPrice: 10800 }
    },
    personalDiscountPct: 10,
    promoCodes: {
      PGF500: { code: 'PGF500', type: 'fixed', value: 500, label: 'Промокод PGF500 (−500 ₽)' },
      START5: { code: 'START5', type: 'pct',   value: 5,   label: 'Промокод START5 (−5%)' }
    },
    channels: {
      usdt_trc20: {
        name: 'Криптовалюта USDT (сеть TRC-20)',
        reqLabel: 'Адрес кошелька USDT (TRC-20)',
        address: 'TScenorDemoWallet7x9K2mP4qR8vN3wJ1'
      },
      bank_rub: {
        name: 'Банковский перевод (СБП / карта, RUB)',
        reqLabel: 'Номер счёта / СБП (демо-реквизиты)',
        address: '40817 8100 0000 1234 5678 · СБП +7 (900) 000-01-42'
      }
    }
  };

  var BALANCE_PRESETS = {
    sufficient:   { bonus: 500, main: 4000, label: 'Хватает (4 500 ₽)' },
    insufficient: { bonus: 500, main: 1500, label: 'Не хватает (2 000 ₽)' }
  };

  var state = {
    view: 'checkout', // checkout | invoice | paid
    slice: 3,         // 3 | 4
    cfgRaw: '30d-2pc-seo1',
    periodDays: 30,
    extraDevices: 1,
    includeSeo: true,
    seoDisabledByPlan: false,
    unavailableReason: '',

    priceBumpActive: false, // simulates +20% tariff change in /admin/plans
    editorOpen: false,      // inline configuration editor panel

    // Slice 4 state
    balancePreset: 'sufficient', // sufficient | insufficient
    promoCode: 'PGF500',
    promoFeedback: 'Применён промокод PGF500 (−500 ₽, только для новой лицензии).',
    promoIsError: false,
    paymentMethod: 'direct', // direct | balance | combined
    paymentChannel: 'usdt_trc20',

    // Active Invoice (K2)
    invoice: null,
    // Paid receipt
    paidResult: null
  };

  var toastTimer = null;

  function qs(sel) {
    return document.querySelector(sel);
  }

  function qsa(sel) {
    return Array.prototype.slice.call(document.querySelectorAll(sel));
  }

  function formatRub(amount) {
    var rounded = Math.round(amount);
    var sign = rounded < 0 ? '−' : '';
    var abs = Math.abs(rounded).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '\u00a0');
    return sign + abs + '\u00a0' + DEMO_PLAN_CONFIG.currencySymbol;
  }

  function announce(msg) {
    var el = qs('#sr-announcer');
    if (el) {
      el.textContent = '';
      setTimeout(function () {
        el.textContent = msg;
      }, 20);
    }
  }

  function showToast(msg) {
    var el = qs('#toast');
    if (!el) return;
    el.textContent = msg;
    el.classList.remove('is-hidden');
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(function () {
      el.classList.add('is-hidden');
    }, 3200);
    announce(msg);
  }

  function encodeCfg() {
    var totalPc = DEMO_PLAN_CONFIG.baseDevicesIncluded + state.extraDevices;
    var seoFlag = state.includeSeo ? '1' : '0';
    return state.periodDays + 'd-' + totalPc + 'pc-seo' + seoFlag;
  }

  function applyCfgPreset(val) {
    state.seoDisabledByPlan = false;
    state.unavailableReason = '';

    if (val === 'unavailable-seo') {
      state.cfgRaw = '30d-2pc-seo1';
      state.periodDays = 30;
      state.extraDevices = 1;
      state.includeSeo = true;
      state.seoDisabledByPlan = true;
      state.unavailableReason = 'Выбранная в калькуляторе опция SEO-аудита (seo1) отключена в текущих настройках тарифа. Вернитесь к калькулятору, чтобы снять SEO, или переключитесь на доступную конфигурацию.';
      return;
    }

    var m = /^(\d+)d-(\d+)pc-seo([01])$/.exec(String(val || '').trim());
    if (!m) {
      state.cfgRaw = String(val || '');
      state.unavailableReason = 'Передана некорректная строка конфигурации «' + state.cfgRaw + '». Вернитесь к калькулятору тарифа и выберите параметры заново.';
      return;
    }

    var days = parseInt(m[1], 10);
    var totalPc = parseInt(m[2], 10);
    var seoReq = m[3] === '1';

    if (!DEMO_PLAN_CONFIG.periods[days]) {
      state.cfgRaw = val;
      state.unavailableReason = 'Срок подписки ' + days + ' дн. недоступен в текущих настройках тарифа (доступны: 30, 90, 180, 365 дн.).';
      return;
    }

    var extra = totalPc - DEMO_PLAN_CONFIG.baseDevicesIncluded;
    if (extra < 0 || extra > DEMO_PLAN_CONFIG.maxExtraDevices) {
      state.cfgRaw = val;
      state.unavailableReason = 'Количество устройств (' + totalPc + ' ПК) превышает допустимый лимит тарифа (1–' + (1 + DEMO_PLAN_CONFIG.maxExtraDevices) + ' ПК).';
      return;
    }

    state.periodDays = days;
    state.extraDevices = extra;
    state.includeSeo = seoReq;
    state.cfgRaw = encodeCfg();
  }

  function getCurrentPricing() {
    var p = DEMO_PLAN_CONFIG.periods[state.periodDays] || DEMO_PLAN_CONFIG.periods[30];
    var mult = state.priceBumpActive ? 1.2 : 1;

    var basePrice = Math.round(p.basePrice * mult);
    var extraPrice = Math.round(state.extraDevices * p.extraDevicePrice * mult);
    var seoPrice = state.includeSeo ? Math.round(p.seoPrice * mult) : 0;
    var grossTotal = basePrice + extraPrice + seoPrice;

    var personalDiscount = 0;
    var promoDiscount = 0;
    var netAfterDiscounts = grossTotal;

    var bal = BALANCE_PRESETS[state.balancePreset] || BALANCE_PRESETS.sufficient;
    var bonusAvail = bal.bonus;
    var mainAvail = bal.main;
    var totalAvail = bonusAvail + mainAvail;

    if (state.slice === 4) {
      personalDiscount = Math.round(grossTotal * (DEMO_PLAN_CONFIG.personalDiscountPct / 100));
      netAfterDiscounts = Math.max(0, grossTotal - personalDiscount);

      var promoObj = state.promoCode ? DEMO_PLAN_CONFIG.promoCodes[state.promoCode] : null;
      if (promoObj) {
        if (promoObj.type === 'fixed') {
          promoDiscount = Math.min(netAfterDiscounts, promoObj.value);
        } else if (promoObj.type === 'pct') {
          promoDiscount = Math.round(netAfterDiscounts * (promoObj.value / 100));
        }
        netAfterDiscounts = Math.max(0, netAfterDiscounts - promoDiscount);
      }
    }

    // Bonus-first split for balance or combined
    var bonusSpent = 0;
    var mainSpent = 0;
    var invoiceRemainder = netAfterDiscounts;
    var balanceSufficient = totalAvail >= netAfterDiscounts;
    var shortfall = Math.max(0, netAfterDiscounts - totalAvail);

    if (state.slice === 4) {
      if (state.paymentMethod === 'balance') {
        if (balanceSufficient) {
          bonusSpent = Math.min(bonusAvail, netAfterDiscounts);
          mainSpent = Math.max(0, netAfterDiscounts - bonusSpent);
          invoiceRemainder = 0;
        } else {
          bonusSpent = bonusAvail;
          mainSpent = mainAvail;
          invoiceRemainder = shortfall;
        }
      } else if (state.paymentMethod === 'combined') {
        bonusSpent = Math.min(bonusAvail, netAfterDiscounts);
        var afterBonus = Math.max(0, netAfterDiscounts - bonusSpent);
        mainSpent = Math.min(mainAvail, afterBonus);
        invoiceRemainder = Math.max(0, netAfterDiscounts - bonusSpent - mainSpent);
      } else {
        // direct invoice in Slice 4: no balance spent, discounts still apply to order
        bonusSpent = 0;
        mainSpent = 0;
        invoiceRemainder = netAfterDiscounts;
      }
    }

    return {
      periodDays: p.days,
      periodLabel: p.label,
      totalDevices: DEMO_PLAN_CONFIG.baseDevicesIncluded + state.extraDevices,
      extraDevices: state.extraDevices,
      includeSeo: state.includeSeo,
      basePrice: basePrice,
      extraPrice: extraPrice,
      seoPrice: seoPrice,
      grossTotal: grossTotal,
      personalDiscount: personalDiscount,
      promoDiscount: promoDiscount,
      promoCode: state.slice === 4 ? state.promoCode : '',
      netAfterDiscounts: netAfterDiscounts,
      bonusAvail: bonusAvail,
      mainAvail: mainAvail,
      totalAvail: totalAvail,
      bonusSpent: bonusSpent,
      mainSpent: mainSpent,
      heldTotal: bonusSpent + mainSpent,
      invoiceRemainder: invoiceRemainder,
      balanceSufficient: balanceSufficient,
      shortfall: shortfall,
      priceBumpActive: state.priceBumpActive
    };
  }

  function makeRow(label, value, extraClass) {
    var row = document.createElement('div');
    row.className = 'kv-row' + (extraClass ? ' ' + extraClass : '');
    var l = document.createElement('span');
    l.className = 'kv-row__label';
    l.textContent = label;
    var v = document.createElement('span');
    v.className = 'kv-row__value tabular';
    v.textContent = value;
    row.appendChild(l);
    row.appendChild(v);
    return row;
  }

  function renderPills(container, periodLabel, totalDevices, extraDevices, includeSeo, seoDisabled) {
    container.innerHTML = '';
    var pills = [
      'Срок: ' + periodLabel,
      'Устройства: ' + totalDevices + ' ПК (база 1' + (extraDevices > 0 ? ' + доп. ' + extraDevices : '') + ')',
      includeSeo ? (seoDisabled ? 'SEO-аудит: недоступен' : 'SEO-аудит: включён') : 'SEO-аудит: без опции'
    ];
    pills.forEach(function (text) {
      var span = document.createElement('span');
      span.className = 'config-pill';
      span.textContent = text;
      container.appendChild(span);
    });
  }

  function renderBreakdown(container, pr, opts) {
    opts = opts || {};
    container.innerHTML = '';
    container.appendChild(makeRow('Базовый тариф (1 ПК, ' + pr.periodLabel + ')', formatRub(pr.basePrice)));
    if (pr.extraDevices > 0) {
      container.appendChild(makeRow('Доп. устройства (+' + pr.extraDevices + ' ПК)', formatRub(pr.extraPrice)));
    } else {
      container.appendChild(makeRow('Доп. устройства', '0 ₽', 'kv-row--muted'));
    }
    if (pr.includeSeo) {
      container.appendChild(makeRow('Модуль SEO-аудита (на всю лицензию)', formatRub(pr.seoPrice)));
    } else {
      container.appendChild(makeRow('Модуль SEO-аудита', 'Не выбран', 'kv-row--muted'));
    }

    if (opts.slice === 4) {
      if (pr.personalDiscount > 0) {
        container.appendChild(makeRow('Персональная скидка (' + DEMO_PLAN_CONFIG.personalDiscountPct + '%)', formatRub(-pr.personalDiscount), 'kv-row--discount'));
      }
      if (pr.promoDiscount > 0 && pr.promoCode) {
        container.appendChild(makeRow('Промокод ' + pr.promoCode + ' (новая лицензия)', formatRub(-pr.promoDiscount), 'kv-row--discount'));
      }
      if (opts.paymentMethod === 'balance') {
        container.appendChild(makeRow('Списание бонусов (1-я очередь)', formatRub(-pr.bonusSpent), 'kv-row--discount'));
        container.appendChild(makeRow('Списание основных средств (2-я очередь)', formatRub(-pr.mainSpent)));
      } else if (opts.paymentMethod === 'combined') {
        container.appendChild(makeRow('Резерв бонусов (held_minor, 1-я очередь)', formatRub(-pr.bonusSpent), 'kv-row--discount'));
        container.appendChild(makeRow('Резерв основных средств (held_minor)', formatRub(-pr.mainSpent)));
      }
    }
  }

  function renderDemoBar() {
    qs('#demo-slice-3').setAttribute('aria-pressed', state.slice === 3 ? 'true' : 'false');
    qs('#demo-slice-4').setAttribute('aria-pressed', state.slice === 4 ? 'true' : 'false');

    var isUnavailable = !!state.unavailableReason;
    qs('#demo-cfg-1').setAttribute('aria-pressed', !isUnavailable && encodeCfg() === '30d-2pc-seo1' ? 'true' : 'false');
    qs('#demo-cfg-2').setAttribute('aria-pressed', !isUnavailable && encodeCfg() === '90d-1pc-seo0' ? 'true' : 'false');
    qs('#demo-cfg-bad').setAttribute('aria-pressed', isUnavailable ? 'true' : 'false');

    var balGroup = qs('#demo-balance-group');
    balGroup.classList.toggle('is-hidden', state.slice !== 4);
    qs('#demo-bal-ok').setAttribute('aria-pressed', state.balancePreset === 'sufficient' ? 'true' : 'false');
    qs('#demo-bal-low').setAttribute('aria-pressed', state.balancePreset === 'insufficient' ? 'true' : 'false');

    var bumpBtn = qs('#demo-price-bump');
    bumpBtn.setAttribute('aria-pressed', state.priceBumpActive ? 'true' : 'false');
    bumpBtn.textContent = state.priceBumpActive ? '✓ Цена тарифа +20% (сбросить)' : 'Цена тарифа +20%';
  }

  function renderHeader() {
    var routePill = qs('#active-route-pill');
    var bc = qs('#breadcrumb-current');
    var title = qs('#page-title');
    var subtitle = qs('#page-subtitle');
    var sliceBadge = qs('#slice-badge');

    sliceBadge.textContent = state.slice === 3
      ? 'Срез 3 · Прямой ручной счёт'
      : 'Срез 4 · Баланс, скидки и автопродление';

    var navCheckout = qs('#nav-checkout');
    var navLicenses = qs('#nav-licenses');
    navCheckout.classList.toggle('sidebar__link--active', state.view !== 'paid');
    navLicenses.classList.toggle('sidebar__link--active', state.view === 'paid');

    if (state.view === 'checkout') {
      routePill.textContent = '/app/billing/checkout?cfg=' + state.cfgRaw;
      bc.textContent = 'Оформление подписки';
      title.textContent = 'Оформление подписки';
      subtitle.textContent = 'Проверьте перенесённую конфигурацию из калькулятора и выберите способ оплаты новой лицензии.';
    } else if (state.view === 'invoice' && state.invoice) {
      routePill.textContent = '/app/billing/invoices/' + state.invoice.id;
      bc.textContent = 'Счёт ' + state.invoice.id;
      title.textContent = 'Оплата по счёту ' + state.invoice.id;
      subtitle.textContent = 'Цена, валюта и состав заказа зафиксированы при выставлении счёта на 24 часа.';
    } else if (state.view === 'paid') {
      routePill.textContent = '/app/licenses';
      bc.textContent = 'Мои лицензии';
      title.textContent = 'Оплата подтверждена';
      subtitle.textContent = 'Новая лицензия активирована и доступна в разделе «Мои лицензии».';
    }
  }

  function renderCheckoutView() {
    var pr = getCurrentPricing();
    var isUnavailable = !!state.unavailableReason;

    // Alerts
    var unavailAlert = qs('#unavailable-alert');
    unavailAlert.classList.toggle('is-hidden', !isUnavailable);
    if (isUnavailable) {
      qs('#unavailable-text').textContent = state.unavailableReason;
      qs('#unavailable-edit-link').setAttribute('href', '../landing/index.html?cfg=' + encodeURIComponent(state.cfgRaw) + '#pricing');
    }

    qs('#checkout-price-bump-alert').classList.toggle('is-hidden', !state.priceBumpActive);
    if (state.priceBumpActive) {
      var pBase = DEMO_PLAN_CONFIG.periods[state.periodDays] || DEMO_PLAN_CONFIG.periods[30];
      var baseGross = pBase.basePrice + state.extraDevices * pBase.extraDevicePrice + (state.includeSeo ? pBase.seoPrice : 0);
      qs('#checkout-price-bump-text').textContent =
        'Счёт ещё не выставлен, поэтому предварительный расчёт пересчитан: базовая сумма ' + formatRub(baseGross) +
        ' → новая цена каталога (+20%) ' + formatRub(pr.grossTotal) +
        '. После нажатия «Выставить счёт» сумма и состав фиксируются на 24 часа.';
    }

    // Slice 3 vs Slice 4 blocks
    qs('#slice3-info-box').classList.toggle('is-hidden', state.slice !== 3);
    qs('#slice4-conditions-card').classList.toggle('is-hidden', state.slice !== 4);
    qs('#slice4-autorenew-card').classList.toggle('is-hidden', state.slice !== 4);
    qs('#method-balance-card').classList.toggle('is-hidden', state.slice !== 4);
    qs('#method-combined-card').classList.toggle('is-hidden', state.slice !== 4);

    if (state.slice === 3 && state.paymentMethod !== 'direct') {
      state.paymentMethod = 'direct';
    }

    // Balance tiles & promo feedback
    if (state.slice === 4) {
      qs('#bonus-balance-val').textContent = formatRub(pr.bonusAvail);
      qs('#main-balance-val').textContent = formatRub(pr.mainAvail);
      qs('#total-balance-val').textContent = formatRub(pr.totalAvail);

      var promoStatus = qs('#promo-status');
      promoStatus.textContent = state.promoFeedback;
      promoStatus.style.color = state.promoIsError ? 'var(--status-err-text)' : 'var(--status-ok-text)';

      // Balance method badge & shortfall
      var balBadge = qs('#method-balance-badge');
      var shortfallBox = qs('#balance-shortfall-box');
      if (pr.balanceSufficient) {
        balBadge.className = 'badge badge--ok';
        balBadge.textContent = 'Достаточно средств';
        shortfallBox.classList.add('is-hidden');
        qs('#method-balance-desc').textContent =
          'Списание по приоритету: бонусы ' + formatRub(pr.bonusSpent) + ' + основные ' + formatRub(pr.mainSpent) + '. Лицензия выдаётся сразу.';
      } else {
        balBadge.className = 'badge badge--err';
        balBadge.textContent = 'Не хватает ' + formatRub(pr.shortfall);
        shortfallBox.classList.remove('is-hidden');
        qs('#balance-shortfall-title').textContent = 'Недостаточно средств на балансе — не хватает ' + formatRub(pr.shortfall);
        qs('#balance-shortfall-text').textContent =
          'Доступно ' + formatRub(pr.totalAvail) + ' (бонусы ' + formatRub(pr.bonusAvail) + ' + основные ' + formatRub(pr.mainAvail) + '), а к оплате ' + formatRub(pr.netAfterDiscounts) + '. Кнопка оплаты с баланса отключена: выберите прямой счёт или комбинированную оплату с резервом баланса.';
        qs('#method-balance-desc').textContent =
          'Для полной оплаты с баланса не хватает ' + formatRub(pr.shortfall) + '.';
      }

      // Combined description
      var combBonus = Math.min(pr.bonusAvail, pr.netAfterDiscounts);
      var combMain = Math.min(pr.mainAvail, Math.max(0, pr.netAfterDiscounts - combBonus));
      var combRem = Math.max(0, pr.netAfterDiscounts - combBonus - combMain);
      qs('#method-combined-desc').textContent =
        'Резерв с баланса (held_minor): бонусы ' + formatRub(combBonus) + ' + основные ' + formatRub(combMain) +
        ' = ' + formatRub(combBonus + combMain) + '; на остаток ' + formatRub(combRem) +
        ' выставляется ручной счёт на 24 ч. При истечении или отклонении счёта резерв разблокируется.';
    }

    // Radio selection highlight
    var methods = ['balance', 'combined', 'direct'];
    methods.forEach(function (m) {
      var radio = qs('#method-' + m + '-radio');
      var card = qs('#method-' + m + '-card');
      var selected = state.paymentMethod === m;
      radio.checked = selected;
      card.classList.toggle('method-option--selected', selected);
    });

    // Channel selector shown for direct or combined
    var needsInvoiceChannel = state.paymentMethod === 'direct' || state.paymentMethod === 'combined';
    qs('#channel-selector-wrap').classList.toggle('is-hidden', !needsInvoiceChannel);
    qs('#payment-channel-select').value = state.paymentChannel;

    // Order Summary (Right column)
    var editHref = '../landing/index.html?cfg=' + encodeURIComponent(state.cfgRaw) + '#pricing';
    qs('#edit-config-link').setAttribute('href', editHref);
    qs('#mobile-pricing-link').setAttribute('href', editHref);
    qs('#nav-pricing').setAttribute('href', editHref);
    qs('#edit-config-route-hint').innerHTML = 'Калькулятор с выбранным cfg: <code class="mono">/#pricing?cfg=' + state.cfgRaw + '</code>';

    // Inline Configuration Editor sync
    var toggleBtn = qs('#edit-config-toggle-btn');
    var editorPanel = qs('#inline-config-editor');
    toggleBtn.setAttribute('aria-expanded', state.editorOpen ? 'true' : 'false');
    toggleBtn.textContent = state.editorOpen ? 'Свернуть редактирование' : 'Изменить конфигурацию';
    editorPanel.classList.toggle('is-hidden', !state.editorOpen);

    qsa('[data-edit-period]').forEach(function (btn) {
      var days = parseInt(btn.getAttribute('data-edit-period'), 10);
      btn.setAttribute('aria-pressed', days === state.periodDays ? 'true' : 'false');
    });
    qs('#edit-devices-val').textContent =
      pr.totalDevices + ' ПК' + (state.extraDevices > 0 ? ' (+' + state.extraDevices + ' доп.)' : ' (база)');
    qs('#edit-devices-minus').disabled = state.extraDevices <= 0;
    qs('#edit-devices-plus').disabled = state.extraDevices >= DEMO_PLAN_CONFIG.maxExtraDevices;

    var seoCheckbox = qs('#edit-seo-checkbox');
    var seoHint = qs('#edit-seo-hint');
    seoCheckbox.checked = state.includeSeo;
    if (state.seoDisabledByPlan) {
      seoHint.textContent = state.includeSeo
        ? 'Опция SEO отключена по тарифу — снимите галочку, чтобы разблокировать оформление.'
        : 'Опция SEO отключена по текущим настройкам тарифа.';
      seoHint.classList.remove('is-hidden');
    } else {
      seoHint.classList.add('is-hidden');
    }

    renderPills(qs('#order-config-pills'), pr.periodLabel, pr.totalDevices, pr.extraDevices, pr.includeSeo, state.seoDisabledByPlan);
    renderBreakdown(qs('#order-breakdown-rows'), pr, { slice: state.slice, paymentMethod: state.paymentMethod });

    var totalLabel = qs('#order-total-label');
    var totalAmount = qs('#order-total-amount');
    var totalStrike = qs('#order-total-strike');
    var ctaBtn = qs('#primary-checkout-btn');
    var precalcNote = qs('#order-precalc-note');

    var hasDiscount = state.slice === 4 && (pr.personalDiscount > 0 || pr.promoDiscount > 0);
    totalStrike.classList.toggle('is-hidden', !hasDiscount);
    if (hasDiscount) {
      totalStrike.textContent = formatRub(pr.grossTotal);
    }

    if (state.slice === 4 && state.paymentMethod === 'balance') {
      totalLabel.textContent = 'К списанию с баланса';
      totalAmount.textContent = formatRub(pr.netAfterDiscounts);
      ctaBtn.textContent = pr.balanceSufficient
        ? 'Оплатить с баланса (' + formatRub(pr.netAfterDiscounts) + ')'
        : 'Оплатить с баланса (не хватает ' + formatRub(pr.shortfall) + ')';
      precalcNote.textContent = pr.balanceSufficient
        ? 'Будут списаны бонусы (' + formatRub(pr.bonusSpent) + ') и основные (' + formatRub(pr.mainSpent) + '). Автопродление включено по умолчанию.'
        : 'Недостаточно средств на балансе. Выберите прямой счёт или комбинированную оплату слева.';
    } else if (state.slice === 4 && state.paymentMethod === 'combined') {
      totalLabel.textContent = 'Остаток к оплате по счёту';
      totalAmount.textContent = formatRub(pr.invoiceRemainder);
      ctaBtn.textContent = pr.invoiceRemainder === 0
        ? 'Оплатить полностью с баланса'
        : 'Зарезервировать ' + formatRub(pr.heldTotal) + ' и выставить счёт на ' + formatRub(pr.invoiceRemainder);
      precalcNote.textContent = 'Резерв held_minor закрепляется за этим счётом до подтверждения, истечения или отклонения (§5.1–5.2).';
    } else {
      totalLabel.textContent = 'К оплате по счёту';
      totalAmount.textContent = formatRub(pr.netAfterDiscounts);
      ctaBtn.textContent = 'Выставить счёт (' + formatRub(pr.netAfterDiscounts) + ')';
      precalcNote.textContent = 'Сумма до выставления счёта — предварительный расчёт. После выставления цена, валюта и состав фиксируются на 24 часа.';
    }

    var disableCta = isUnavailable || (state.slice === 4 && state.paymentMethod === 'balance' && !pr.balanceSufficient);
    ctaBtn.disabled = disableCta;
    ctaBtn.setAttribute('aria-disabled', disableCta ? 'true' : 'false');
  }

  function renderInvoiceView() {
    var inv = state.invoice;
    if (!inv) return;

    var snap = inv.snapshot;
    var currentCatalog = getCurrentPricing();
    var channel = DEMO_PLAN_CONFIG.channels[inv.channel] || DEMO_PLAN_CONFIG.channels.usdt_trc20;

    // Stepper
    var steps = qsa('#invoice-stepper .step');
    steps.forEach(function (el) {
      el.className = 'step';
      var key = el.getAttribute('data-step');
      if (key === 'created') {
        el.classList.add('step--done');
      } else if (key === 'awaiting') {
        if (inv.status === 'AWAITING_PAYMENT') el.classList.add('step--active');
        else if (inv.status === 'EXPIRED') el.classList.add('step--err');
        else if (inv.status === 'REJECTED') el.classList.add('step--warn');
        else el.classList.add('step--done');
      } else if (key === 'review') {
        if (inv.status === 'UNDER_REVIEW' || inv.status === 'LATE_PAYMENT_REVIEW') el.classList.add('step--active');
        else if (inv.status === 'PAID') el.classList.add('step--done');
      } else if (key === 'paid') {
        if (inv.status === 'PAID') el.classList.add('step--done');
      }
    });

    // Status banner & badge
    var banner = qs('#invoice-status-banner');
    var stTitle = qs('#invoice-status-title');
    var stDesc = qs('#invoice-status-desc');
    var badge = qs('#invoice-status-badge');
    var timerVal = qs('#invoice-timer-value');

    if (inv.status === 'AWAITING_PAYMENT') {
      banner.className = 'alert alert--info';
      stTitle.textContent = 'Ожидает оплаты (AWAITING_PAYMENT)';
      stDesc.textContent = 'Переведите точную сумму по реквизитам ниже и прикрепите чек до истечения 24 часов, чтобы зафиксировать условия на время проверки администратором.';
      badge.className = 'badge badge--info';
      badge.textContent = 'Ожидает оплаты';
      timerVal.textContent = '24 ч (осталось 23 ч 59 мин)';
    } else if (inv.status === 'UNDER_REVIEW') {
      banner.className = 'alert alert--warn';
      if (inv.timerExpiredAfterProof) {
        stTitle.textContent = 'На проверке (UNDER_REVIEW) — таймер 24 ч истёк, но чек подан в срок';
        stDesc.textContent = 'Так как подтверждение было отправлено до истечения срока, счёт НЕ переходит в EXPIRED: зафиксированная цена (' + formatRub(inv.amountDue) + ') и состав заказа сохраняются до решения администратора.';
        timerVal.textContent = 'Срок 24 ч истёк (чек подан в срок — фиксация удержана)';
      } else {
        stTitle.textContent = 'На проверке у администратора (UNDER_REVIEW)';
        stDesc.textContent = 'Подтверждение получено в срок. Цена, валюта и состав заморожены до решения администратора. После подтверждения ключ появится в «Моих лицензиях».';
        timerVal.textContent = 'Чек подан в срок (осталось 23 ч 48 мин)';
      }
      badge.className = 'badge badge--warn';
      badge.textContent = 'На проверке';
    } else if (inv.status === 'REJECTED') {
      banner.className = 'alert alert--err';
      stTitle.textContent = 'Подтверждение отклонено (REJECTED)';
      stDesc.textContent = 'Причина (демо): неразборчивый скриншот / не найден код платежа ' + inv.paymentCode + '. Пока срок 24 ч не истёк, вы можете прикрепить корректное подтверждение.';
      badge.className = 'badge badge--err';
      badge.textContent = 'Отклонён';
      timerVal.textContent = '24 ч (осталось 22 ч 10 мин)';
    } else if (inv.status === 'EXPIRED') {
      banner.className = 'alert alert--err';
      stTitle.textContent = 'Счёт истёк без подтверждения (EXPIRED)';
      stDesc.textContent = 'Срок 24 часа завершён без отправки чека. Счёт закрыт; для новой покупки нужен свежий расчёт по актуальной цене.';
      badge.className = 'badge badge--err';
      badge.textContent = 'Истёк';
      timerVal.textContent = 'Истёк (0 ч 00 мин)';
    } else if (inv.status === 'LATE_PAYMENT_REVIEW') {
      banner.className = 'alert alert--warn';
      stTitle.textContent = 'Поздняя оплата — ручная проверка (LATE_PAYMENT_REVIEW)';
      stDesc.textContent = 'Перевод или чек поступили после истечения срока действия счёта. Автоматического исполнения по старой цене нет — администратор сверит поступление вручную.';
      badge.className = 'badge badge--warn';
      badge.textContent = 'Поздняя оплата';
      timerVal.textContent = 'Истёк · передан на ручную сверку';
    }

    // Price lock comparison banner (Risk 1)
    var lockBanner = qs('#invoice-price-lock-banner');
    var catalogChanged = state.priceBumpActive !== snap.priceBumpActive;
    lockBanner.classList.toggle('is-hidden', !catalogChanged || inv.status === 'EXPIRED' || inv.status === 'LATE_PAYMENT_REVIEW');
    if (catalogChanged) {
      var newDue = inv.paymentMethod === 'combined'
        ? Math.max(0, currentCatalog.netAfterDiscounts - snap.heldTotal)
        : currentCatalog.netAfterDiscounts;
      qs('#invoice-price-lock-text').textContent =
        'Цена тарифа в каталоге изменена (текущий расчёт составил бы ' + formatRub(newDue) + '), но для уже выставленного счёта ' +
        inv.id + ' сохраняются зафиксированные при выставлении сумма ' + formatRub(inv.amountDue) + ' и состав заказа.';
    }

    // Requisites
    qs('#invoice-number-label').textContent = '#' + inv.id;
    qs('#invoice-channel-name').textContent = channel.name;
    qs('#invoice-req-label').textContent = channel.reqLabel;
    qs('#invoice-req-address').textContent = channel.address;
    qs('#invoice-payment-code').textContent = inv.paymentCode;
    qs('#invoice-req-amount').textContent = formatRub(inv.amountDue);

    // Cards visibility by status
    var showProofForm = inv.status === 'AWAITING_PAYMENT' || inv.status === 'REJECTED';
    qs('#invoice-proof-card').classList.toggle('is-hidden', !showProofForm);
    qs('#invoice-under-review-card').classList.toggle('is-hidden', inv.status !== 'UNDER_REVIEW');
    qs('#invoice-expired-card').classList.toggle('is-hidden', inv.status !== 'EXPIRED');
    qs('#invoice-late-card').classList.toggle('is-hidden', inv.status !== 'LATE_PAYMENT_REVIEW');

    if (inv.status === 'UNDER_REVIEW') {
      qs('#submitted-tx-val').textContent = inv.proofTx || '—';
      qs('#submitted-file-val').textContent = inv.proofFile || '—';
    }

    if (inv.status === 'EXPIRED') {
      qs('#expired-reserve-note').textContent = inv.heldTotal > 0
        ? ', а зарезервированные средства баланса (' + formatRub(inv.heldTotal) + ') возвращены на ваш баланс'
        : '';
    }

    // Simulation buttons enabled states
    var approveBtn = qs('#sim-admin-approve-btn');
    var rejectBtn = qs('#sim-admin-reject-btn');
    var expireBtn = qs('#sim-expire-timer-btn');
    approveBtn.disabled = !(inv.status === 'UNDER_REVIEW' || inv.status === 'LATE_PAYMENT_REVIEW');
    rejectBtn.disabled = inv.status !== 'UNDER_REVIEW';
    expireBtn.disabled = inv.status === 'EXPIRED' || inv.status === 'LATE_PAYMENT_REVIEW';
    qs('#sim-bump-price-btn').textContent = state.priceBumpActive
      ? 'Вернуть базовую цену тарифа'
      : 'Изменить цену тарифа (+20%)';

    // Frozen Snapshot Right Column
    renderPills(qs('#invoice-config-pills'), snap.periodLabel, snap.totalDevices, snap.extraDevices, snap.includeSeo, false);
    renderBreakdown(qs('#invoice-breakdown-rows'), snap, { slice: inv.slice, paymentMethod: inv.paymentMethod });
    qs('#invoice-total-amount').textContent = formatRub(inv.amountDue);
    qs('#invoice-snapshot-note').textContent = inv.heldTotal > 0
      ? 'Резерв баланса (held_minor): ' + formatRub(inv.heldTotal) + ' закреплён за счётом. Валюта: RUB.'
      : 'Снимок цены зафиксирован при выставлении счёта. Изменение тарифа в админке его не меняет.';
  }

  function renderPaidView() {
    var res = state.paidResult;
    if (!res) return;

    qs('#paid-headline').textContent = res.headline;
    qs('#paid-subtext').textContent = res.subtext;
    qs('#paid-config-summary').textContent =
      res.snapshot.periodLabel + ' · ' + res.snapshot.totalDevices + ' ПК · ' +
      (res.snapshot.includeSeo ? 'SEO вкл.' : 'без SEO');

    var arBadge = qs('#paid-autorenew-badge');
    arBadge.classList.toggle('is-hidden', res.slice !== 4);

    var rows = qs('#paid-summary-rows');
    rows.innerHTML = '';
    rows.appendChild(makeRow('Способ оплаты', res.methodLabel));
    rows.appendChild(makeRow('Итоговая сумма заказа', formatRub(res.totalPaid)));
    if (res.slice === 4) {
      rows.appendChild(makeRow('Автопродление новой лицензии', 'Включено по умолчанию (изменяется в /app/licenses/[id])'));
    }
    rows.appendChild(makeRow('Раздел выдачи ключа', 'Мои лицензии (/app/licenses)'));
  }

  function render() {
    renderDemoBar();
    renderHeader();

    qs('#view-checkout').classList.toggle('is-hidden', state.view !== 'checkout');
    qs('#view-invoice').classList.toggle('is-hidden', state.view !== 'invoice');
    qs('#view-paid').classList.toggle('is-hidden', state.view !== 'paid');

    if (state.view === 'checkout') {
      renderCheckoutView();
    } else if (state.view === 'invoice') {
      renderInvoiceView();
    } else if (state.view === 'paid') {
      renderPaidView();
    }
  }

  function createInvoiceFromCheckout() {
    var pr = getCurrentPricing();
    var amountDue = state.paymentMethod === 'combined' ? pr.invoiceRemainder : pr.netAfterDiscounts;
    var heldTotal = state.paymentMethod === 'combined' ? pr.heldTotal : 0;

    state.invoice = {
      id: 'INV-2026-000142',
      paymentCode: 'PGF-2026-0142',
      slice: state.slice,
      paymentMethod: state.paymentMethod,
      channel: state.paymentChannel,
      status: 'AWAITING_PAYMENT',
      timerExpiredAfterProof: false,
      amountDue: amountDue,
      heldTotal: heldTotal,
      proofTx: '',
      proofFile: '',
      snapshot: pr
    };
    state.view = 'invoice';
    render();
    showToast('Счёт #' + state.invoice.id + ' выставлен. Цена и состав зафиксированы на 24 часа.');
  }

  function completeBalancePayment() {
    var pr = getCurrentPricing();
    state.paidResult = {
      slice: state.slice,
      snapshot: pr,
      totalPaid: pr.netAfterDiscounts,
      methodLabel: 'Внутренний баланс (бонусы ' + formatRub(pr.bonusSpent) + ' + основные ' + formatRub(pr.mainSpent) + ')',
      headline: 'Оплачено с внутреннего баланса',
      subtext: 'Средства списаны с приоритетом бонусов. Новая лицензия активирована и доступна в «Моих лицензиях».'
    };
    state.view = 'paid';
    render();
    showToast('Лицензия оплачена с баланса и активирована.');
  }

  function bindEvents() {
    // Demo bar controls
    qsa('[data-action="set-slice"]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var nextSlice = parseInt(btn.getAttribute('data-value'), 10);
        state.slice = nextSlice;
        state.view = 'checkout';
        state.invoice = null;
        if (nextSlice === 3) {
          state.paymentMethod = 'direct';
        } else {
          state.paymentMethod = 'balance';
        }
        render();
        showToast('Переключено на Срез ' + nextSlice + '.');
      });
    });

    qsa('[data-action="set-cfg"]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        applyCfgPreset(btn.getAttribute('data-value'));
        state.view = 'checkout';
        state.invoice = null;
        render();
        showToast('Загружена конфигурация: ' + state.cfgRaw);
      });
    });

    qsa('[data-action="set-balance"]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        state.balancePreset = btn.getAttribute('data-value');
        if (state.slice === 4) {
          state.paymentMethod = 'balance';
        }
        state.view = 'checkout';
        render();
        showToast('Баланс (демо): ' + BALANCE_PRESETS[state.balancePreset].label);
      });
    });

    qs('#demo-price-bump').addEventListener('click', function () {
      state.priceBumpActive = !state.priceBumpActive;
      render();
      if (state.view === 'invoice' && state.invoice) {
        showToast('Цена тарифа в каталоге изменена — сумма счёта #' + state.invoice.id + ' не изменилась.');
      } else {
        showToast(state.priceBumpActive ? 'Цена тарифа в каталоге увеличена на 20%.' : 'Возвращена базовая цена тарифа.');
      }
    });

    // Unavailable config actions
    qs('#unavailable-edit-btn').addEventListener('click', function () {
      state.editorOpen = true;
      render();
      var ed = qs('#inline-config-editor');
      if (ed && ed.scrollIntoView) ed.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    });

    qs('#unavailable-reset-btn').addEventListener('click', function () {
      applyCfgPreset('30d-2pc-seo0');
      state.editorOpen = false;
      render();
      showToast('Выбрана доступная конфигурация: 30 дн · 2 ПК · без SEO.');
    });

    // Inline configuration editor controls
    qs('#edit-config-toggle-btn').addEventListener('click', function () {
      state.editorOpen = !state.editorOpen;
      render();
    });

    qs('#inline-editor-close-btn').addEventListener('click', function () {
      state.editorOpen = false;
      render();
    });

    qs('#inline-editor-done-btn').addEventListener('click', function () {
      state.editorOpen = false;
      render();
      showToast('Конфигурация обновлена: ' + state.cfgRaw);
    });

    qsa('[data-edit-period]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        state.periodDays = parseInt(btn.getAttribute('data-edit-period'), 10);
        state.cfgRaw = encodeCfg();
        if (!state.seoDisabledByPlan || !state.includeSeo) {
          state.unavailableReason = '';
        }
        render();
      });
    });

    qs('#edit-devices-minus').addEventListener('click', function () {
      if (state.extraDevices > 0) {
        state.extraDevices -= 1;
        state.cfgRaw = encodeCfg();
        if (!state.seoDisabledByPlan || !state.includeSeo) {
          state.unavailableReason = '';
        }
        render();
      }
    });

    qs('#edit-devices-plus').addEventListener('click', function () {
      if (state.extraDevices < DEMO_PLAN_CONFIG.maxExtraDevices) {
        state.extraDevices += 1;
        state.cfgRaw = encodeCfg();
        if (!state.seoDisabledByPlan || !state.includeSeo) {
          state.unavailableReason = '';
        }
        render();
      }
    });

    qs('#edit-seo-checkbox').addEventListener('change', function (e) {
      state.includeSeo = !!e.target.checked;
      state.cfgRaw = encodeCfg();
      if (state.seoDisabledByPlan && state.includeSeo) {
        state.unavailableReason = 'Выбранная опция SEO-аудита (seo1) отключена в текущих настройках тарифа. Снимите галочку SEO, чтобы продолжить оформление.';
      } else {
        state.unavailableReason = '';
      }
      render();
    });

    // Promo form (Slice 4)
    qs('#promo-form').addEventListener('submit', function (e) {
      e.preventDefault();
      var code = (qs('#promo-input').value || '').trim().toUpperCase();
      if (!code) {
        state.promoCode = '';
        state.promoFeedback = 'Промокод не указан.';
        state.promoIsError = false;
      } else if (DEMO_PLAN_CONFIG.promoCodes[code]) {
        state.promoCode = code;
        state.promoFeedback = 'Применён ' + DEMO_PLAN_CONFIG.promoCodes[code].label + ' (суммируется с персональной скидкой).';
        state.promoIsError = false;
      } else {
        state.promoCode = '';
        state.promoFeedback = 'Промокод «' + code + '» не найден. Попробуйте PGF500 или START5.';
        state.promoIsError = true;
      }
      render();
    });

    qs('#promo-clear-btn').addEventListener('click', function () {
      qs('#promo-input').value = '';
      state.promoCode = '';
      state.promoFeedback = 'Промокод снят.';
      state.promoIsError = false;
      render();
    });

    // Payment method radios
    qsa('input[name="payment-method"]').forEach(function (radio) {
      radio.addEventListener('change', function () {
        state.paymentMethod = radio.value;
        render();
      });
    });

    qs('#switch-to-direct-btn').addEventListener('click', function () {
      state.paymentMethod = 'direct';
      render();
      showToast('Выбран прямой ручной счёт.');
    });

    qs('#switch-to-combined-btn').addEventListener('click', function () {
      state.paymentMethod = 'combined';
      render();
      showToast('Выбрана комбинированная оплата с резервом баланса.');
    });

    qs('#payment-channel-select').addEventListener('change', function (e) {
      state.paymentChannel = e.target.value;
    });

    // Primary Checkout CTA
    qs('#primary-checkout-btn').addEventListener('click', function () {
      if (state.unavailableReason) return;
      var pr = getCurrentPricing();
      if (state.slice === 4 && state.paymentMethod === 'balance') {
        if (!pr.balanceSufficient) return;
        completeBalancePayment();
      } else if (state.slice === 4 && state.paymentMethod === 'combined' && pr.invoiceRemainder === 0) {
        completeBalancePayment();
      } else {
        createInvoiceFromCheckout();
      }
    });

    // Proof submission (K2)
    qs('#proof-form').addEventListener('submit', function (e) {
      e.preventDefault();
      if (!state.invoice) return;
      var tx = (qs('#proof-tx-input').value || '').trim();
      var file = (qs('#proof-file-input').value || '').trim();
      var errEl = qs('#proof-form-error');
      if (!tx && !file) {
        errEl.textContent = 'Укажите хэш транзакции или имя файла чека для отправки на проверку.';
        errEl.classList.remove('is-hidden');
        return;
      }
      errEl.classList.add('is-hidden');
      state.invoice.proofTx = tx || 'Не указан';
      state.invoice.proofFile = file || 'Не прикреплён';
      state.invoice.status = 'UNDER_REVIEW';
      render();
      showToast('Чек отправлен в срок. Статус счёта: «На проверке» (UNDER_REVIEW).');
    });

    // Expired -> New invoice vs Late payment
    qs('#expired-new-invoice-btn').addEventListener('click', function () {
      state.invoice = null;
      state.view = 'checkout';
      render();
      showToast('Возврат к новому расчёту по актуальной цене каталога.');
    });

    qs('#expired-late-payment-btn').addEventListener('click', function () {
      if (!state.invoice) return;
      state.invoice.status = 'LATE_PAYMENT_REVIEW';
      render();
      showToast('Статус изменён на «Поздняя оплата — ручная проверка» (LATE_PAYMENT_REVIEW).');
    });

    qs('#late-new-invoice-btn').addEventListener('click', function () {
      state.invoice = null;
      state.view = 'checkout';
      render();
    });

    // Invoice Demo Simulation Controls (K2)
    qs('#sim-expire-timer-btn').addEventListener('click', function () {
      if (!state.invoice) return;
      if (state.invoice.status === 'UNDER_REVIEW') {
        // Timely proof holds UNDER_REVIEW and frozen price!
        state.invoice.timerExpiredAfterProof = true;
        render();
        showToast('Таймер 24 ч истёк, но чек подан в срок — счёт остаётся «На проверке» с сохранённой ценой.');
      } else if (state.invoice.status === 'AWAITING_PAYMENT' || state.invoice.status === 'REJECTED') {
        state.invoice.status = 'EXPIRED';
        render();
        showToast('Таймер 24 ч истёк без чека — счёт переведён в EXPIRED.');
      }
    });

    qs('#sim-bump-price-btn').addEventListener('click', function () {
      state.priceBumpActive = !state.priceBumpActive;
      render();
      showToast('Цена тарифа изменена — зафиксированная сумма счёта не изменилась.');
    });

    qs('#sim-admin-approve-btn').addEventListener('click', function () {
      if (!state.invoice) return;
      var inv = state.invoice;
      inv.status = 'PAID';
      state.paidResult = {
        slice: inv.slice,
        snapshot: inv.snapshot,
        totalPaid: inv.amountDue + inv.heldTotal,
        methodLabel: inv.heldTotal > 0
          ? 'Комбинированная оплата: резерв ' + formatRub(inv.heldTotal) + ' + счёт ' + formatRub(inv.amountDue)
          : 'Прямой ручной счёт #' + inv.id + ' (' + formatRub(inv.amountDue) + ')',
        headline: 'Счёт #' + inv.id + ' подтверждён администратором (PAID)',
        subtext: 'Оплата сверена и зачтена строго по зафиксированным условиям счёта. Ключ лицензии выдан в «Моих лицензиях».'
      };
      state.view = 'paid';
      render();
      showToast('Счёт подтверждён (PAID). Лицензия выдана в «Моих лицензиях».');
    });

    qs('#sim-admin-reject-btn').addEventListener('click', function () {
      if (!state.invoice || state.invoice.status !== 'UNDER_REVIEW') return;
      state.invoice.status = 'REJECTED';
      render();
      showToast('Чек отклонён администратором (демо). До истечения срока можно отправить повторно.');
    });

    qs('#sim-back-checkout-btn').addEventListener('click', function () {
      state.view = 'checkout';
      render();
    });

    // Paid view actions
    qs('#goto-licenses-btn').addEventListener('click', function () {
      showToast('Переход в раздел «Мои лицензии» (/app/licenses) — отдельный макет.');
    });

    qs('#restart-demo-btn').addEventListener('click', function () {
      state.invoice = null;
      state.paidResult = null;
      state.view = 'checkout';
      render();
      showToast('Возврат к экрану оформления подписки.');
    });

    // Copy buttons
    qsa('[data-copy-target]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var target = qs('#' + btn.getAttribute('data-copy-target'));
        if (!target) return;
        var text = target.textContent.trim();
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(text).then(function () {
            showToast('Скопировано: ' + text);
          }, function () {
            showToast('Значение: ' + text);
          });
        } else {
          showToast('Значение: ' + text);
        }
      });
    });

    // Sidebar / route preview links
    qsa('[data-nav="checkout"]').forEach(function (a) {
      a.addEventListener('click', function (e) {
        e.preventDefault();
        state.view = 'checkout';
        render();
      });
    });

    qsa('[data-nav="licenses"], #mobile-licenses-link').forEach(function (a) {
      a.addEventListener('click', function (e) {
        e.preventDefault();
        if (state.paidResult) {
          state.view = 'paid';
          render();
        } else {
          showToast('Раздел «Мои лицензии» (/app/licenses) — отдельный макет. Завершите оплату, чтобы увидеть выдачу ключа.');
        }
      });
    });

    qsa('[data-nav="billing"]').forEach(function (a) {
      a.addEventListener('click', function (e) {
        e.preventDefault();
        if (state.invoice) {
          state.view = 'invoice';
          render();
        } else {
          showToast('Раздел «Баланс и счета» (/app/billing) — выставите счёт, чтобы увидеть экран счёта.');
        }
      });
    });

    qsa('[data-route-preview]').forEach(function (a) {
      a.addEventListener('click', function (e) {
        e.preventDefault();
        showToast('Публичный маршрут справки: ' + a.getAttribute('data-route-preview') + ' (доступен всегда без авторизации).');
      });
    });
  }

  function initFromUrl() {
    var params = new URLSearchParams(window.location.search || '');
    var cfg = params.get('cfg');
    if (cfg) {
      applyCfgPreset(cfg);
    } else {
      applyCfgPreset('30d-2pc-seo1');
    }

    var sliceParam = params.get('slice');
    if (sliceParam === '4') {
      state.slice = 4;
      state.paymentMethod = 'balance';
    } else if (sliceParam === '3') {
      state.slice = 3;
      state.paymentMethod = 'direct';
    }

    var balParam = params.get('balance');
    if (balParam === 'insufficient' || balParam === 'sufficient') {
      state.balancePreset = balParam;
    }
  }

  initFromUrl();
  bindEvents();
  render();
})();
