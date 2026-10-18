/**
 * Кадр 35 — реестр UTM-ссылок (раздел 5.2–5.3 ТЗ), лист utm таблицы «Kadr35 — Bookings».
 * Полная ссылка собирается формулой СЦЕПИТЬ (CONCATENATE) из столбцов меток — вручную ссылки не набираются.
 * Метки ставятся после ? и до #, если в адресе страницы есть якорь (правило 5.1.5).
 * Запуск: выбрать setupUtmSheet в списке функций → «Выполнить». Повторный запуск перезаписывает лист.
 * Функции getBook_() и localize_() — в Code.gs того же проекта.
 */

const SHEET_UTM = 'utm';
const SITE_URL = 'https://tz-14-fotostudiya-kadr35.vercel.app/';
const UTM_MEDIUMS = ['social', 'affiliate', 'qr', 'email', 'cpc', 'referral'];
const UTM_HEADERS = ['номер', 'канал', 'размещение', 'utm_source', 'utm_medium', 'utm_campaign', 'utm_content',
  'страница', 'полная ссылка', 'короткая ссылка', 'адрес публикации', 'дата публикации', 'комментарий'];

// номер, канал, размещение, source, medium, campaign, content, страница, комментарий
const UTM_ROWS = [
  ["U-01", "Instagram", "ссылка в шапке профиля", "instagram", "social", "newyear_shoot_2026", "bio", "index.html", ""],
  ["U-02", "Instagram", "автоответ под Reel (ManyChat), ветка ИДЕИ", "instagram", "social", "newyear_shoot_2026", "reel_hall_01", "ideas.html", "кнопка «Смотреть идеи» в Direct"],
  ["U-03", "Instagram", "автоответ, ветка «СЕМЬЯ»", "instagram", "social", "family_shoot_2026", "reel_hall_01_family", "photographers.html#family", "метки стоят до якоря #family"],
  ["U-04", "Instagram", "ссылка-стикер в Stories", "instagram", "social", "newyear_shoot_2026", "stories_01", "contacts.html", "utm_content: первая сторис кампании"],
  ["U-05", "ВКонтакте", "пост в сообществе", "vk", "social", "newyear_shoot_2026", "post_01", "halls.html", ""],
  ["U-06", "ВКонтакте", "пост в сообществе фотографов города", "vk", "social", "newyear_shoot_2026", "photographers_group", "halls.html", "utm_campaign: та же кампания бронирования Новогоднего зала"],
  ["U-07", "Telegram", "пост в канале", "telegram", "social", "newyear_shoot_2026", "post_01", "contacts.html", ""],
  ["U-08", "Telegram", "закреплённое сообщение «Свободные часы недели»", "telegram", "social", "newyear_shoot_2026", "pinned_free_slots", "contacts.html", "utm_content: закреплённое сообщение со свободными часами"],
  ["U-09", "YouTube", "описание видео «Обзор новогоднего зала»", "youtube", "social", "newyear_shoot_2026", "hall_tour", "halls.html", "страница выбрана сама: после обзора зала зритель хочет увидеть площадь, свет, цену и схему зала — это halls.html"],
  ["U-10", "Блогер 1", "ссылка у партнёра", "blogger_nick_1", "affiliate", "newyear_shoot_2026", "stories_01", "ideas.html", "utm_source: заменить на ник одногруппника латиницей; utm_content — формат размещения"],
  ["U-11", "Блогер 2", "ссылка у фотографа-партнёра", "blogger_nick_2", "affiliate", "newyear_shoot_2026", "post_01", "halls.html", "utm_source: заменить на ник одногруппника латиницей; utm_content — формат размещения"],
  ["U-12", "Визитки", "QR-код на визитке студии", "card_qr", "qr", "newyear_shoot_2026", "studio_card", "contacts.html", "QR — docs/qr-u-12.png, афиша — docs/afisha.pdf"]
];

function setupUtmSheet() {
  const book = getBook_();
  const sheet = book.getSheetByName(SHEET_UTM) || book.insertSheet(SHEET_UTM);
  sheet.clear();
  sheet.getRange(1, 1, 1, UTM_HEADERS.length).setValues([UTM_HEADERS]).setFontWeight('bold');
  sheet.setFrozenRows(1);

  UTM_ROWS.forEach(function (r, i) {
    const row = i + 2;
    sheet.getRange(row, 1, 1, 8).setValues([r.slice(0, 8)]);
    sheet.getRange(row, 13).setValue(r[8]);
    // Страница без якоря + метки + якорь (если есть)
    const f = '=CONCATENATE("' + SITE_URL + '",' +
      'IF(ISNUMBER(FIND("#",H' + row + ')),LEFT(H' + row + ',FIND("#",H' + row + ')-1),H' + row + '),' +
      '"?utm_source=",D' + row + ',"&utm_medium=",E' + row + ',"&utm_campaign=",F' + row + ',"&utm_content=",G' + row + ',' +
      'IF(ISNUMBER(FIND("#",H' + row + ')),MID(H' + row + ',FIND("#",H' + row + '),100),""))';
    sheet.getRange(row, 9).setFormula(localize_(f, book));
  });

  // utm_medium — только из списка правила 5.1.2
  sheet.getRange(2, 5, UTM_ROWS.length, 1).setDataValidation(
    SpreadsheetApp.newDataValidation().requireValueInList(UTM_MEDIUMS, true).setAllowInvalid(false).build());
  sheet.getRange(2, 12, UTM_ROWS.length, 1).setNumberFormat('dd.MM.yyyy');
  sheet.autoResizeColumns(1, 8);
  sheet.setColumnWidth(9, 520);
  sheet.setColumnWidth(13, 360);
  SpreadsheetApp.flush();
}
