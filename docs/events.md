# Таблица событий GA4

Ресурс «КАДР 35 — сайт», поток «КАДР 35 — Vercel», идентификатор `G-4CEEHYYT51`.

Все вызовы `gtag('event', …)` находятся в одном месте — `js/analytics.js:42` (функция `trackEvent`). Кнопки и ссылки описаны атрибутами `data-event` и `data-*`. Общий обработчик кликов `js/analytics.js:65` превращает их в событие: `data-button-name` → `button_name`. Остальные скрипты вызывают `window.trackEvent()`.

| № | Событие | Тип | Где отправляется (файл:строка) | Параметры и пример значений |
|---|---|---|---|---|
| 1 | `page_view` | авто | расширенная статистика | `page_location` = `https://tz-14-fotostudiya-kadr35.vercel.app/ideas.html?utm_source=instagram…`, `page_title` = «10 идей новогодней фотосессии — фотостудия «Кадр 35»» |
| 2 | `scroll` | авто | расширенная статистика | `percent_scrolled` = 90 |
| 3 | `click` | авто | расширенная статистика (ссылки Telegram, WhatsApp, соцсети) | `link_url` = `https://t.me/kadr35_admin`, `outbound` = true |
| 4 | `file_download` | авто | расширенная статистика, ссылки «Схема зала PDF» в `halls.html` | `file_name` = `/files/scheme-loft.pdf`, `file_extension` = `pdf` |
| 5 | `form_start` | авто | расширенная статистика, форма `#booking-form` в `contacts.html` | `form_id` = `booking-form` |
| 6 | `form_submit` | авто* | `js/form.js:145` — после успешной проверки полей, перед отправкой | `form_id` = `booking-form`, `form_name` = `booking`, `form_destination` = `script.google.com`, `form_submit_text` = `Забронировать` |
| 7 | `generate_lead` ★ | рекоменд. | `js/form.js:189`, только после ответа приёмника `{"ok": true}` | `lead_hall` = `cyclorama`, `hours` = 2, `value` = 3520, `currency` = `RUB` |
| 8 | `cta_click` | своё | `js/analytics.js:65` ← `data-event="cta_click"` в index, halls, equipment, photographers, ideas, contacts, 404 | `button_name` = `hero_book_newyear`, `page_section` = `hero` |
| 9 | `hall_view` | своё | `js/analytics.js:65` ← карточки залов в `index.html` и `halls.html` | `hall_id` = `loft` |
| 10 | `slot_select` | своё | `js/booking.js:253` | `hall_id` = `cyclorama`, `slot_date` = `2026-10-19`, `slot_time` = `10:00`, `hours` = 2, `total_price` = 3520 |
| 11 | `equipment_calc` | своё | `js/main.js:95` | `items_count` = 3, `total_price` = 2100 |
| 12 | `photographer_filter` | своё | `js/main.js:118` | `genre` = `family` |
| 13 | `photographer_view` | своё | `js/analytics.js:65` ← карточки в `index.html`, кнопка «Портфолио и цена» в `photographers.html` | `photographer_id` = `morozov`, `genre` = `family` |
| 14 | `idea_open` | своё | `js/analytics.js:72` (раскрытие `<details>` в `ideas.html`) | `idea_id` = `pajamas` |
| 15 | `contact_click` ★ | своё | `js/analytics.js:65` ← телефон в шапке и подвале, e-mail | `contact_type` = `phone` / `email` |
| 16 | `messenger_click` ★ | своё | `js/analytics.js:65` ← кнопки Telegram и WhatsApp в `contacts.html` | `messenger` = `telegram` / `whatsapp` |
| 17 | `social_click` | своё | `js/analytics.js:65` ← иконки соцсетей в подвале и на `thanks.html` | `network` = `instagram`, `page_section` = `footer` / `thanks` |
| 18 | `form_error` | своё | `js/form.js:137` (ошибка поля), `js/form.js:194` (ошибка приёмника) | `field_name` = `phone`, `error_type` = `required` / `format` / `server` |
| 19 | `promo_copy` | по выбору | `js/main.js:148` | `promo_code` = `NEWYEAR15` |
| 20 | `gallery_view` | по выбору | `js/analytics.js:65` ← кадры галереи в `index.html` | `hall_id` = `newyear`, `photo_index` = 3 |

★ — ключевое событие (Admin → События → Ключевые события).

\* `form_submit` по ТЗ собирает расширенная статистика. Но форма брони отправляется через `fetch`, а обработчик вызывает `preventDefault()`: расширенная статистика считает такую отправку отменённой и событие не шлёт (проверено в Realtime 18.10.2026). Поэтому `form_submit` отправляется из кода с теми же параметрами, что у автоматического.

## Пользовательские параметры (Admin → Специальные определения)

Все 7 зарегистрированы 18.10.2026, область действия — «Событие»:
`button_name`, `page_section`, `hall_id`, `hours`, `genre`, `lead_hall`, `messenger`.

## Персональные данные

Имя, телефон и e-mail в GA4 не передаются: в событиях их нет, а адрес `thanks.html` не содержит данных посетителя, детали брони берутся из sessionStorage.
