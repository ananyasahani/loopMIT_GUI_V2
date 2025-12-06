'use client';

import React from 'react';
import { useESP } from '@/context/ESPContext';
import { Zap, AlertTriangle } from 'lucide-react';

export default function VoltageDisplay() {
  const { voltage } = useESP();

  const getVoltageStatus = (v: number) => {
    if (v < 10) return { status: 'CRITICAL LOW', color: 'bg-red-500', textColor: 'text-red-700' };
    if (v < 15) return { status: 'LOW', color: 'bg-yellow-500', textColor: 'text-yellow-700' };
    if (v > 24) return { status: 'HIGH', color: 'bg-orange-500', textColor: 'text-orange-700' };
    return { status: 'NORMAL', color: 'bg-green-500', textColor: 'text-green-700' };
  };

  const status = getVoltageStatus(voltage);
  const isCritical = voltage < 10 || voltage > 24;

  return (
    <div className={`rounded-lg shadow-md p-6 transition-colors ${
      isCritical ? 'bg-red-50 border-2 border-red-500' : 'bg-white border-2 border-gray-200'
    }`}>
      <div className="flex items-center gap-2 mb-4">
        <Zap className="w-6 h-6 text-yellow-600" />
        <h3 className="text-xl font-bold text-gray-800">System Voltage (25V Sensor)</h3>
        {isCritical && <AlertTriangle className="w-5 h-5 text-red-600 animate-pulse" />}
      </div>

      <div className="space-y-4">
        {/* Voltage Display */}
        <div className="text-center">
          <p className="text-sm text-gray-600 mb-2">Current Voltage</p>
          <div className="flex items-end justify-center gap-2">
            <span className={`text-6xl font-bold ${status.textColor}`}>
              {voltage.toFixed(2)}
            </span>
            <span className="text-2xl font-semibold text-gray-600 mb-2">V</span>
          </div>
        </div>

        {/* Voltage Bar */}
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium text-gray-600">Status:</span>
            <span className={`text-lg font-bold ${status.textColor}`}>{status.status}</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-4">
            <div
              className={`h-4 rounded-full transition-all ${status.color}`}
              style={{ width: `${Math.min((voltage / 25) * 100, 100)}%` }}
            />
          </div>
          <div className="flex justify-between text-xs text-gray-500">
            <span>0V</span>
            <span>12.5V</span>
            <span>25V</span>
          </div>
        </div>

        {/* Alerts */}
        {voltage < 10 && (
          <div className="bg-red-100 border border-red-400 rounded-lg p-3">
            <p className="text-red-700 text-sm font-semibold">
              🚨 CRITICAL: Voltage too low! System may shut down.
            </p>
          </div>
        )}

        {voltage >= 10 && voltage < 15 && (
          <div className="bg-yellow-100 border border-yellow-400 rounded-lg p-3">
            <p className="text-yellow-700 text-sm font-semibold">
              ⚠️ WARNING: Low voltage detected. Check power supply.
            </p>
          </div>
        )}

        {voltage > 24 && (
          <div className="bg-orange-100 border border-orange-400 rounded-lg p-3">
            <p className="text-orange-700 text-sm font-semibold">
              ⚠️ WARNING: Voltage exceeds safe limit!
            </p>
          </div>
        )}

        {/* Voltage Range Info */}
        <div className="mt-4 bg-gray-50 rounded-lg p-3">
          <p className="text-xs text-gray-600">
            <strong>Operating Range:</strong> 15V - 24V<br />
            <strong>Minimum:</strong> 10V (Critical)<br />
            <strong>Maximum:</strong> 25V (Sensor Limit)
          </p>
        </div>
      </div>
    </div>
  );
}