// Placeholder file for `TemperatureDisplay` component.
// Intentionally left without implementation per user request.
'use client';

import React from 'react';
import { useESP } from '@/context/ESPContext';
import { Thermometer } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { SAFETY_THRESHOLDS } from '@/types/esp.types';

export default function TemperatureDisplay() {
  const { objectTemp, temperatureHistory } = useESP();

  const getTempStatus = (temp: number) => {
    if (temp >= SAFETY_THRESHOLDS.temperature.critical) {
      return { status: 'CRITICAL', color: 'text-red-600', bgColor: 'bg-red-500' };
    }
    if (temp >= SAFETY_THRESHOLDS.temperature.warning) {
      return { status: 'WARNING', color: 'text-orange-600', bgColor: 'bg-orange-500' };
    }
    return { status: 'NORMAL', color: 'text-green-600', bgColor: 'bg-green-500' };
  };

  const status = getTempStatus(objectTemp);

  // Format chart data
  const chartData = temperatureHistory.map((point) => ({
    time: new Date(point.timestamp).toLocaleTimeString(),
    temp: point.value,
  }));

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Thermometer className="w-6 h-6 text-red-600" />
          <h3 className="text-xl font-bold text-gray-800">Temperature (MLX Sensor)</h3>
        </div>
        <span className={`px-3 py-1 rounded-full text-sm font-bold ${status.color} bg-opacity-10`}>
          {status.status}
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Current Reading */}
        <div className="space-y-4">
          <div className="text-center">
            <p className="text-sm text-gray-600 mb-2">Current Temperature</p>
            <div className="flex items-end justify-center gap-2">
              <span className={`text-6xl font-bold ${status.color}`}>
                {objectTemp.toFixed(1)}
              </span>
              <span className="text-2xl font-semibold text-gray-600 mb-2">°C</span>
            </div>
          </div>

          {/* Temperature Bar */}
          <div className="space-y-2">
            <div className="w-full bg-gray-200 rounded-full h-4 relative overflow-hidden">
              {/* Warning zone */}
              <div
                className="absolute h-4 bg-yellow-200"
                style={{
                  left: `${(SAFETY_THRESHOLDS.temperature.warning / 100) * 100}%`,
                  width: `${((SAFETY_THRESHOLDS.temperature.critical - SAFETY_THRESHOLDS.temperature.warning) / 100) * 100}%`,
                }}
              />
              {/* Critical zone */}
              <div
                className="absolute h-4 bg-red-200"
                style={{
                  left: `${(SAFETY_THRESHOLDS.temperature.critical / 100) * 100}%`,
                  right: 0,
                }}
              />
              {/* Current value */}
              <div
                className={`h-4 rounded-full transition-all ${status.bgColor}`}
                style={{ width: `${Math.min((objectTemp / 100) * 100, 100)}%` }}
              />
            </div>
            <div className="flex justify-between text-xs text-gray-500">
              <span>0°C</span>
              <span className="text-yellow-600">{SAFETY_THRESHOLDS.temperature.warning}°C</span>
              <span className="text-red-600">{SAFETY_THRESHOLDS.temperature.critical}°C</span>
              <span>100°C</span>
            </div>
          </div>

          {/* Alerts */}
          {objectTemp >= SAFETY_THRESHOLDS.temperature.critical && (
            <div className="bg-red-100 border border-red-400 rounded-lg p-3">
              <p className="text-red-700 text-sm font-semibold">
                🚨 CRITICAL: Temperature exceeds safe limit!
              </p>
            </div>
          )}

          {objectTemp >= SAFETY_THRESHOLDS.temperature.warning &&
            objectTemp < SAFETY_THRESHOLDS.temperature.critical && (
            <div className="bg-orange-100 border border-orange-400 rounded-lg p-3">
              <p className="text-orange-700 text-sm font-semibold">
                ⚠️ WARNING: High temperature detected
              </p>
            </div>
          )}
        </div>

        {/* Chart */}
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <p className="text-sm font-medium text-gray-600">2-Minute History</p>
            <p className="text-xs text-gray-500">{chartData.length} data points</p>
          </div>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis
                  dataKey="time"
                  tick={{ fontSize: 10 }}
                  interval="preserveStartEnd"
                />
                <YAxis
                  domain={[0, 100]}
                  tick={{ fontSize: 10 }}
                  label={{ value: '°C', angle: -90, position: 'insideLeft', fontSize: 12 }}
                />
                <Tooltip
                  contentStyle={{ fontSize: 12 }}
                  labelStyle={{ fontWeight: 'bold' }}
                />
                <ReferenceLine
                  y={SAFETY_THRESHOLDS.temperature.warning}
                  stroke="#f59e0b"
                  strokeDasharray="3 3"
                  label={{ value: 'Warning', fontSize: 10, fill: '#f59e0b' }}
                />
                <ReferenceLine
                  y={SAFETY_THRESHOLDS.temperature.critical}
                  stroke="#ef4444"
                  strokeDasharray="3 3"
                  label={{ value: 'Critical', fontSize: 10, fill: '#ef4444' }}
                />
                <Line
                  type="monotone"
                  dataKey="temp"
                  stroke="#dc2626"
                  strokeWidth={2}
                  dot={false}
                  name="Temperature"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}