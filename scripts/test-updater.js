import { BaseAdapter } from './updater/adapters/BaseAdapter.js';

// Helper to compute dates relative to today
const getRelativeDateString = (daysOffset) => {
  const date = new Date();
  date.setDate(date.getDate() + daysOffset);
  return date.toISOString().split('T')[0];
};

// Mock the Gemini API call so tests can run without an API key
BaseAdapter.prototype.callGemini = async function(text, systemInstruction, schema) {
  console.log(`[Mock Gemini] Mocking extraction for: ${this.gameId}`);
  
  // Return realistic mock extraction data matching the mockup screenshots mathematically
  switch (this.gameId) {
    case 'path-of-exile':
      return {
        currentSeasonNameEn: "3.28: Necropolis Finale",
        currentSeasonNameRu: "3.28: Финал Некрополя",
        currentSeasonStartDate: getRelativeDateString(-112),
        currentSeasonEndDate: getRelativeDateString(1),
        nextSeasonNameEn: "3.29: Curse of the Allflame",
        nextSeasonNameRu: "3.29: Проклятие Огня Всея",
        nextSeasonStartDate: getRelativeDateString(5),
        nextSeasonEndDate: "",
        nextSeasonVerification: "official",
        status: "ending",
        featuresEn: [
          "Curse of the Allflame expansion content",
          "ExileCon 2026 Solo Qualifier Race Events",
          "Reliquarian ascendancy update for Scion class",
          "Exclusive Abyssal Soul Shatter cosmetic effect"
        ],
        featuresRu: [
          "Контент нового расширения Curse of the Allflame",
          "Квалификационные гонки ExileCon 2026 в соло-формате",
          "Обновление восхождения Reliquarian для класса Дикарка (Scion)",
          "Эксклюзивный косметический эффект Abyssal Soul Shatter"
        ]
      };
    case 'diablo-iv':
      return {
        currentSeasonNameEn: "Season 14: Season of Death Awakening",
        currentSeasonNameRu: "Сезон 14: Season of Death Awakening",
        currentSeasonStartDate: getRelativeDateString(-19),
        currentSeasonEndDate: getRelativeDateString(5),
        nextSeasonNameEn: "Season 15",
        nextSeasonNameRu: "Сезон 15",
        nextSeasonStartDate: getRelativeDateString(61),
        nextSeasonEndDate: "",
        nextSeasonVerification: "estimated",
        status: "in-progress",
        featuresEn: [
          "Fight the new threat from Death Cults",
          "Trials Tower progression and updated leaderboards",
          "Free trial access to the new character class",
          "Return of the Realmwalkers mechanic to the game",
          "Massive rework of the mythical unique items system"
        ],
        featuresRu: [
          "Борьба с новой угрозой от культов Смерти (Death Cults)",
          "Прогрессия Башни испытаний и обновленные таблицы лидеров",
          "Бесплатный пробный доступ к новому игровому классу",
          "Возвращение механики Мироходцев (Realmwalkers) в игру",
          "Масштабный реворк системы эпохальных уникальных предметов"
        ]
      };
    case 'last-epoch':
      return {
        currentSeasonNameEn: "Cycle 4: Shattered Omens",
        currentSeasonNameRu: "Цикл 4: Shattered Omens",
        currentSeasonStartDate: getRelativeDateString(-115),
        currentSeasonEndDate: getRelativeDateString(1),
        nextSeasonNameEn: "Cycle 5 & Orobyss Expansion",
        nextSeasonNameRu: "Cycle 5 & Расширение Orobyss",
        nextSeasonStartDate: getRelativeDateString(53),
        nextSeasonEndDate: "",
        nextSeasonVerification: "estimated",
        status: "active",
        featuresEn: [
          "Random encounters with Omens",
          "Rework of crafting and trade factions systems",
          "Second major expansion with new subclasses",
          "Expanded Monolith of Fate endgame content"
        ],
        featuresRu: [
          "Случайные энкаунтеры с Предзнаменованиями (Omens)",
          "Реворк системы крафта и фракций торговли",
          "Второе крупное дополнение с новыми подклассами",
          "Расширенный эндгейм-контент монолитов судьбы"
        ]
      };
    case 'torchlight-infinite':
      return {
        currentSeasonNameEn: "SS13: Afterlight",
        currentSeasonNameRu: "SS13: Afterlight",
        currentSeasonStartDate: getRelativeDateString(-2),
        currentSeasonEndDate: getRelativeDateString(5),
        nextSeasonNameEn: "SS14",
        nextSeasonNameRu: "SS14",
        nextSeasonStartDate: getRelativeDateString(96),
        nextSeasonEndDate: "",
        nextSeasonVerification: "estimated",
        status: "just-started",
        featuresEn: [
          "Night Watch mechanic: guiding the souls of the deceased",
          "New ultra-hard endgame mode Divine Ascent",
          "New playable mage hero Chronos",
          "Next-generation loot filter automation"
        ],
        featuresRu: [
          "Механика Ночных Стражей: проводы душ усопших",
          "Новый сверхсложный эндгейм-режим Divine Ascent",
          "Новый играбельный герой-маг Кронос",
          "Автоматизация лут-фильтра нового поколения"
        ]
      };
    default:
      return {
        currentSeasonNameEn: "Mock Season",
        currentSeasonNameRu: "Мок Сезон",
        currentSeasonStartDate: getRelativeDateString(-30),
        currentSeasonEndDate: getRelativeDateString(30),
        nextSeasonNameEn: "Mock Next Season",
        nextSeasonNameRu: "Мок Следующий Сезон",
        nextSeasonStartDate: getRelativeDateString(45),
        nextSeasonEndDate: "",
        status: "active",
        featuresEn: ["Mock Feature A", "Mock Feature B"],
        featuresRu: ["Мок Фича А", "Мок Фича Б"]
      };
  }
};

// Set dummy API key to bypass env validation
process.env.GEMINI_API_KEY = 'mock-api-key';

console.log('=== Running SeasonForge Backend Test Pipeline ===');
// Dynamically import and run the orchestrator
await import('./update-seasons.js');
console.log('=== SeasonForge Backend Test Pipeline Complete ===');
