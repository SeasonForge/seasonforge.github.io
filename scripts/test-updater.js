import { BaseAdapter } from './updater/adapters/BaseAdapter.js';

// Mock the Gemini API call so tests can run without an API key
BaseAdapter.prototype.callGemini = async function(text, systemInstruction, schema) {
  console.log(`[Mock Gemini] Mocking extraction for: ${this.gameId}`);
  
  switch (this.gameId) {
    case 'path-of-exile':
      return {
        currentSeasonNameEn: "3.28: Necropolis Finale",
        currentSeasonNameRu: "3.28: Necropolis Finale",
        currentSeasonStartDate: "2026-03-30",
        currentSeasonEndDate: "",
        nextSeasonNameEn: "Curse of the Allflame",
        nextSeasonNameRu: "Curse of the Allflame",
        nextSeasonStartDate: "2026-07-24",
        nextSeasonEndDate: "",
        nextSeasonVerification: "official",
        status: "in-development",
        featuresEn: [
          "Protection while channeling Verisium Ore",
          "Animate Guardian's inventory",
          "Crafting Bench in every town",
          "New underwater Uniques including The Crustacean's Call and Subsume the Source",
          "ExileCon 2026 Race Qualifier Events"
        ],
        featuresRu: [
          "Защита во время поддержания жилы веризия",
          "Инвентарь Анимированного стража",
          "Верстак для создания предметов в каждом городе",
          "Новые подводные уникальные предметы, включая Призыв ракообразного и Поглощение истока",
          "Отборочные состязания к ExileCon 2026"
        ]
      };
    case 'path-of-exile-2':
      return {
        currentSeasonNameEn: "0.5.0: Return of the Ancients",
        currentSeasonNameRu: "0.5.0: Return of the Ancients",
        currentSeasonStartDate: "2026-05-29",
        currentSeasonEndDate: "",
        nextSeasonNameEn: "Version 1.0 (Release) (Estimated)",
        nextSeasonNameRu: "Версия 1.0 (Релиз) (Прогноз)",
        nextSeasonStartDate: "2026-12-15",
        nextSeasonEndDate: "",
        nextSeasonVerification: "estimated",
        status: "early-access",
        featuresEn: [
          "Runes of Aldur league testing",
          "Atlas of Worlds rework for the sequel",
          "New passive skill tree for early access",
          "Full release and new campaign acts in December (Estimated)"
        ],
        featuresRu: [
          "Тестирование лиги Runes of Aldur",
          "Переработка механики Атласа Миров под сиквел",
          "Новое древо пассивных умений для раннего доступа",
          "Полный релиз и новые акты кампании в декабре (прогноз)"
        ]
      };
    case 'diablo-iv':
      return {
        currentSeasonNameEn: "Season 14: Season of Death Awakening",
        currentSeasonNameRu: "Season 14: Season of Death Awakening",
        currentSeasonStartDate: "2026-07-01",
        currentSeasonEndDate: "",
        nextSeasonNameEn: "Season 15 (Estimated)",
        nextSeasonNameRu: "Сезон 15 (Прогноз)",
        nextSeasonStartDate: "2026-09-19",
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
        currentSeasonNameRu: "Cycle 4: Shattered Omens",
        currentSeasonStartDate: "2026-03-27",
        currentSeasonEndDate: "",
        nextSeasonNameEn: "Cycle 5 (Estimated)",
        nextSeasonNameRu: "Цикл 5 (Прогноз)",
        nextSeasonStartDate: "2026-09-11",
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
        currentSeasonStartDate: "2026-07-18",
        currentSeasonEndDate: "",
        nextSeasonNameEn: "SS14 (Estimated)",
        nextSeasonNameRu: "SS14 (Прогноз)",
        nextSeasonStartDate: "2026-10-24",
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
        currentSeasonStartDate: "2026-01-01",
        currentSeasonEndDate: "",
        nextSeasonNameEn: "Mock Next Season",
        nextSeasonNameRu: "Мок Следующий Сезон",
        nextSeasonStartDate: "2026-06-01",
        nextSeasonEndDate: "",
        status: "active",
        featuresEn: ["Mock Feature A", "Mock Feature B"],
        featuresRu: ["Мок Фича А", "Мок Фича Б"]
      };
  }
};

// Set dummy API key to bypass env validation
process.env.GEMINI_API_KEY = 'mock-api-key';
process.env.FORCE_UPDATE = 'true';

console.log('=== Running SeasonForge Backend Test Pipeline ===');
// Dynamically import and run the orchestrator
await import('./update-seasons.js');
console.log('=== SeasonForge Backend Test Pipeline Complete ===');
