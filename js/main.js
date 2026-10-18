// Кадр 35 — интерфейс сайта: меню, галерея, калькулятор, фильтр фотографов, промокод.
// События GA4 отсюда не отправляются напрямую: для этого есть trackEvent() из analytics.js.
(function () {
  'use strict';

  function track(name, params) {
    if (typeof window.trackEvent === 'function') window.trackEvent(name, params);
  }

  // ---------- Мобильное меню ----------
  var burger = document.querySelector('.burger');
  var nav = document.getElementById('nav');
  if (burger && nav) {
    burger.addEventListener('click', function () {
      var open = burger.getAttribute('aria-expanded') === 'true';
      burger.setAttribute('aria-expanded', String(!open));
      burger.setAttribute('aria-label', open ? 'Открыть меню' : 'Закрыть меню');
      nav.classList.toggle('is-open', !open);
    });
  }

  // ---------- Просмотр кадра крупно ----------
  var lightbox = document.querySelector('.lightbox');
  if (lightbox) {
    var lbImg = lightbox.querySelector('img');
    var lbCaption = lightbox.querySelector('.lightbox__caption');
    var lbClose = lightbox.querySelector('.lightbox__close');
    var lastFocus = null;

    var closeLightbox = function () {
      lightbox.classList.remove('is-open');
      lightbox.hidden = true;
      if (lastFocus) lastFocus.focus();
    };

    document.querySelectorAll('.gallery__item').forEach(function (item) {
      item.addEventListener('click', function () {
        var thumb = item.querySelector('img');
        lastFocus = item;
        lbImg.src = item.dataset.full;
        lbImg.alt = thumb.alt;
        lbCaption.textContent = thumb.alt;
        lightbox.hidden = false;
        lightbox.classList.add('is-open');
        lbClose.focus();
      });
    });
    lbClose.addEventListener('click', closeLightbox);
    lightbox.addEventListener('click', function (e) {
      if (e.target === lightbox) closeLightbox();
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && lightbox.classList.contains('is-open')) closeLightbox();
    });
  }

  // ---------- Счётчики «− / +» ----------
  document.querySelectorAll('[data-stepper]').forEach(function (stepper) {
    var input = stepper.querySelector('input');
    var output = stepper.querySelector('output');
    var min = Number(input.dataset.min);
    var max = Number(input.dataset.max);
    stepper.querySelectorAll('button').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var value = Number(input.value) + Number(btn.dataset.step);
        value = Math.min(max, Math.max(min, value));
        input.value = value;
        output.textContent = value;
        input.dispatchEvent(new Event('change', { bubbles: true }));
      });
    });
  });

  // ---------- Калькулятор оборудования ----------
  var calc = document.getElementById('equipment-calc');
  if (calc) {
    var PRICE_LIGHT = 400; // ₽ за источник в час
    var PRICE_SMOKE = 500; // ₽ за сеанс
    var PRICE_PAPER = 300; // ₽ за фон

    var calculate = function () {
      var hours = Number(calc.hours.value);
      var light = Number(calc.light.value);
      var smoke = calc.smoke.checked ? 1 : 0;
      var paper = Number(calc.paper.value);
      var total = light * PRICE_LIGHT * hours + smoke * PRICE_SMOKE + paper * PRICE_PAPER;
      document.getElementById('calc-total').textContent = total.toLocaleString('ru-RU');
      return { items: light + smoke + paper, total: total };
    };

    calc.addEventListener('change', calculate);
    calc.addEventListener('submit', function (e) {
      e.preventDefault();
      var result = calculate();
      track('equipment_calc', { items_count: result.items, total_price: result.total });
    });
    calculate();
  }

  // ---------- Фильтр фотографов по жанру ----------
  var filter = document.querySelector('.filter');
  if (filter) {
    var cards = document.querySelectorAll('.photographer');

    var applyGenre = function (genre) {
      filter.querySelectorAll('.filter__btn').forEach(function (btn) {
        btn.setAttribute('aria-pressed', String(btn.dataset.genre === genre));
      });
      cards.forEach(function (card) {
        card.hidden = genre !== 'all' && card.dataset.genre !== genre;
      });
    };

    filter.addEventListener('click', function (e) {
      var btn = e.target.closest('.filter__btn');
      if (!btn) return;
      applyGenre(btn.dataset.genre);
      track('photographer_filter', { genre: btn.dataset.genre });
    });

    // Ссылка из автоответа Instagram ведёт на photographers.html#family
    if (location.hash === '#family') applyGenre('family');

    document.querySelectorAll('.photographer__toggle').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var more = btn.nextElementSibling;
        var open = btn.getAttribute('aria-expanded') === 'true';
        btn.setAttribute('aria-expanded', String(!open));
        more.hidden = open;
      });
    });
  }

  // ---------- Копирование промокода ----------
  var promoBtn = document.getElementById('promo-copy');
  if (promoBtn) {
    var toast = document.querySelector('.toast');
    var showToast = function (text) {
      toast.textContent = text;
      toast.classList.add('is-visible');
      setTimeout(function () { toast.classList.remove('is-visible'); }, 2500);
    };

    promoBtn.addEventListener('click', function () {
      var code = promoBtn.dataset.promo;
      var done = function () {
        showToast('Промокод ' + code + ' скопирован');
        track('promo_copy', { promo_code: code });
      };
      if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(code).then(done, function () { showToast('Промокод: ' + code); });
      } else {
        var range = document.createRange();
        range.selectNodeContents(document.getElementById('promo-code'));
        var sel = window.getSelection();
        sel.removeAllRanges();
        sel.addRange(range);
        document.execCommand('copy');
        sel.removeAllRanges();
        done();
      }
    });
  }
})();
