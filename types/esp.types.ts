// Relay Control Types
export interface RelayState {
  relay1: boolean;
  relay2: boolean;
  relay3: boolean;
  relay4: boolean;
}

export type RelayNumber = 1 | 2 | 3 | 4;

// Sensor Data Types
export interface OrientationData {
  x: number;  // Pitch
  y: number;  // Roll
  z: number;  // Yaw
}

export interface AccelerationData {
  x: number;
  y: number;
  z: number;
  magnitude: number;
}

export interface CalibrationData {
  gyro: number;
  sys: number;
  magneto: number;
}

// History data point for charts
export interface HistoryDataPoint {
  timestamp: number;
  value: number;
}

// Safety thresholds for monitoring
export const SAFETY_THRESHOLDS = {
  temperature: {
    warning: 60,
    critical: 80,
  },
  voltage: {
    warning: 20,
    critical: 18,
  },
  gapHeight: {
    warning: 5,
    critical: 2,
  },
} as const;

// Complete ESP Data Structure (from Master Receiver)
export interface ESPData {
  timestamp?: string;
  
  // Gap height from VL53L0X (LiDAR)
  gap_height?: number;  // in mm or cm
  
  // Object temperature from MLX sensor
  object_temp?: number;  // in °C
  
  // Orientation from BNO055 [x, y, z]
  orientation?: number[];
  
  // Acceleration from DFRobot_ICG [x, y, z]
  acceleration?: number[];
  
  // Calibration data from BNO055 [gyro, sys, magneto]
  calibration?: number[];
  
  // Voltage from 25V voltage sensor
  voltage?: number;  // in V
  
  // Relay states (optional, sent from master receiver)
  relayStates?: RelayState;
}