// Relay Control Types
export interface RelayState {
  relay1: boolean;
  relay2: boolean;
  relay3: boolean;
  relay4: boolean;
}

export interface SerialCommand {
  command: string;
  relay?: number;
  state?: 'ON' | 'OFF';
}

export interface SerialResponse {
  success: boolean;
  message: string;
  relayStates?: RelayState;
}

export type RelayNumber = 1 | 2 | 3 | 4;

// Sensor Data Types
export interface VoltageData {
  inverter: number;
  lvs: number;
  contacter: number;
}

export interface TemperatureData {
  motor: number;
  object: number;
  ambient: number;
  battery: number;
}

export interface AccelerationData {
  x: number;
  y: number;
  z: number;
  magnitude: number;
}

export interface SpeedData {
  value: number;
  unit: string;
}

export interface LidarData {
  distance: number;
  quality: number;
}

// Complete ESP Data Structure
export interface ESPData {
  timestamp?: string;
  
  // Voltage readings
  VB1?: number;  // LVS Voltage
  VB2?: number;  // Inverter Voltage
  VB3?: number;  // Contacter Voltage
  
  // Temperature readings
  dsTemperature?: number;   // Motor temperature
  objectTemp?: number;      // Object temperature
  ambientTemp?: number;     // Ambient temperature
  mlxTemperature?: number;  // Battery temperature
  
  // Acceleration data [x, y, z]
  accel?: number[];
  
  // Orientation data [roll, pitch, yaw]
  orientation?: number[];
  
  // Lidar data
  lidarDistance?: number;
  lidarQuality?: number;
  
  // Relay states
  relayStates?: RelayState;
}