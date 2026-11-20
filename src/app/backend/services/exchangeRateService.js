'use strict';

const { ExchangeRate } = require('../models');
const { Op } = require('sequelize');

const BASELINE_USD_INR_RATE = 86.85;

/**
 * Exchange Rate Management Service
 * Provides automated reference exchange rate tracking and administrative manual overrides.
 */
class ExchangeRateService {
  /**
   * Retrieves the current effective USD to INR exchange rate.
   * Prioritizes active administrator manual overrides, then latest cached reference,
   * then automatic daily fetch, falling back safely to the baseline rate.
   */
  async getEffectiveRate() {
    try {
      // 1. Check for active manual administrator override
      const manualOverride = await ExchangeRate.findOne({
        where: {
          baseCurrency: 'USD',
          targetCurrency: 'INR',
          isManualOverride: true
        },
        order: [['createdAt', 'DESC']]
      });

      if (manualOverride) {
        return this._formatRateResponse(manualOverride);
      }

      // 2. Check for latest reference rate
      const latestRef = await ExchangeRate.findOne({
        where: {
          baseCurrency: 'USD',
          targetCurrency: 'INR',
          isManualOverride: false
        },
        order: [['createdAt', 'DESC']]
      });

      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

      // If reference exists and is fresh (within 24 hours), return it
      if (latestRef && new Date(latestRef.createdAt) > oneDayAgo) {
        return this._formatRateResponse(latestRef);
      }

      // 3. Attempt automated background refresh
      const fetchedRate = await this._fetchPublicRate();
      if (fetchedRate && fetchedRate > 0) {
        const newRecord = await ExchangeRate.create({
          baseCurrency: 'USD',
          targetCurrency: 'INR',
          rate: fetchedRate,
          effectiveDate: new Date().toISOString().split('T')[0],
          source: 'open.er-api.com',
          isManualOverride: false,
          updatedBy: 'system_auto_sync',
          notes: 'Automated daily exchange rate sync'
        });
        return this._formatRateResponse(newRecord);
      }

      // 4. Return existing record or fallback baseline
      if (latestRef) {
        return this._formatRateResponse(latestRef);
      }

      // Fallback baseline creation
      const fallbackRecord = await ExchangeRate.create({
        baseCurrency: 'USD',
        targetCurrency: 'INR',
        rate: BASELINE_USD_INR_RATE,
        effectiveDate: new Date().toISOString().split('T')[0],
        source: 'system_baseline',
        isManualOverride: false,
        updatedBy: 'system',
        notes: 'Fallback baseline exchange rate'
      });
      return this._formatRateResponse(fallbackRecord);
    } catch (err) {
      console.error('getEffectiveRate error:', err);
      return {
        baseCurrency: 'USD',
        targetCurrency: 'INR',
        rate: BASELINE_USD_INR_RATE,
        effectiveDate: new Date().toISOString().split('T')[0],
        isManualOverride: false,
        source: 'static_fallback',
        updatedBy: 'system',
        notes: 'Emergency static fallback rate'
      };
    }
  }

  /**
   * Sets an administrative manual override for the USD/INR rate.
   */
  async setManualOverride(rate, notes, user) {
    const numRate = parseFloat(rate);
    if (isNaN(numRate) || numRate <= 0) {
      throw new Error('Exchange rate must be a positive number.');
    }

    // Deactivate previous overrides
    await ExchangeRate.update(
      { isManualOverride: false },
      { where: { isManualOverride: true } }
    );

    // Create new active override
    const overrideRecord = await ExchangeRate.create({
      baseCurrency: 'USD',
      targetCurrency: 'INR',
      rate: numRate,
      effectiveDate: new Date().toISOString().split('T')[0],
      source: 'manual_admin_override',
      isManualOverride: true,
      updatedBy: user?.name || user?.email || 'Administrator',
      notes: notes || 'Administrator manual override'
    });

    return this._formatRateResponse(overrideRecord);
  }

  /**
   * Resets administrative manual override to revert to automated reference rates.
   */
  async resetManualOverride(user) {
    await ExchangeRate.update(
      { isManualOverride: false },
      { where: { isManualOverride: true } }
    );

    return this.getEffectiveRate();
  }

  /**
   * Attempts to fetch current exchange rate from free public API.
   */
  async _fetchPublicRate() {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3500);

      const res = await fetch('https://open.er-api.com/v6/latest/USD', {
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (!res.ok) return null;
      const json = await res.json();
      if (json && json.result === 'success' && json.rates && typeof json.rates.INR === 'number') {
        return parseFloat(json.rates.INR.toFixed(4));
      }
      return null;
    } catch (e) {
      // Silent network failure fallback
      return null;
    }
  }

  _formatRateResponse(record) {
    return {
      id: record.id,
      baseCurrency: record.baseCurrency || 'USD',
      targetCurrency: record.targetCurrency || 'INR',
      rate: parseFloat(record.rate),
      effectiveDate: record.effectiveDate,
      isManualOverride: Boolean(record.isManualOverride),
      source: record.source,
      updatedBy: record.updatedBy,
      notes: record.notes,
      updatedAt: record.updatedAt
    };
  }
}

module.exports = new ExchangeRateService();
