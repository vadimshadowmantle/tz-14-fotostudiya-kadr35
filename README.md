# Фотостудия «Кадр 35» — сайт бронирования залов и сквозная аналитика заявок

Курсовая работа по дисциплине ОП.03 «Информационные технологии», ТЗ № ТЗ-14/2026.
Исполнитель: Бурмистров Вадим Александрович, группа 11/1-РПО-26/1.

Сайт к открытию бронирования «Новогоднего зала»: посетитель выбирает зал, дату и время и сразу видит стоимость с утренней скидкой. Каждый переход размечен UTM-меткой, каждая бронь попадает в Google Таблицу вместе с источником, а на дашборде DataLens видно, какой канал приводит брони.

![Схема работы](docs/scheme.png)

## Ссылки

| Что | Ссылка |
|---|---|
| Сайт | https://tz-14-fotostudiya-kadr35.vercel.app |
| Таблица заявок | https://docs.google.com/spreadsheets/d/1Bzp6WCqNPrF_MocAPSfABBoY0GPIYJEJKyGO_6qOMcc/edit |
| Дашборд DataLens | не сделан |
| Instagram и Reel с автоответом | https://www.instagram.com/stepan.1.stepanish/ (Reel — первая публикация профиля) |
| ВКонтакте | https://vk.ru/wall-242456076_1 · https://vk.ru/wall-242456355_1 |
| Telegram | https://t.me/kadr35_studio |
| YouTube | не опубликовано |
| Описание работы | [docs/opisanie.md](docs/opisanie.md) |
| Презентация к защите | [presentation/zashchita.pdf](presentation/zashchita.pdf) |

Ресурс GA4: `G-4CEEHYYT51` («КАДР 35 — сайт», поток «КАДР 35 — Vercel»). Доступ Viewer к ресурсу GA4 выдан: ___ (e-mail Заказчика).

## Что сделано

| Часть | Результат |
|---|---|
| Сайт | 9 страниц и 404, статический HTML/CSS/JS без сборки, Vercel с автодеплоем из `main`, Lighthouse (мобильный): Performance 83 / Accessibility 100 / SEO 100 |
| GA4 | 20 событий (6 автоматических, 14 своих), 7 пользовательских параметров, ключевые: `generate_lead`, `contact_click`, `messenger_click` |
| UTM | 12 ссылок в реестре (лист `utm`, `docs/utm.csv`, полная ссылка — формулой СЦЕПИТЬ), QR-код `docs/qr-u-12.png` на афише `docs/afisha.pdf`; опубликованы 8: Instagram, ВКонтакте, Telegram |
| Заявки | форма → Apps Script → лист `leads`: проверка полей, защита от повторов по `request_id`, статус брони `new → confirmed → prepaid → done / cancelled` |
| Instagram | ManyChat, две ветки: `ИДЕИ` → `ideas.html`, `СЕМЬЯ` → `photographers.html#family`; обе проверены до строки в таблице и `generate_lead` |
| Отчёты | не сделаны: Reports, Explore, записка `docs/report.md`, дашборд DataLens |

## Технологии

HTML, CSS, JavaScript · Google Analytics 4 · Google Таблицы и Apps Script · ManyChat · Yandex DataLens · GitHub и Vercel. Сайт создан с помощью Claude Code (модель Claude Opus 5.5), запросы — в [docs/prompts.md](docs/prompts.md).

## Структура

```text
index.html halls.html equipment.html photographers.html ideas.html contacts.html thanks.html privacy.html 404.html
css/style.css        стили (фирменные цвета и шрифты — раздел 2 ТЗ)
js/analytics.js      все события GA4
js/form.js           UTM в sessionStorage, проверка и отправка формы брони
js/booking.js        выбор зала, даты, времени и часов, расчёт итога
js/main.js           меню, галерея, калькулятор, фильтр фотографов, промокод
img/  files/         фото (WebP ≤ 300 КБ), картинки Open Graph, схемы залов PDF
apps-script/Code.gs  приёмник заявок (на основе приёмника из темы 7)
docs/                описание, схема, запросы, события, реестр UTM, записка, источники фото
screens/             кадры-доказательства по разделам ТЗ (чек-лист — screens/README.md)
presentation/        презентация к защите
```

Сайт открывается без сборки: `index.html` в браузере.

## Итог

Не получилось: отчёты и исследования GA4, атрибуция и оповещение, аналитическая записка, дашборд DataLens; публикации на YouTube и у партнёров (U-09…U-11); в Telegram вместо канала — группа (согласовано с преподавателем).

Нейросеть использовалась для: кода сайта и Apps Script, текстов по сведениям из ТЗ, схем, описания работы и презентации; все запросы — в [docs/prompts.md](docs/prompts.md).
