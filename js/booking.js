// Кадр 35 — выбор зала, даты, времени и числа часов на contacts.html.
// Считает итог с утренней скидкой и переносит выбор в форму брони.
(function () {
  'use strict';

  var HALLS = {
    loft: { name: 'Лофт', price: 1800 },
    cyclorama: { name: 'Циклорама', price: 2200 },
    newyear: { name: 'Новогодний зал', price: 2500, from: '2026-12-01', to: '2027-01-10' }
  };
  var OPEN_HOUR = 9;      // студия открывается в 09:00
  var CLOSE_HOUR = 23;    // и закрывается в 23:00
  var DAYS_AHEAD = 14;    // бронь на 14 дней вперёд
  var MAX_HOURS = 8;      // не больше 8 часов за одну бронь
  var DISCOUNT = 0.2;     // скидка 20 %
  var DISCOUNT_UNTIL = 12; // в будни с 09:00 до 12:00

  // Занятые часы. day — сколько дней от сегодняшнего, date — точная дата.
  // hours — часы начала занятых интервалов (10 означает 10:00–11:00).
  var BUSY = [
    { hall: 'loft', day: 0, hours: [12, 13, 14, 18, 19] },
    { hall: 'loft', day: 1, hours: [9, 10, 15, 16, 17] },
    { hall: 'loft', day: 2, hours: [11, 12, 20, 21] },
    { hall: 'loft', day: 4, hours: [14, 15, 16, 17, 18, 19] },
    { hall: 'loft', day: 6, hours: [10, 11, 12, 13] },
    { hall: 'loft', day: 9, hours: [16, 17, 18] },
    { hall: 'cyclorama', day: 0, hours: [15, 16, 17] },
    { hall: 'cyclorama', day: 1, hours: [13, 14, 19, 20] },
    { hall: 'cyclorama', day: 3, hours: [17, 18, 19, 20, 21, 22] },
    { hall: 'cyclorama', day: 5, hours: [14, 15] },
    { hall: 'cyclorama', day: 8, hours: [13, 14, 15, 16] },
    { hall: 'newyear', date: '2026-12-05', hours: [10, 11, 12, 13, 14, 15, 16, 17, 18] },
    { hall: 'newyear', date: '2026-12-06', hours: [9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20] },
    { hall: 'newyear', date: '2026-12-12', hours: [11, 12, 13, 14, 15, 16] },
    { hall: 'newyear', date: '2026-12-13', hours: [9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22] },
    { hall: 'newyear', date: '2026-12-19', hours: [12, 13, 14, 15, 16, 17, 18, 19] },
    { hall: 'newyear', date: '2026-12-20', hours: [10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20] }
  ];

  var WEEKDAYS = ['вс', 'пн', 'вт', 'ср', 'чт', 'пт', 'сб'];
  var MONTHS = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля',
    'августа', 'сентября', 'октября', 'ноября', 'декабря'];

  var hallChips = document.getElementById('hall-chips');
  if (!hallChips) return;
  var dateChips = document.getElementById('date-chips');
  var timeChips = document.getElementById('time-chips');
  var hoursChips = document.getElementById('hours-chips');
  var hallHint = document.getElementById('hall-hint');

  var state = { hall: null, date: null, time: null, hours: 1 };
  var params = new URLSearchParams(location.search);
  var withPhotographer = Boolean(params.get('photographer')); // пришли со страницы фотографов

  // ---------- Даты ----------
  function pad(n) { return String(n).padStart(2, '0'); }

  function toKey(d) { // Date → '2026-12-05'
    return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  }

  function fromKey(key) { // '2026-12-05' → Date (полночь по местному времени)
    var p = key.split('-');
    return new Date(Number(p[0]), Number(p[1]) - 1, Number(p[2]));
  }

  function isWeekday(key) {
    var day = fromKey(key).getDay();
    return day >= 1 && day <= 5;
  }

  function formatDate(key) {
    var d = fromKey(key);
    return d.getDate() + ' ' + MONTHS[d.getMonth()] + ', ' + WEEKDAYS[d.getDay()];
  }

  var today = new Date();
  today.setHours(0, 0, 0, 0);
  var dates = [];
  for (var i = 0; i < DAYS_AHEAD; i++) {
    var d = new Date(today);
    d.setDate(today.getDate() + i);
    dates.push(toKey(d));
  }

  // Переводим смещения дней в BUSY в настоящие даты
  var busyMap = {}; // 'loft|2026-10-20' → [10, 11]
  BUSY.forEach(function (item) {
    var key = item.date;
    if (!key) {
      var d = new Date(today);
      d.setDate(today.getDate() + item.day);
      key = toKey(d);
    }
    busyMap[item.hall + '|' + key] = item.hours;
  });

  // ---------- Проверки доступности ----------
  function hallOpenOn(hall, key) {
    var h = HALLS[hall];
    return !h.from || (key >= h.from && key <= h.to);
  }

  function hourBusy(hall, key, hour) {
    var busy = busyMap[hall + '|' + key] || [];
    if (busy.indexOf(hour) !== -1) return true;
    // Прошедшие часы сегодняшнего дня тоже недоступны
    var now = new Date();
    return key === toKey(now) && hour <= now.getHours();
  }

  function rangeFree(hall, key, start, hours) {
    if (start + hours > CLOSE_HOUR) return false;
    for (var h = start; h < start + hours; h++) {
      if (hourBusy(hall, key, h)) return false;
    }
    return true;
  }

  function dateHasFreeHours(hall, key) {
    if (!hallOpenOn(hall, key)) return false;
    for (var h = OPEN_HOUR; h < CLOSE_HOUR; h++) {
      if (!hourBusy(hall, key, h)) return true;
    }
    return false;
  }

  // ---------- Стоимость ----------
  function calcPrice(hall, key, start, hours) {
    var price = HALLS[hall].price;
    var total = 0;
    var discount = 0;
    for (var h = start; h < start + hours; h++) {
      if (isWeekday(key) && h < DISCOUNT_UNTIL) {
        total += price * (1 - DISCOUNT);
        discount += price * DISCOUNT;
      } else {
        total += price;
      }
    }
    return { total: Math.round(total), discount: Math.round(discount) };
  }

  // ---------- Отрисовка кнопок ----------
  function chip(label, small, pressed, disabled, extraClass) {
    var b = document.createElement('button');
    b.type = 'button';
    b.className = 'chip' + (extraClass ? ' ' + extraClass : '');
    b.textContent = label;
    if (small) {
      var s = document.createElement('small');
      s.textContent = small;
      b.appendChild(s);
    }
    b.setAttribute('aria-pressed', String(pressed));
    b.disabled = disabled;
    return b;
  }

  function renderHalls() {
    hallChips.querySelectorAll('.chip').forEach(function (b) {
      var hall = b.dataset.hall;
      var available = dates.some(function (key) { return hallOpenOn(hall, key); });
      b.disabled = !available;
      b.setAttribute('aria-pressed', String(state.hall === hall));
    });
    hallHint.textContent = (dates.some(function (key) { return hallOpenOn('newyear', key); })
      ? 'Новогодний зал доступен для дат с 1 декабря 2026 по 10 января 2027 года.'
      : 'Новогодний зал работает с 1 декабря 2026 по 10 января 2027 года — эти даты появятся в календаре за 14 дней. Сейчас можно выбрать Лофт или Циклораму.')
      + (withPhotographer ? ' Время съёмки с фотографом администратор согласует при подтверждении брони.' : '');
  }

  function renderDates() {
    dateChips.innerHTML = '';
    if (!state.hall) {
      dateChips.innerHTML = '<p class="hint">Сначала выберите зал.</p>';
      return;
    }
    dates.forEach(function (key) {
      var d = fromKey(key);
      var b = chip(pad(d.getDate()) + '.' + pad(d.getMonth() + 1), WEEKDAYS[d.getDay()],
        state.date === key, !dateHasFreeHours(state.hall, key));
      b.dataset.date = key;
      dateChips.appendChild(b);
    });
  }

  function renderTimes() {
    timeChips.innerHTML = '';
    if (!state.date) {
      timeChips.innerHTML = '<p class="hint">Выберите дату.</p>';
      return;
    }
    for (var h = OPEN_HOUR; h < CLOSE_HOUR; h++) {
      var discounted = isWeekday(state.date) && h < DISCOUNT_UNTIL;
      var b = chip(pad(h) + ':00', '', state.time === h, hourBusy(state.hall, state.date, h),
        discounted ? 'chip--discount' : '');
      b.dataset.time = h;
      timeChips.appendChild(b);
    }
  }

  function renderHours() {
    hoursChips.innerHTML = '';
    if (state.time === null) {
      hoursChips.innerHTML = '<p class="hint">Выберите время начала.</p>';
      return;
    }
    for (var n = 1; n <= MAX_HOURS; n++) {
      var b = chip(String(n), '', state.hours === n, !rangeFree(state.hall, state.date, state.time, n));
      b.dataset.hours = n;
      b.setAttribute('aria-label', n + ' ч');
      hoursChips.appendChild(b);
    }
  }

  // ---------- Итог и перенос в форму ----------
  function setValue(id, value) {
    var el = document.getElementById(id);
    if (el) el.value = value;
  }

  function setText(id, value) {
    document.getElementById(id).textContent = value;
  }

  function renderSummary(sendEvent) {
    var complete = state.hall && state.date && state.time !== null && state.hours;
    setText('sum-hall', state.hall ? HALLS[state.hall].name : '—');
    setText('sum-slot', state.date ? formatDate(state.date) + (state.time !== null ? ', ' + pad(state.time) + ':00' : '') : '—');
    setText('sum-hours', complete ? String(state.hours) : '—');

    if (!complete) {
      setText('sum-discount', '—');
      setText('sum-total', '0 ₽');
      setValue('f-slot', '');
      setValue('f-hours', '');
      setValue('f-total', '');
      if (state.hall) setValue('f-hall', state.hall);
      return;
    }

    var price = calcPrice(state.hall, state.date, state.time, state.hours);
    var slotTime = pad(state.time) + ':00';
    setText('sum-discount', price.discount ? '−' + price.discount.toLocaleString('ru-RU') + ' ₽' : 'нет');
    setText('sum-total', price.total.toLocaleString('ru-RU') + ' ₽');
    setValue('f-hall', state.hall);
    setValue('f-slot', state.date + ' ' + slotTime);
    setValue('f-hours', String(state.hours));
    setValue('f-total', String(price.total));

    if (sendEvent && typeof window.trackEvent === 'function') {
      window.trackEvent('slot_select', {
        hall_id: state.hall,
        slot_date: state.date,
        slot_time: slotTime,
        hours: state.hours,
        total_price: price.total
      });
    }
  }

  function renderAll(sendEvent) {
    renderHalls();
    renderDates();
    renderTimes();
    renderHours();
    renderSummary(sendEvent);
  }

  // ---------- Выбор пользователя ----------
  function selectHall(hall) {
    if (!HALLS[hall]) return;
    state.hall = hall;
    // Сбрасываем дату и время, если они недоступны в новом зале
    if (state.date && !dateHasFreeHours(hall, state.date)) state.date = null;
    if (state.date === null || (state.time !== null && hourBusy(hall, state.date, state.time))) state.time = null;
    if (state.time !== null) fitHours();
    renderAll(true);
  }

  // Если выбранное число часов не помещается, берём наибольшее возможное
  function fitHours() {
    while (state.hours > 1 && !rangeFree(state.hall, state.date, state.time, state.hours)) {
      state.hours--;
    }
  }

  hallChips.addEventListener('click', function (e) {
    var b = e.target.closest('.chip');
    if (b && !b.disabled) selectHall(b.dataset.hall);
  });

  dateChips.addEventListener('click', function (e) {
    var b = e.target.closest('.chip');
    if (!b || b.disabled) return;
    state.date = b.dataset.date;
    state.time = null;
    renderAll(false);
  });

  timeChips.addEventListener('click', function (e) {
    var b = e.target.closest('.chip');
    if (!b || b.disabled) return;
    state.time = Number(b.dataset.time);
    fitHours();
    renderAll(true);
  });

  hoursChips.addEventListener('click', function (e) {
    var b = e.target.closest('.chip');
    if (!b || b.disabled) return;
    state.hours = Number(b.dataset.hours);
    renderAll(true);
  });

  // Если посетитель сменил зал прямо в форме — синхронизируем выбор
  var hallSelect = document.getElementById('f-hall');
  if (hallSelect) {
    hallSelect.addEventListener('change', function () {
      if (hallSelect.value && !hallChips.querySelector('[data-hall="' + hallSelect.value + '"]').disabled) {
        selectHall(hallSelect.value);
      } else {
        hallSelect.value = state.hall || '';
      }
    });
  }

  // Зал из ссылки: contacts.html?hall=cyclorama
  var hallFromUrl = params.get('hall');
  renderAll(false);
  if (hallFromUrl && HALLS[hallFromUrl]) {
    var hallBtn = hallChips.querySelector('[data-hall="' + hallFromUrl + '"]');
    if (hallBtn && !hallBtn.disabled) selectHall(hallFromUrl);
  }
})();
