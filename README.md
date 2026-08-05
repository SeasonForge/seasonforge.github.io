# ⚡ SeasonForge

> **SeasonForge** — это быстрый Data-Driven трекер сезонов, лиг и эвент-таймлайнов для ARPG игр (**Path of Exile 1/2**, **Diablo IV**, **Last Epoch**, **Torchlight: Infinite**).

Проект сочетает автоматический сбор и валидацию данных с помощью ИИ (Google Gemini Flash), хранение полных архивов прошлых лиг и генерацию статических страниц (SSG) для обеспечения максимальной скорости загрузки и SEO.

---

## 🎮 Поддерживаемые игры и архивы

- 💀 **Path of Exile 1** (Grinding Gear Games) — *полный архив лиг с 2015 года (30+ лиг)*
- ⚔️ **Path of Exile 2** (Grinding Gear Games)
- 🔥 **Diablo IV** (Blizzard Entertainment) — *архив начиная с Сезона 1*
- ⏳ **Last Epoch** (Eleventh Hour Games) — *архив циклов с версии 1.0*
- ⚡ **Torchlight: Infinite** (XD Inc.) — *архив сезонов с SS1*

---

## 🛠 Технологии и архитектура

- **Frontend**: Vanilla ES Modules JavaScript, Vanilla CSS (Glassmorphic UI, Dark Mode), HTML5.
- **Data Pipeline**: Node.js, RSS/API-скрейпинг, Google Gemini AI (Structured Output JSON schema).
- **History & Archives**: Файлы архивов `data/history/*.json` с индивидуальной SSG-генерацией страниц прошлых сезонов.
- **SSG & SEO**: Автоматическая пре-генерация 80+ HTML-страниц, `sitemap.xml`, `robots.txt`, Schema.org (JSON-LD).
- **Automation**: GitHub Actions (раз в 12 часов).

Подробное описание архитектуры см. в [Документации проекта](docs/PROJECT_OVERVIEW.md).

---

## 🚀 Быстрый старт

### Требования
- Node.js `v18+`
- npm

### Установка
```bash
git clone https://github.com/SeasonForge/seasonforge.github.io.git
cd seasonforge.github.io
```

### Доступные npm-скрипты

- **Сборка статических страниц и архивов (SSG)**:
  ```bash
  npm run build
  ```
  *Генерирует статический сайт (включая страницы архивов) и автоматически запускает встроенную валидацию всех HTML-страниц.*

- **Обновление данных (Data Pipeline)**:
  ```bash
  npm run update
  ```
  *Запускает сбор новостей по всем играм, обращение к Gemini AI, валидацию и мёрдж данных.*

- **Локальный веб-сервер**:
  ```bash
  node scripts/serve.js
  ```
  *Запускает локальный сервер на `http://127.0.0.1:8080`.*

---

## 📂 Структура репозитория

- `data/` — JSON-база данных (`seasons.json`), конфигурации адаптеров и архивы прошлых лиг (`data/history/*.json`).
- `scripts/` — Скрипты SSG сборки (`build.js`), обновления (`update-seasons.js`) и адаптеры игр.
- `src/` — Исходный код SPA фронтенда (компоненты, сервисы, локализация, стили).
- `docs/` — Техническая документация архитектуры.

---

## 📜 Лицензия

Private & Internal Use.
