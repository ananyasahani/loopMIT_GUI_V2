'use client';

import React from 'react';
import { useESP } from '@/context/ESPContext';
import { Compass } from 'lucide-react';

export default function OrientationDisplay() {
  const { orientation } = useESP();

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex items-center gap-2 mb-4">
        <Compass className="w-6 h-6 text-indigo-600" />
        <h3 className="text-xl font-bold text-gray-800">Orientation (BNO055)</h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Pitch (X-axis) */}
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium text-gray-600">Pitch (X):</span>
            <span className="text-lg font-bold text-blue-600">{orientation.x.toFixed(2)}°</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3">
            <div
              className="bg-blue-600 h-3 rounded-full transition-all"
              style={{
                width: `${Math.min(Math.abs(orientation.x / 180) * 100, 100)}%`,
                marginLeft: orientation.x < 0 ? '0' : 'auto',
              }}
            />
          </div>
        </div>

        {/* Roll (Y-axis) */}
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium text-gray-600">Roll (Y):</span>
            <span className="text-lg font-bold text-green-600">{orientation.y.toFixed(2)}°</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3">
            <div
              className="bg-green-600 h-3 rounded-full transition-all"
              style={{
                width: `${Math.min(Math.abs(orientation.y / 180) * 100, 100)}%`,
                marginLeft: orientation.y < 0 ? '0' : 'auto',
              }}
            />
          </div>
        </div>

        {/* Yaw (Z-axis) */}
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium text-gray-600">Yaw (Z):</span>
            <span className="text-lg font-bold text-purple-600">{orientation.z.toFixed(2)}°</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3">
            <div
              className="bg-purple-600 h-3 rounded-full transition-all"
              style={{ width: `${Math.min((Math.abs(orientation.z) / 360) * 100, 100)}%` }}
            />
          </div>
        </div>
      </div>

      {/* Visual Orientation Indicator */}
      <div className="mt-6 flex justify-center">
        <div className="relative w-48 h-48 bg-gradient-to-br from-indigo-100 to-purple-100 rounded-full flex items-center justify-center">
          <div
            className="absolute w-2 h-20 bg-indigo-600 rounded-full origin-bottom transition-transform"
            style={{
              transform: `rotate(${orientation.z}deg)`,
              bottom: '50%',
            }}
          />
          <div className="absolute w-4 h-4 bg-indigo-800 rounded-full"></div>
          <div className="absolute top-2 text-xs font-bold text-indigo-700">N</div>
        </div>
      </div>
    </div>
  );
}