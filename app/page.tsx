'use client';

import { useState } from 'react';
import RelayControlBoard from '@/components/RelayControlBoard';
import TemperatureDisplay from '@/components/temp_display';
import VoltageDisplay from '@/components/voltage_display';
import { AccelerationDisplay, SpeedDisplay } from '@/components/acceleration_display';
import LidarDisplay from '@/components/lidar_display';
import { Activity, Zap } from 'lucide-react';

export default function Home() {
  const [activeTab, setActiveTab] = useState<'control' | 'sensors'>('control');

  return (
    <main className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900">
      <div className="container mx-auto p-4">
        {/* Header with Tab Navigation */}
        <div className="text-center mb-6">
          <h1 className="text-4xl font-bold text-white mb-4">ESP32 Control & Monitoring System</h1>
          
          <div className="flex justify-center gap-4 mb-6">
            <button
              onClick={() => setActiveTab('control')}
              className={`flex items-center gap-2 px-6 py-3 rounded-lg font-semibold transition-all ${
                activeTab === 'control'
                  ? 'bg-blue-500 text-white shadow-lg'
                  : 'bg-white/10 text-white hover:bg-white/20'
              }`}
            >
              <Zap className="w-5 h-5" />
              Relay Control
            </button>
            <button
              onClick={() => setActiveTab('sensors')}
              className={`flex items-center gap-2 px-6 py-3 rounded-lg font-semibold transition-all ${
                activeTab === 'sensors'
                  ? 'bg-blue-500 text-white shadow-lg'
                  : 'bg-white/10 text-white hover:bg-white/20'
              }`}
            >
              <Activity className="w-5 h-5" />
              Sensor Monitor
            </button>
          </div>
        </div>

        {/* Content Area */}
        {activeTab === 'control' ? (
          <RelayControlBoard />
        ) : (
          <div className="space-y-6">
            {/* Temperature Display */}
            <TemperatureDisplay />

            {/* Voltage Display */}
            <VoltageDisplay />

            {/* Speed and Acceleration */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <SpeedDisplay />
              <AccelerationDisplay />
            </div>

            {/* LiDAR Display */}
            <LidarDisplay />
          </div>
        )}
      </div>
    </main>
  );
}