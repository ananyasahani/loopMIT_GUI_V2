'use client';

import React from 'react';
import { useESP } from '@/context/ESPContext';
import { Radar } from 'lucide-react';

export default function LidarDisplay() {
  const { lidarData } = useESP();

  const getDistanceColor = (distance: number) => {
    if (distance < 50) return 'text-red-600';
    if (distance < 100) return 'text-yellow-600';
    return 'text-green-600';
  };

  const getQualityColor = (quality: number) => {
    if (quality > 200) return 'bg-green-500';
    if (quality > 100) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex items-center gap-2 mb-4">
        <Radar className="w-6 h-6 text-purple-600" />
        <h3 className="text-xl font-bold text-gray-800">LiDAR Distance</h3>
      </div>

      <div className="space-y-4">
        <div className="text-center">
          <p className="text-sm text-gray-600 mb-2">Distance</p>
          <p className={`text-5xl font-bold ${getDistanceColor(lidarData.distance)}`}>
            {lidarData.distance.toFixed(0)}
          </p>
          <p className="text-gray-500 mt-1">cm</p>
        </div>

        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium text-gray-600">Signal Quality:</span>
            <span className="text-lg font-bold text-gray-900">{lidarData.quality}</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3">
            <div
              className={`h-3 rounded-full transition-all ${getQualityColor(lidarData.quality)}`}
              style={{ width: `${Math.min((lidarData.quality / 255) * 100, 100)}%` }}
            />
          </div>
        </div>

        {lidarData.distance < 50 && (
          <div className="bg-red-100 border border-red-400 rounded-lg p-3">
            <p className="text-red-700 text-sm font-semibold">⚠️ Warning: Object too close!</p>
          </div>
        )}
      </div>
    </div>
  );
}