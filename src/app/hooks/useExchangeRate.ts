import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';

export interface ExchangeRateInfo {
  baseCurrency: string;
  targetCurrency: string;
  rate: number;
  effectiveDate: string;
  isManualOverride: boolean;
  source: string;
  updatedBy?: string;
  notes?: string;
  updatedAt?: string;
}

const DEFAULT_RATE = 86.85;

export function formatUsdEquivalent(amountInInrRupees: number, rate: number = DEFAULT_RATE): string {
  if (!amountInInrRupees || isNaN(amountInInrRupees) || amountInInrRupees <= 0) {
    return '≈ $0 USD';
  }
  const safeRate = rate > 0 ? rate : DEFAULT_RATE;
  const usd = amountInInrRupees / safeRate;

  if (usd >= 1_000_000) {
    return `≈ $${(usd / 1_000_000).toFixed(2)}M USD`;
  }
  if (usd >= 10_000) {
    return `≈ $${(usd / 1_000).toFixed(1)}K USD`;
  }
  if (usd >= 1_000) {
    return `≈ $${(usd / 1_000).toFixed(2)}K USD`;
  }
  return `≈ $${Math.round(usd).toLocaleString()} USD`;
}

export function formatInrLakhsWithUsd(amountInLakhs: number, rate: number = DEFAULT_RATE): { inr: string; usd: string } {
  const inrVal = Number(amountInLakhs || 0);
  const inr = `₹${inrVal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}L`;
  const usd = formatUsdEquivalent(inrVal * 100_000, rate);
  return { inr, usd };
}

export function formatRawInrWithUsd(amountInRupees: number, rate: number = DEFAULT_RATE): { inr: string; usd: string } {
  const num = Number(amountInRupees || 0);
  let inr = '₹0.00';
  if (num >= 10_000_000) {
    inr = `₹${(num / 10_000_000).toFixed(2)} Cr`;
  } else if (num >= 100_000) {
    inr = `₹${(num / 100_000).toFixed(2)} L`;
  } else if (num > 0) {
    inr = `₹${num.toLocaleString('en-IN')}`;
  }

  const usd = formatUsdEquivalent(num, rate);
  return { inr, usd };
}

export function useExchangeRate() {
  const { user } = useAuth();
  const [rateInfo, setRateInfo] = useState<ExchangeRateInfo>({
    baseCurrency: 'USD',
    targetCurrency: 'INR',
    rate: DEFAULT_RATE,
    effectiveDate: new Date().toISOString().split('T')[0],
    isManualOverride: false,
    source: 'default_baseline'
  });
  const [loading, setLoading] = useState(false);

  const token = user?.token || (() => {
    try {
      const u = localStorage.getItem('iqac_user');
      return u ? JSON.parse(u)?.token : null;
    } catch {
      return null;
    }
  })() || localStorage.getItem('token');

  const fetchRate = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
      const res = await fetch(`${baseUrl}/api/system/exchange-rate`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const json = await res.json();
      if (json.success && json.data) {
        setRateInfo(json.data);
      }
    } catch (e) {
      console.warn('Could not fetch exchange rate:', e);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchRate();
  }, [fetchRate]);

  const setOverride = async (rate: number, notes?: string) => {
    if (!token) throw new Error('Unauthenticated');
    const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
    const res = await fetch(`${baseUrl}/api/system/exchange-rate/override`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ rate, notes })
    });
    const json = await res.json();
    if (!res.ok || !json.success) {
      throw new Error(json.message || 'Failed to set exchange rate override');
    }
    setRateInfo(json.data);
    return json.data;
  };

  const resetOverride = async () => {
    if (!token) throw new Error('Unauthenticated');
    const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
    const res = await fetch(`${baseUrl}/api/system/exchange-rate/reset`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      }
    });
    const json = await res.json();
    if (!res.ok || !json.success) {
      throw new Error(json.message || 'Failed to reset exchange rate override');
    }
    setRateInfo(json.data);
    return json.data;
  };

  return {
    rate: rateInfo.rate || DEFAULT_RATE,
    rateInfo,
    loading,
    refetch: fetchRate,
    setOverride,
    resetOverride
  };
}
