/* ==========================================================================
   pgF PANEL-V2 — Landing Page Interactive Logic (Zero dependencies)
   Supports: Design V2 screen tabs, mobile menu, FAQ accordion, demo price
   preview, and K3 storefront state simulation (including URL params).
   ========================================================================== */

(function () {
  'use strict';

  // --- State ---
  var state = {
    visibility: 'PUBLIC_WITH_PRICES', // PUBLIC_WITH_PRICES | PUBLIC_PRICES_AUTH_ONLY | PRIVATE_AUTH_ONLY
    auth: 'guest',                    // guest | user
    registration: 'OPEN',             // OPEN | INVITE_ONLY
    trialEnabled: true,
    salesPaused: false,
    maintenance: false,
    showReviewsTemplate: true,
    // Demo pricing estimator (clearly marked as demonstration values)
    demoBasePrice: 2900,
    demoExtraDevicePrice: 700,
    demoSeoPrice: 1200,
    extraDevices: 0,
    includeSeo: true
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
      document.body.style.overflow = open ? 'hidden' : '';
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

  // --- 4. Demo Pricing Estimator ---
  function updateDemoPrice() {
    var total =
      state.demoBasePrice +
      state.extraDevices * state.demoExtraDevicePrice +
      (state.includeSeo ? state.demoSeoPrice : 0);

    var amountEl = qs('#demo-price-amount');
    var devCountEl = qs('#demo-devices-count');
    var totalDevEl = qs('#demo-total-devices');
    var breakdownEl = qs('#demo-price-breakdown');

    if (amountEl) amountEl.textContent = formatRub(total);
    if (devCountEl) devCountEl.textContent = String(state.extraDevices);
    if (totalDevEl) totalDevEl.textContent = String(1 + state.extraDevices);
    if (breakdownEl) {
      var parts = ['База (1 ПК): ' + formatRub(state.demoBasePrice)];
      if (state.extraDevices > 0) {
        parts.push('+' + state.extraDevices + ' ПК: ' + formatRub(state.extraDevices * state.demoExtraDevicePrice));
      }
      if (state.includeSeo) {
        parts.push('SEO-модуль (на лицензию): ' + formatRub(state.demoSeoPrice));
      }
      breakdownEl.textContent = parts.join(' · ') + ' · Демонстрационный расчёт, цены задаются в админке';
    }
  }

  function initDemoPricing() {
    var minus = qs('#demo-dev-minus');
    var plus = qs('#demo-dev-plus');
    var seoCheck = qs('#demo-seo-toggle');

    if (minus) {
      minus.addEventListener('click', function () {
        if (state.extraDevices > 0) {
          state.extraDevices -= 1;
          updateDemoPrice();
        }
      });
    }
    if (plus) {
      plus.addEventListener('click', function () {
        if (state.extraDevices < 9) {
          state.extraDevices += 1;
          updateDemoPrice();
        }
      });
    }
    if (seoCheck) {
      seoCheck.addEventListener('change', function () {
        state.includeSeo = !!seoCheck.checked;
        updateDemoPrice();
      });
    }
    updateDemoPrice();
  }

  // --- 5. Storefront State Engine (K3) ---
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

    // 5.3 Auth buttons: Войти (/login) vs В кабинет (/app)
    qsa('[data-auth-link]').forEach(function (el) {
      el.textContent = isUser ? 'В кабинет' : 'Войти';
      el.setAttribute('href', isUser ? '/app' : '/login');
    });

    // 5.4 Primary pricing CTA in Header, Hero, Pricing, Final CTA
    var primaryCtaText = 'Тариф и стоимость';
    var primaryCtaHref = '/pricing';
    var primaryDisabled = false;

    if (state.salesPaused) {
      primaryCtaText = 'Покупки временно на паузе';
      primaryCtaHref = '/pricing';
      primaryDisabled = true;
    } else if (isAuthOnlyPrices) {
      primaryCtaText = 'Войти, чтобы увидеть цены';
      primaryCtaHref = '/login';
    }

    qsa('[data-primary-pricing-cta]').forEach(function (el) {
      el.textContent = primaryCtaText;
      el.setAttribute('href', primaryCtaHref);
      el.classList.toggle('btn--disabled', primaryDisabled);
      if (primaryDisabled) {
        el.setAttribute('aria-disabled', 'true');
      } else {
        el.removeAttribute('aria-disabled');
      }
    });

    // 5.5 Trial CTA visibility (strictly only when trial enabled & registration path allowed)
    qsa('[data-trial-cta]').forEach(function (el) {
      el.classList.toggle('is-hidden', !canShowTrial);
    });

    var trialCard = qs('#trial-plan-card');
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
        notes.push('Регистрация новых аккаунтов сейчас доступна только по приглашению (?invite=). Действующие клиенты входят в кабинет без ограничений.');
      }
      if (!state.trialEnabled && !state.salesPaused) {
        notes.push('Пробный период временно отключён в настройках панели. Доступно оформление основного тарифа и открытая справка.');
      }
      if (state.salesPaused) {
        notes.push('Оформление новых покупок и пополнение баланса временно приостановлены. Действующие лицензии pgF продолжают работу.');
      }
      heroNote.textContent = notes.join(' ');
      heroNote.classList.toggle('is-hidden', notes.length === 0);
    }

    // 5.7 Public price block vs Auth-only price gate
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

    // 5.9 Testimonials template section toggle (for design review)
    var reviewsSection = qs('#reviews-template');
    if (reviewsSection) {
      reviewsSection.classList.toggle('is-hidden', !state.showReviewsTemplate);
    }
  }

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

    // URL presets for automated verification & clean state screenshots
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

    var toggleBtn = qs('#preview-toggle-btn');
    var visSelect = qs('#ctrl-visibility');
    var authSelect = qs('#ctrl-auth');
    var regSelect = qs('#ctrl-registration');
    var trialChk = qs('#ctrl-trial');
    var pausedChk = qs('#ctrl-paused');
    var maintChk = qs('#ctrl-maintenance');
    var reviewsChk = qs('#ctrl-reviews');

    if (visSelect) visSelect.value = state.visibility;
    if (authSelect) authSelect.value = state.auth;
    if (regSelect) regSelect.value = state.registration;
    if (trialChk) trialChk.checked = state.trialEnabled;
    if (pausedChk) pausedChk.checked = state.salesPaused;
    if (maintChk) maintChk.checked = state.maintenance;
    if (reviewsChk) reviewsChk.checked = state.showReviewsTemplate;

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

    applyStorefrontState();
  }

  // --- 6. Local Route Preview Toast (for file:// & GitHub Pages clicks on /pricing, /docs, etc.) ---
  function initRoutePreviewToast() {
    var toast = qs('#route-toast');
    var timer = null;

    document.addEventListener('click', function (e) {
      var link = e.target.closest('a[href^="/"]');
      if (!link) return;
      if (link.classList.contains('btn--disabled')) {
        e.preventDefault();
        return;
      }
      // In standalone file:// or GitHub Pages static preview, show target route instead of 404
      if (window.location.protocol === 'file:' || window.location.hostname.indexOf('github.io') !== -1) {
        e.preventDefault();
        var href = link.getAttribute('href');
        if (toast) {
          toast.innerHTML = 'Переход в PANEL-V2: <code>' + href + '</code> (статический макет главной <code>/</code>)';
          toast.classList.add('is-visible');
          clearTimeout(timer);
          timer = setTimeout(function () {
            toast.classList.remove('is-visible');
          }, 3200);
        }
      }
    });

    // Prevent demo login form submit from reloading file://
    var privForm = qs('#private-login-form');
    if (privForm) {
      privForm.addEventListener('submit', function (e) {
        e.preventDefault();
        if (toast) {
          toast.innerHTML = 'Демонстрация входа: редирект по роли в <code>/app</code> (клиентский кабинет)';
          toast.classList.add('is-visible');
          clearTimeout(timer);
          timer = setTimeout(function () {
            toast.classList.remove('is-visible');
          }, 3200);
        }
      });
    }
  }

  // --- Boot ---
  document.addEventListener('DOMContentLoaded', function () {
    initShowcaseTabs();
    initMobileNav();
    initFaq();
    initDemoPricing();
    initPreviewControls();
    initRoutePreviewToast();
  });
})();
