// Validator class to check data formats and business logic rules
export class Validator {
  static validateGame(data) {
    if (!data || typeof data !== 'object') {
      throw new Error('Data must be an object');
    }

    if (!data.id || typeof data.id !== 'string') {
      throw new Error('Missing or invalid game ID');
    }

    if (!data.name || (typeof data.name !== 'string' && typeof data.name !== 'object')) {
      throw new Error('Missing or invalid game name');
    }

    const currentYear = new Date().getFullYear();
    const minYear = currentYear - 1;
    const maxYear = currentYear + 5;

    // Validate date format helper
    const isValidDate = (dateStr) => {
      if (!dateStr) return true; // Empty string or null is allowed (TBA)
      const date = new Date(dateStr);
      if (Number.isNaN(date.getTime())) {
        return false;
      }
      const year = date.getFullYear();
      return year >= minYear && year <= maxYear;
    };

    // Validate season object helper
    const validateSeason = (season, label) => {
      if (!season || typeof season !== 'object') {
        throw new Error(`${label} must be an object`);
      }

      if (season.startDate && !isValidDate(season.startDate)) {
        throw new Error(`Invalid or out-of-range start date in ${label}: ${season.startDate}`);
      }

      if (season.endDate && !isValidDate(season.endDate)) {
        throw new Error(`Invalid or out-of-range end date in ${label}: ${season.endDate}`);
      }

      if (season.startDate && season.endDate) {
        const start = new Date(season.startDate);
        const end = new Date(season.endDate);
        if (start.getTime() >= end.getTime()) {
          throw new Error(`Start date must be before end date in ${label}`);
        }
      }

      const validVerifications = ['official', 'ai', 'estimated'];
      if (season.verification && !validVerifications.includes(season.verification)) {
        throw new Error(`Invalid verification value in ${label}: ${season.verification}. Must be one of ${validVerifications.join(', ')}`);
      }
    };

    if (data.currentSeason) {
      validateSeason(data.currentSeason, 'currentSeason');
    }

    if (data.nextSeason) {
      validateSeason(data.nextSeason, 'nextSeason');
    }

    // Validate features
    if (data.features && !Array.isArray(data.features) && typeof data.features !== 'object') {
      throw new Error('Features must be an array or an object (bilingual)');
    }

    // Validate status code against the whitelist used by the frontend i18n dictionary
    if (data.status?.code) {
      const validStatusCodes = ['active', 'in-progress', 'in-development', 'maintenance', 'early-access', 'ending', 'just-started'];
      if (!validStatusCodes.includes(data.status.code)) {
        throw new Error(`Invalid status code: "${data.status.code}". Must be one of: ${validStatusCodes.join(', ')}`);
      }
    }

    return true;
  }
}
