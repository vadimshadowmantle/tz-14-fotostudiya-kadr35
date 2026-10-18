// Кадр 35 — UTM-метки и форма брони.
// 1) На любой странице читает utm_* из адреса и сохраняет в sessionStorage.
// 2) На contacts.html проверяет поля, отправляет заявку в Apps Script (fetch) и ведёт на thanks.html.
(function () {
  'use strict';

  // Адрес веб-приложения Apps Script (раздел 6.2), вставляется после публикации приёмника
  var ENDPOINT = 'https://script.google.com/macros/s/AKfycbzprv7LP-1prMvNzjwZF8zwCKMoSMkUPlyrSuj--01xBlwn-Isx6M_G3GgC3A4efbj9/exec';

  var UTM_KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content'];
  var UTM_DEFAULTS = { utm_source: 'direct', utm_medium: 'none', utm_campaign: 'not_set', utm_content: 'not_set' };
  var STORAGE_UTM = 'kadr35_utm';
  var STORAGE_BOOKING = 'kadr35_booking';

  function readStorage(key) {
    try { return JSON.parse(sessionStorage.getItem(key)) || null; } catch (e) { return null; }
  }

  function writeStorage(key, value) {
    try { sessionStorage.setItem(key, JSON.stringify(value)); } catch (e) { /* приватный режим */ }
  }

  // ---------- UTM: сохраняем метки при входе на сайт ----------
  var query = new URLSearchParams(location.search);
  var hasUtm = UTM_KEYS.some(function (key) { return query.get(key); });
  if (hasUtm) {
    var utm = {};
    UTM_KEYS.forEach(function (key) {
      utm[key] = (query.get(key) || '').slice(0, 100);
    });
    writeStorage(STORAGE_UTM, utm);
  }

  function currentUtm() {
    var saved = readStorage(STORAGE_UTM) || {};
    var out = {};
    UTM_KEYS.forEach(function (key) { out[key] = saved[key] || UTM_DEFAULTS[key]; });
    return out;
  }

  var form = document.getElementById('booking-form');
  if (!form) return;
  var f = form.elements; // поля формы по имени: f.name, f.phone …

  // ---------- Номер заявки ----------
  function newRequestId() {
    if (window.crypto && crypto.randomUUID) return 'REQ-' + crypto.randomUUID();
    return 'REQ-' + Date.now().toString(16) + '-' + Math.random().toString(16).slice(2, 10);
  }
  f.request_id.value = newRequestId();

  function fillUtm() {
    var utm = currentUtm();
    UTM_KEYS.forEach(function (key) { f[key].value = utm[key]; });
  }
  fillUtm();

  // ---------- Проверка полей ----------
  var HALLS = ['loft', 'cyclorama', 'newyear'];
  var HALL_NAMES = { loft: 'Лофт', cyclorama: 'Циклорама', newyear: 'Новогодний зал' };

  // Приводит телефон к виду +7XXXXXXXXXX или возвращает null
  function normalizePhone(value) {
    var digits = value.replace(/\D/g, '');
    if (digits.length === 11 && (digits[0] === '7' || digits[0] === '8')) digits = digits.slice(1);
    return digits.length === 10 ? '+7' + digits : null;
  }

  function validate() {
    var errors = []; // { field, type, text }
    var name = f.name.value.trim();
    var phone = f.phone.value.trim();
    var email = f.email.value.trim();

    if (!name) errors.push({ field: 'name', type: 'required', text: 'Введите имя.' });
    else if (name.length < 2 || name.length > 60) errors.push({ field: 'name', type: 'length', text: 'Имя — от 2 до 60 символов.' });

    if (!phone) errors.push({ field: 'phone', type: 'required', text: 'Введите телефон.' });
    else if (!normalizePhone(phone)) errors.push({ field: 'phone', type: 'format', text: 'Телефон в формате +7 и 10 цифр, например +7 900 123-45-67.' });

    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
      errors.push({ field: 'email', type: 'format', text: 'Проверьте e-mail, например name@mail.ru.' });
    }

    if (HALLS.indexOf(f.hall.value) === -1) errors.push({ field: 'hall', type: 'required', text: 'Выберите зал.' });
    if (!f.slot.value) errors.push({ field: 'slot', type: 'required', text: 'Выберите дату и время начала.' });
    var hours = Number(f.hours.value);
    if (!(hours >= 1 && hours <= 8)) errors.push({ field: 'hours', type: 'required', text: 'Выберите число часов.' });

    if (!f.consent.checked) errors.push({ field: 'consent', type: 'required', text: 'Нужно согласие на обработку персональных данных.' });
    return errors;
  }

  function clearErrors() {
    form.querySelectorAll('.is-invalid').forEach(function (el) { el.classList.remove('is-invalid'); });
    form.querySelectorAll('.field__error').forEach(function (el) { el.textContent = ''; });
    form.querySelectorAll('[aria-invalid]').forEach(function (el) { el.removeAttribute('aria-invalid'); });
    document.getElementById('form-status').textContent = '';
  }

  function showError(err) {
    var input = f[err.field];
    var box = document.getElementById('f-' + err.field + '-error');
    var wrap = err.field === 'consent' ? document.getElementById('f-consent-wrap') : input.closest('.field');
    wrap.classList.add('is-invalid');
    input.setAttribute('aria-invalid', 'true');
    input.setAttribute('aria-describedby', box.id);
    box.textContent = err.text;
  }

  function track(name, params, callback) {
    if (typeof window.trackEvent === 'function') window.trackEvent(name, params, callback);
    else if (callback) callback();
  }

  // Убираем подсветку ошибки, когда посетитель исправляет поле
  form.addEventListener('input', function (e) {
    var wrap = e.target.closest('.field, .form__consent');
    if (wrap && wrap.classList.contains('is-invalid')) {
      wrap.classList.remove('is-invalid');
      var box = document.getElementById(e.target.id + '-error');
      if (box) box.textContent = '';
    }
  });

  // ---------- Отправка ----------
  var submitBtn = form.querySelector('[type="submit"]');

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    clearErrors();

    var errors = validate();
    if (errors.length) {
      errors.forEach(function (err) {
        showError(err);
        track('form_error', { field_name: err.field, error_type: err.type });
      });
      f[errors[0].field].focus();
      return;
    }

    // Расширенная статистика GA4 не видит отправку формы, если её отменили preventDefault()
    // ради fetch, поэтому form_submit отправляем сами с теми же параметрами, что у автоматического
    track('form_submit', {
      form_id: form.id,
      form_name: 'booking',
      form_destination: 'script.google.com',
      form_submit_text: submitBtn.textContent.trim()
    });

    fillUtm();
    var data = {
      request_id: f.request_id.value,
      name: f.name.value.trim(),
      phone: normalizePhone(f.phone.value),
      email: f.email.value.trim(),
      hall: f.hall.value,
      slot: f.slot.value,
      hours: Number(f.hours.value),
      utm_source: f.utm_source.value,
      utm_medium: f.utm_medium.value,
      utm_campaign: f.utm_campaign.value,
      utm_content: f.utm_content.value
    };
    var total = Number(f.total_price.value) || 0;

    submitBtn.disabled = true;
    submitBtn.textContent = 'Отправляем…';

    // text/plain — чтобы браузер не отправлял предварительный CORS-запрос к Apps Script
    fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(data)
    })
      .then(function (res) { return res.json(); })
      .then(function (answer) {
        if (!answer || answer.ok !== true) throw new Error((answer && answer.error) || 'server');

        // Данные для страницы «Спасибо» — без имени и телефона
        writeStorage(STORAGE_BOOKING, {
          request_id: data.request_id,
          hall: HALL_NAMES[data.hall],
          slot: data.slot,
          hours: data.hours,
          total: total
        });
        track('generate_lead', { lead_hall: data.hall, hours: data.hours, value: total, currency: 'RUB' }, function () {
          location.href = 'thanks.html';
        });
      })
      .catch(function (err) {
        track('form_error', { field_name: 'form', error_type: 'server' });
        // Служебные коды приёмника (duplicate_request_id, busy_retry…) посетителю не показываем
        var reason = err && err.message && !/^[a-z_]+$/.test(err.message) ? ': ' + err.message : '';
        document.getElementById('form-status').textContent =
          'Не удалось отправить заявку' + reason + '. Попробуйте ещё раз или позвоните +7 (900) 435-35-35.';
        submitBtn.disabled = false;
        submitBtn.textContent = 'Забронировать';
      });
  });
})();

// ---------- Страница «Спасибо»: показываем номер и детали брони ----------
(function () {
  'use strict';
  var idEl = document.getElementById('t-id');
  if (!idEl) return;
  var booking = null;
  try { booking = JSON.parse(sessionStorage.getItem('kadr35_booking')); } catch (e) { booking = null; }
  if (!booking) return;
  var p = booking.slot.split(' ');
  var d = p[0].split('-');
  var end = Number(p[1].slice(0, 2)) + booking.hours;
  idEl.textContent = booking.request_id;
  document.getElementById('t-hall').textContent = booking.hall;
  document.getElementById('t-slot').textContent = d[2] + '.' + d[1] + '.' + d[0] + ', ' + p[1] + '–' + String(end).padStart(2, '0') + ':00';
  document.getElementById('t-total').textContent = Number(booking.total).toLocaleString('ru-RU') + ' ₽';
})();
