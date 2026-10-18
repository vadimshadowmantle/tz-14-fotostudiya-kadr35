// Кадр 35 — все события Google Analytics 4 отправляются только из этого файла.
// Кнопки и ссылки описываются атрибутами data-event="имя_события" и data-* параметрами,
// например: data-event="cta_click" data-button-name="hero_book_newyear" data-page-section="hero".
(function () {
  'use strict';

  var DEBUG = false; // true — события видны в DebugView; перед сдачей вернуть false

  var NAME_RE = /^[a-z][a-z0-9_]{0,39}$/;

  // Приводит имя параметра из data-атрибута к snake_case: buttonName → button_name
  function toSnake(key) {
    return key.replace(/[A-Z]/g, function (c) { return '_' + c.toLowerCase(); });
  }

  // Готовит параметры: только допустимые имена, строки не длиннее 100 символов
  function cleanParams(params) {
    var out = {};
    Object.keys(params || {}).forEach(function (key) {
      var value = params[key];
      if (!NAME_RE.test(key) || value === undefined || value === null || value === '') return;
      out[key] = typeof value === 'string' ? value.slice(0, 100) : value;
    });
    if (DEBUG) out.debug_mode = true;
    return out;
  }

  // Единая функция отправки события в GA4. callback вызывается, когда событие ушло
  // (или через 1 секунду, если GA4 заблокирован), — нужно перед переходом на другую страницу.
  function trackEvent(name, params, callback) {
    if (!NAME_RE.test(name)) return;
    var data = cleanParams(params);
    if (typeof callback === 'function') {
      var called = false;
      var done = function () {
        if (!called) { called = true; callback(); }
      };
      data.event_callback = done;
      setTimeout(done, 1000);
    }
    if (typeof window.gtag === 'function') {
      window.gtag('event', name, data);
    } else if (data.event_callback) {
      data.event_callback();
    }
  }
  window.trackEvent = trackEvent;

  // Собирает параметры из data-* атрибутов элемента (кроме самого data-event)
  function paramsFromElement(el) {
    var params = {};
    Object.keys(el.dataset).forEach(function (key) {
      if (key === 'event' || key === 'full') return;
      var value = el.dataset[key];
      params[toSnake(key)] = /^\d+$/.test(value) ? Number(value) : value;
    });
    return params;
  }

  // Клики по элементам с data-event: cta_click, hall_view, photographer_view,
  // contact_click, messenger_click, social_click, gallery_view
  document.addEventListener('click', function (e) {
    var el = e.target.closest('[data-event]');
    if (!el || el.tagName === 'DETAILS') return;
    trackEvent(el.dataset.event, paramsFromElement(el));
  });

  // Раскрытие идеи фотосессии (<details data-event="idea_open">) — только при открытии
  document.addEventListener('toggle', function (e) {
    var el = e.target;
    if (el.tagName === 'DETAILS' && el.dataset.event && el.open) {
      trackEvent(el.dataset.event, paramsFromElement(el));
    }
  }, true);
})();
