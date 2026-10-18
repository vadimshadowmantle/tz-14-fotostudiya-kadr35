/**
 * Кадр 35 — приёмник заявок с сайта (раздел 6.2 ТЗ).
 * За основу взят приёмник из темы 7 курса (materials/tema-07-google-sheets-leads/Code.gs):
 * блокировка, поиск повтора через TextFinder, проверка заголовков листа, защита ячеек от формул.
 * Добавлено под ТЗ-14: телефон, зал, начало брони, часы, utm_content и ответ на fetch из js/form.js.
 *
 * Установка:
 * 1. script.google.com → Новый проект «Kadr35 — приёмник заявок» → вставить этот файл.
 * 2. Настройки проекта → Часовой пояс: (GMT+03:00) Москва.
 * 3. Выполнить функцию setupSheet() один раз (заголовки, выпадающие списки, подсветка).
 * 4. Развернуть → Новое развертывание → Веб-приложение:
 *    «Запуск от имени: я», «Доступ: все». Ссылку /exec вставить в ENDPOINT в js/form.js.
 */

// ID таблицы «Kadr35 — Bookings» — между /d/ и /edit в её адресе.
const SPREADSHEET_ID = '1Bzp6WCqNPrF_MocAPSfABBoY0GPIYJEJKyGO_6qOMcc';

const SHEET_LEADS = 'leads';
const HEADERS = ['request_id', 'created_at', 'name', 'phone', 'email', 'hall', 'slot', 'hours',
  'utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'status'];
const HALLS = ['loft', 'cyclorama', 'newyear'];
const STATUSES = ['new', 'confirmed', 'prepaid', 'done', 'cancelled'];
const UTM_DEFAULTS = {utm_source: 'direct', utm_medium: 'none', utm_campaign: 'not_set', utm_content: 'not_set'};
const MAX_LEN = 200;

function getBook_() {
  return SpreadsheetApp.openById(SPREADSHEET_ID);
}

function jsonResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

function textCell(value) {
  // Не даём введённому тексту превратиться в формулу Google Sheets.
  return /^[=+@-]/.test(value) ? "'" + value : value;
}

/** Проверка, что приёмник опубликован: открыть ссылку /exec в браузере. */
function doGet() {
  return jsonResponse({ok: true, service: 'kadr35-bookings'});
}

/**
 * Приём заявки. Сайт отправляет JSON через fetch (раздел 6.3 ТЗ),
 * обычная HTML-форма из темы 7 — поля формы; принимаются оба варианта.
 * Ответ: {"ok": true, "request_id": …} или {"ok": false, "error": "…"}.
 */
function doPost(e) {
  let data = (e && e.parameter) || {};
  if (e && e.postData && e.postData.type !== 'application/x-www-form-urlencoded') {
    try {
      data = JSON.parse(e.postData.contents);
    } catch (err) {
      return jsonResponse({ok: false, error: 'invalid_json'});
    }
  }

  const check = validate_(data);
  if (check.error) return jsonResponse({ok: false, error: check.error});
  const lead = check.lead;

  // Проверка ID и запись выполняются под одной блокировкой.
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(10000)) return jsonResponse({ok: false, error: 'busy_retry'});
  try {
    const sheet = getBook_().getSheetByName(SHEET_LEADS);
    if (!sheet || sheet.getRange(1, 1, 1, HEADERS.length).getValues()[0].join('|') !== HEADERS.join('|')) {
      return jsonResponse({ok: false, error: 'invalid_sheet_schema'});
    }
    const duplicate = sheet.getRange('A:A').createTextFinder(lead.request_id)
      .matchEntireCell(true).matchCase(false).useRegularExpression(false).findNext();
    if (duplicate) return jsonResponse({ok: false, error: 'duplicate_request_id'});

    sheet.appendRow([
      lead.request_id,
      new Date(),                 // created_at ставит приёмник
      textCell(lead.name),
      "'" + lead.phone,           // апостроф — чтобы таблица не превратила телефон в число
      textCell(lead.email),
      lead.hall,
      lead.slot,
      lead.hours,
      textCell(lead.utm_source),
      textCell(lead.utm_medium),
      textCell(lead.utm_campaign),
      textCell(lead.utm_content),
      'new'                       // присланный клиентом status игнорируется
    ]);
    SpreadsheetApp.flush();
    return jsonResponse({ok: true, request_id: lead.request_id});
  } catch (error) {
    // Не возвращаем клиенту детали таблицы и содержимое заявки.
    return jsonResponse({ok: false, error: 'storage_error'});
  } finally {
    lock.releaseLock();
  }
}

/** Проверяет поля заявки. Возвращает {lead} или {error}. */
function validate_(d) {
  if (!d || typeof d !== 'object') return { error: 'Пустая заявка' };

  // Длина строк — не больше 200 символов
  var keys = Object.keys(d);
  for (var k = 0; k < keys.length; k++) {
    if (typeof d[keys[k]] === 'string' && d[keys[k]].length > MAX_LEN) {
      return { error: 'Поле ' + keys[k] + ' длиннее ' + MAX_LEN + ' символов' };
    }
  }

  var requestId = String(d.request_id || '').trim();
  if (!/^REQ-[0-9a-f-]{8,}$/i.test(requestId)) return { error: 'Некорректный request_id' };

  var name = String(d.name || '').trim();
  if (name.length < 2 || name.length > 60) return { error: 'Имя — от 2 до 60 символов' };

  var digits = String(d.phone || '').replace(/\D/g, '');
  if (digits.length === 11 && (digits[0] === '7' || digits[0] === '8')) digits = digits.slice(1);
  if (digits.length !== 10) return { error: 'Телефон должен быть в формате +7 и 10 цифр' };
  var phone = '+7' + digits;

  var email = String(d.email || '').trim();
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) return { error: 'Некорректный e-mail' };

  var hall = String(d.hall || '');
  if (HALLS.indexOf(hall) === -1) return { error: 'Неизвестный зал' };

  // slot: 'YYYY-MM-DD HH:MM', время студии 09:00–23:00
  var m = /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})$/.exec(String(d.slot || ''));
  if (!m) return { error: 'Некорректная дата и время брони' };
  var slot = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]), Number(m[4]), Number(m[5]));
  if (isNaN(slot.getTime())) return { error: 'Некорректная дата и время брони' };
  if (slot.getTime() < Date.now()) return { error: 'Время брони уже прошло' };

  var hours = Number(d.hours);
  if (!(hours >= 1 && hours <= 8 && Math.floor(hours) === hours)) return { error: 'Часов — от 1 до 8' };
  var startHour = Number(m[4]);
  if (startHour < 9 || startHour + hours > 23) return { error: 'Студия работает с 09:00 до 23:00' };

  if (hall === 'newyear') {
    var day = m[1] + '-' + m[2] + '-' + m[3];
    if (day < '2026-12-01' || day > '2027-01-10') {
      return { error: 'Новогодний зал доступен с 1 декабря 2026 по 10 января 2027' };
    }
  }

  var lead = {
    request_id: requestId, name: name, phone: phone, email: email,
    hall: hall, slot: slot, hours: hours
  };
  Object.keys(UTM_DEFAULTS).forEach(function (key) {
    var value = String(d[key] || '').trim().toLowerCase();
    lead[key] = /^[a-z0-9_]{1,100}$/.test(value) ? value : UTM_DEFAULTS[key];
  });
  return { lead: lead };
}

/**
 * Один раз: заголовки, проверки данных и условное форматирование листа leads.
 * Запуск: выбрать setupSheet в списке функций → «Выполнить».
 */
function setupSheet() {
  var book = getBook_();
  var sheet = book.getSheetByName(SHEET_LEADS) || book.insertSheet(SHEET_LEADS);
  sheet.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]).setFontWeight('bold');
  sheet.setFrozenRows(1);

  var rows = sheet.getMaxRows() - 1;
  sheet.getRange('B2:B').setNumberFormat('dd.MM.yyyy HH:mm:ss');
  sheet.getRange('G2:G').setNumberFormat('dd.MM.yyyy HH:mm');
  sheet.getRange('D2:D').setNumberFormat('@');

  // Выпадающие списки: hall и status, другие значения отклоняются
  sheet.getRange(2, 6, rows, 1).setDataValidation(
    SpreadsheetApp.newDataValidation().requireValueInList(HALLS, true).setAllowInvalid(false).build());
  sheet.getRange(2, 13, rows, 1).setDataValidation(
    SpreadsheetApp.newDataValidation().requireValueInList(STATUSES, true).setAllowInvalid(false).build());
  sheet.getRange(2, 8, rows, 1).setDataValidation(
    SpreadsheetApp.newDataValidation().requireNumberBetween(1, 8).setAllowInvalid(false).build());

  // Подсветка: пустые обязательные ячейки (все, кроме email) и повторяющиеся request_id
  var data = sheet.getRange('A2:M');
  var rules = [
    SpreadsheetApp.newConditionalFormatRule()
      .whenFormulaSatisfied(localize_('=AND(COUNTA($A2:$M2)>0,COUNTIF($A$2:$A,$A2)>1)', book))
      .setBackground('#F4C7C3').setRanges([sheet.getRange('A2:A')]).build(),
    SpreadsheetApp.newConditionalFormatRule()
      .whenFormulaSatisfied(localize_('=AND(COUNTA($A2:$M2)>0,A2="",COLUMN(A2)<>5)', book))
      .setBackground('#FCE8B2').setRanges([data]).build()
  ];
  sheet.setConditionalFormatRules(rules);

  SpreadsheetApp.flush();
}

/**
 * Формулы в коде записаны в английском синтаксисе (разделитель — запятая).
 * В таблице с русской локалью setFormula ждёт «;» между аргументами и «\» между
 * столбцами массива {…}, поэтому переводим формулу под локаль таблицы.
 */
function localize_(formula, book) {
  var locale = book.getSpreadsheetLocale() || 'en_US';
  if (/^(en|ja|zh|ko|th|he|hi)/.test(locale)) return formula; // десятичная точка — запятые остаются
  var out = '', inQuotes = false, braces = 0;
  for (var i = 0; i < formula.length; i++) {
    var c = formula[i];
    if (c === '"') inQuotes = !inQuotes;
    if (!inQuotes) {
      if (c === '{') braces++;
      if (c === '}') braces--;
      if (c === ',') c = braces > 0 ? '\\' : ';';
    }
    out += c;
  }
  return out;
}
