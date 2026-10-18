/**
 * Кадр 35 — приёмник заявок с сайта (раздел 6.2 ТЗ).
 * Веб-приложение принимает POST с JSON из js/form.js, проверяет данные
 * и дописывает строку в лист leads таблицы «Kadr35 — Bookings».
 *
 * Установка:
 * 1. script.google.com → Новый проект «Kadr35 — приёмник заявок» → вставить этот файл.
 * 2. Настройки проекта → Часовой пояс: (GMT+03:00) Москва.
 * 3. Выполнить функцию setupSheet() один раз (создаст листы, заголовки и проверки).
 * 4. Развернуть → Новое развертывание → Веб-приложение:
 *    «Запуск от имени: я», «Доступ: все». Ссылку /exec вставить в ENDPOINT в js/form.js.
 */

// Идентификатор таблицы (из адреса docs.google.com/spreadsheets/d/<ID>/edit).
// Если пусто — используется таблица, к которой привязан скрипт.
var SPREADSHEET_ID = '1Bzp6WCqNPrF_MocAPSfABBoY0GPIYJEJKyGO_6qOMcc';

var SHEET_LEADS = 'leads';
var HEADERS = ['request_id', 'created_at', 'name', 'phone', 'email', 'hall', 'slot', 'hours',
  'utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'status'];
var HALLS = ['loft', 'cyclorama', 'newyear'];
var STATUSES = ['new', 'confirmed', 'prepaid', 'done', 'cancelled'];
var UTM_DEFAULTS = { utm_source: 'direct', utm_medium: 'none', utm_campaign: 'not_set', utm_content: 'not_set' };
var MAX_LEN = 200;

function getBook_() {
  return SPREADSHEET_ID ? SpreadsheetApp.openById(SPREADSHEET_ID) : SpreadsheetApp.getActiveSpreadsheet();
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

/** Проверка, что приёмник опубликован: открыть ссылку /exec в браузере. */
function doGet() {
  return json_({ ok: true, service: 'kadr35-bookings' });
}

/** Приём заявки. Возвращает {"ok": true, "request_id": …} или {"ok": false, "error": "…"}. */
function doPost(e) {
  var data;
  try {
    data = JSON.parse(e.postData.contents);
  } catch (err) {
    return json_({ ok: false, error: 'Некорректный JSON' });
  }

  var check = validate_(data);
  if (check.error) return json_({ ok: false, error: check.error });
  var lead = check.lead;

  // Блокировка, чтобы две одновременные заявки не записались с одинаковым request_id
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
  } catch (err) {
    return json_({ ok: false, error: 'Сервер занят, попробуйте ещё раз' });
  }
  try {
    var sheet = getBook_().getSheetByName(SHEET_LEADS);
    if (!sheet) return json_({ ok: false, error: 'Лист leads не найден' });

    // Повтор: заявка с таким request_id уже есть — вторую строку не создаём
    var last = sheet.getLastRow();
    if (last > 1) {
      var ids = sheet.getRange(2, 1, last - 1, 1).getValues();
      for (var i = 0; i < ids.length; i++) {
        if (String(ids[i][0]) === lead.request_id) {
          return json_({ ok: false, error: 'Заявка с таким request_id уже принята' });
        }
      }
    }

    sheet.appendRow([
      lead.request_id,
      new Date(),           // created_at ставит приёмник
      lead.name,
      "'" + lead.phone,     // апостроф — чтобы таблица не превратила телефон в число
      lead.email,
      lead.hall,
      lead.slot,
      lead.hours,
      lead.utm_source,
      lead.utm_medium,
      lead.utm_campaign,
      lead.utm_content,
      'new'                 // status из браузера игнорируется
    ]);
    return json_({ ok: true, request_id: lead.request_id });
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
 * Один раз: заголовки, проверки данных, условное форматирование и лист crm_import.
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

  setupCrmImport_(book);
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
      if (c === ',') c = braces > 0 ? '\' : ';';
    }
    out += c;
  }
  return out;
}

/** Лист crm_import для импорта в HubSpot (раздел 6.4 ТЗ). */
function setupCrmImport_(book) {
  var crm = book.getSheetByName('crm_import') || book.insertSheet('crm_import');
  crm.clear();
  var headers = ['request_id', 'first_name', 'last_name', 'phone', 'email', 'hall', 'slot', 'hours',
    'utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'created_at', 'deal_stage', 'deal_name'];
  crm.getRange(1, 1, 1, headers.length).setValues([headers]).setFontWeight('bold');
  crm.setFrozenRows(1);

  // Формулы в английском синтаксисе; localize_() переводит их под локаль таблицы
  var stages = '{"new","New lead";"confirmed","Confirmed";"prepaid","Prepaid";"done","Closed won";"cancelled","Closed lost"}';
  var halls = '{"loft","Лофт";"cyclorama","Циклорама";"newyear","Новогодний зал"}';
  var f = {
    A2: '=ARRAYFORMULA(IF(leads!A2:A="","",leads!A2:A))',
    B2: '=ARRAYFORMULA(IF(leads!A2:A="","",IFERROR(INDEX(SPLIT(TRIM(leads!C2:C)," "),0,1),"")))',
    C2: '=ARRAYFORMULA(IF(leads!A2:A="","",IFERROR(REGEXREPLACE(TRIM(leads!C2:C),"^\S+\s*",""),"")))',
    D2: '=ARRAYFORMULA(IF(leads!A2:A="","","+7"&RIGHT(REGEXREPLACE(TO_TEXT(leads!D2:D),"\D",""),10)))',
    E2: '=ARRAYFORMULA(IF(leads!A2:A="","",TRIM(leads!E2:E)))',
    F2: '=ARRAYFORMULA(IF(leads!A2:A="","",leads!F2:F))',
    G2: '=ARRAYFORMULA(IF(leads!A2:A="","",TEXT(leads!G2:G,"yyyy-mm-dd hh:mm")))',
    H2: '=ARRAYFORMULA(IF(leads!A2:A="","",leads!H2:H))',
    I2: '=ARRAYFORMULA(IF(leads!A2:A="","",leads!I2:L))',
    M2: '=ARRAYFORMULA(IF(leads!A2:A="","",TEXT(leads!B2:B,"yyyy-mm-dd hh:mm")))',
    N2: '=ARRAYFORMULA(IF(leads!A2:A="","",IFERROR(VLOOKUP(leads!M2:M,' + stages + ',2,FALSE),"New lead")))',
    O2: '=ARRAYFORMULA(IF(leads!A2:A="","",TRIM(leads!C2:C)&" — "&IFERROR(VLOOKUP(leads!F2:F,' + halls + ',2,FALSE),leads!F2:F)&" — "&TEXT(leads!G2:G,"dd.mm.yyyy hh:mm")))'
  };
  Object.keys(f).forEach(function (cell) { crm.getRange(cell).setFormula(localize_(f[cell], book)); });
}
