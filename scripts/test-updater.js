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
        currentSeasonName: "3.28: Necropolis Finale",
        currentSeasonStartDate: getRelativeDateString(-112),
        currentSeasonEndDate: getRelativeDateString(1),
        nextSeasonName: "3.29: Curse of the Allflame",
        nextSeasonStartDate: getRelativeDateString(5),
        nextSeasonEndDate: "",
        nextSeasonVerification: "official",
        status: "ending",
        features: [
          "Тематика глубоководных экспедиций («Вояжи»)",
          "Альтернативная система гнезд в предметах",
          "Глобальный реворк механик Бездны (Abyss) и Легиона",
          "Новые классы восхождения и балансировка умений"
        ]
      };
    case 'diablo-iv':
      return {
        currentSeasonName: "Сезон 14: Season of Death Awakening",
        currentSeasonStartDate: getRelativeDateString(-19),
        currentSeasonEndDate: getRelativeDateString(5),
        nextSeasonName: "Season 15",
        nextSeasonStartDate: getRelativeDateString(61),
        nextSeasonEndDate: "",
        nextSeasonVerification: "estimated",
        status: "in-progress",
        features: [
          "Тематика «Пробуждения Смерти»",
          "Новое подземелье-испытание «Катакомбы Мучений»",
          "Система напарников-наемников нового поколения",
          "Изменение баланса классов после BlizzCon 2026"
        ]
      };
    case 'last-epoch':
      return {
        currentSeasonName: "Цикл 4: Shattered Omens",
        currentSeasonStartDate: getRelativeDateString(-115),
        currentSeasonEndDate: getRelativeDateString(1),
        nextSeasonName: "Cycle 5 & Расширение Orobyss",
        nextSeasonStartDate: getRelativeDateString(53),
        nextSeasonEndDate: "",
        nextSeasonVerification: "estimated",
        status: "active",
        features: [
          "Случайные энкаунтеры с Предзнаменованиями (Omens)",
          "Реворк системы крафта и фракций торговли",
          "Второе крупное дополнение с новыми подклассами",
          "Расширенный эндгейм-контент монолитов судьбы"
        ]
      };
    case 'torchlight-infinite':
      return {
        currentSeasonName: "SS13: Afterlight",
        currentSeasonStartDate: getRelativeDateString(-2),
        currentSeasonEndDate: getRelativeDateString(5),
        nextSeasonName: "SS14",
        nextSeasonStartDate: getRelativeDateString(96),
        nextSeasonEndDate: "",
        nextSeasonVerification: "estimated",
        status: "just-started",
        features: [
          "Механика Ночных Стражей: проводы душ усопших",
          "Новый сверхсложный эндгейм-режим Divine Ascent",
          "Новый играбельный герой-маг Кронос",
          "Автоматизация лут-фильтра нового поколения"
        ]
      };
    default:
      return {
        currentSeasonName: "Mock Season",
        currentSeasonStartDate: getRelativeDateString(-30),
        currentSeasonEndDate: getRelativeDateString(30),
        nextSeasonName: "Mock Next Season",
        nextSeasonStartDate: getRelativeDateString(45),
        nextSeasonEndDate: "",
        status: "active",
        features: ["Mock Feature A", "Mock Feature B"]
      };
  }
};

// Set dummy API key to bypass env validation
process.env.GEMINI_API_KEY = 'mock-api-key';

console.log('=== Running SeasonForge Backend Test Pipeline ===');
// Dynamically import and run the orchestrator
await import('./update-seasons.js');
console.log('=== SeasonForge Backend Test Pipeline Complete ===');
