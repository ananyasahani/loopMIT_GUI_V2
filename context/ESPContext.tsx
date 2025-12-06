'use client';

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import type {
  ESPData,
  OrientationData,
  AccelerationData,
  CalibrationData,
  RelayState,
  RelayNumber,
  HistoryDataPoint,
} from '@/types/esp.types';

interface ESPContextType {
  // Connection state
  isConnected: boolean;
  isConnecting: boolean;
  error: string;
  
  // Sensor data
  gapHeight: number;
  objectTemp: number;
  orientation: OrientationData;
  acceleration: AccelerationData;
  calibration: CalibrationData;
  voltage: number;
  
  // Relay control
  relayStates: RelayState;
  
  // Data history
  dataHistory: ESPData[];
  temperatureHistory: HistoryDataPoint[];
  gapHeightHistory: HistoryDataPoint[];
  voltageHistory: HistoryDataPoint[];
  
  // Methods
  connectToSerial: () => Promise<void>;
  disconnectSerial: () => Promise<void>;
  toggleRelay: (relayNum: RelayNumber) => Promise<void>;
  turnAllOn: () => Promise<void>;
  turnAllOff: () => Promise<void>;
  clearHistory: () => void;
}

const ESPContext = createContext<ESPContextType | undefined>(undefined);

export const useESP = () => {
  const context = useContext(ESPContext);
  if (!context) {
    throw new Error('useESP must be used within ESPProvider');
  }
  return context;
};

const HISTORY_MAX_POINTS = 120; // 2 minutes at 1Hz
const HISTORY_TIME_WINDOW = 120000; // 2 minutes in ms

export const ESPProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Connection state
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [port, setPort] = useState<SerialPort | null>(null);
  const [reader, setReader] = useState<ReadableStreamDefaultReader | null>(null);
  const [writer, setWriter] = useState<WritableStreamDefaultWriter | null>(null);
  const [error, setError] = useState<string>('');

  // Sensor data states
  const [gapHeight, setGapHeight] = useState<number>(0);
  const [objectTemp, setObjectTemp] = useState<number>(0);
  const [orientation, setOrientation] = useState<OrientationData>({
    x: 0,
    y: 0,
    z: 0,
  });
  const [acceleration, setAcceleration] = useState<AccelerationData>({
    x: 0,
    y: 0,
    z: 0,
    magnitude: 0,
  });
  const [calibration, setCalibration] = useState<CalibrationData>({
    gyro: 0,
    sys: 0,
    magneto: 0,
  });
  const [voltage, setVoltage] = useState<number>(0);

  const [relayStates, setRelayStates] = useState<RelayState>({
    relay1: false,
    relay2: false,
    relay3: false,
    relay4: false,
  });

  const [dataHistory, setDataHistory] = useState<ESPData[]>([]);
  
  // Time-series history for charts
  const [temperatureHistory, setTemperatureHistory] = useState<HistoryDataPoint[]>([]);
  const [gapHeightHistory, setGapHeightHistory] = useState<HistoryDataPoint[]>([]);
  const [voltageHistory, setVoltageHistory] = useState<HistoryDataPoint[]>([]);

  // Helper to clean old history data
  const cleanHistoryData = useCallback((history: HistoryDataPoint[]) => {
    const now = Date.now();
    return history
      .filter(point => now - point.timestamp < HISTORY_TIME_WINDOW)
      .slice(-HISTORY_MAX_POINTS);
  }, []);

  // Process incoming sensor data
  const processData = useCallback((data: ESPData) => {
    const timestamp = Date.now();

    // Add to history
    setDataHistory((prev) => {
      const newHistory = [...prev, { ...data, timestamp: new Date().toISOString() }];
      return newHistory.slice(-100);
    });

    // Update gap height (LiDAR)
    if (data.gap_height !== undefined) {
      setGapHeight(data.gap_height);
      setGapHeightHistory((prev) => {
        const newHistory = [...prev, { timestamp, value: data.gap_height! }];
        return cleanHistoryData(newHistory);
      });
    }

    // Update object temperature
    if (data.object_temp !== undefined) {
      setObjectTemp(data.object_temp);
      setTemperatureHistory((prev) => {
        const newHistory = [...prev, { timestamp, value: data.object_temp! }];
        return cleanHistoryData(newHistory);
      });
    }

    // Update orientation from BNO055
    if (data.orientation && Array.isArray(data.orientation) && data.orientation.length >= 3) {
      setOrientation({
        x: data.orientation[0],
        y: data.orientation[1],
        z: data.orientation[2],
      });
    }

    // Update acceleration from DFRobot_ICG
    if (data.acceleration && Array.isArray(data.acceleration) && data.acceleration.length >= 3) {
      const [x, y, z] = data.acceleration;
      const magnitude = Math.sqrt(x * x + y * y + z * z);
      setAcceleration({ x, y, z, magnitude });
    }

    // Update calibration data from BNO055
    if (data.calibration && Array.isArray(data.calibration) && data.calibration.length >= 3) {
      setCalibration({
        gyro: data.calibration[0],
        sys: data.calibration[1],
        magneto: data.calibration[2],
      });
    }

    // Update voltage
    if (data.voltage !== undefined) {
      setVoltage(data.voltage);
      setVoltageHistory((prev) => {
        const newHistory = [...prev, { timestamp, value: data.voltage! }];
        return cleanHistoryData(newHistory);
      });
    }

    // Update relay states
    if (data.relayStates) {
      setRelayStates(data.relayStates);
    }
  }, [cleanHistoryData]);

  const connectToSerial = async () => {
    try {
      if (!('serial' in navigator)) {
        setError('Web Serial API not supported');
        return;
      }

      setIsConnecting(true);
      const selectedPort = await (navigator as any).serial.requestPort();
      await selectedPort.open({ baudRate: 115200 });

      const textDecoder = new TextDecoderStream();
      selectedPort.readable.pipeTo(textDecoder.writable);
      const newReader = textDecoder.readable.getReader();

      const textEncoder = new TextEncoderStream();
      textEncoder.readable.pipeTo(selectedPort.writable);
      const newWriter = textEncoder.writable.getWriter();

      setPort(selectedPort);
      setReader(newReader);
      setWriter(newWriter);
      setIsConnected(true);
      setIsConnecting(false);
      setError('');

      await sendCommand('STATUS');
    } catch (err) {
      setError(`Connection failed: ${err}`);
      setIsConnecting(false);
      console.error('Serial connection error:', err);
    }
  };

  const disconnectSerial = async () => {
    try {
      if (reader) {
        await reader.cancel();
        setReader(null);
      }
      if (writer) {
        await writer.close();
        setWriter(null);
      }
      if (port) {
        await port.close();
        setPort(null);
      }
      setIsConnected(false);
    } catch (err) {
      console.error('Disconnect error:', err);
    }
  };

  const sendCommand = async (command: string) => {
    if (!writer) {
      setError('Not connected');
      return;
    }

    try {
      await writer.write(command + '\n');
      console.log('Sent command:', command);
    } catch (err) {
      setError(`Failed to send: ${err}`);
      console.error('Send error:', err);
    }
  };

  const toggleRelay = async (relayNum: RelayNumber) => {
    const relayKey = `relay${relayNum}` as keyof RelayState;
    const newState = !relayStates[relayKey];
    const command = `RELAY${relayNum}_${newState ? 'ON' : 'OFF'}`;

    await sendCommand(command);

    setRelayStates((prev) => ({
      ...prev,
      [relayKey]: newState,
    }));
  };

  const turnAllOn = async () => {
    await sendCommand('ALL_ON');
    setRelayStates({
      relay1: true,
      relay2: true,
      relay3: true,
      relay4: true,
    });
  };

  const turnAllOff = async () => {
    await sendCommand('ALL_OFF');
    setRelayStates({
      relay1: false,
      relay2: false,
      relay3: false,
      relay4: false,
    });
  };

  const clearHistory = useCallback(() => {
    setDataHistory([]);
    setTemperatureHistory([]);
    setGapHeightHistory([]);
    setVoltageHistory([]);
  }, []);

  // Listen for incoming data
  useEffect(() => {
    if (!reader) return;

    let buffer = '';

    const readLoop = async () => {
      try {
        while (true) {
          const { value, done } = await reader.read();
          if (done) break;

          buffer += value;

          // Process complete JSON objects
          let newlineIndex;
          while ((newlineIndex = buffer.indexOf('\n')) !== -1) {
            const line = buffer.substring(0, newlineIndex).trim();
            buffer = buffer.substring(newlineIndex + 1);

            if (line.startsWith('{')) {
              try {
                const data: ESPData = JSON.parse(line);
                processData(data);
              } catch (err) {
                console.error('JSON parse error:', err);
              }
            } else if (line.includes('STATE:')) {
              const stateStr = line.split('STATE:')[1].trim();
              const states = stateStr.split(',');
              if (states.length === 4) {
                setRelayStates({
                  relay1: states[0] === '1',
                  relay2: states[1] === '1',
                  relay3: states[2] === '1',
                  relay4: states[3] === '1',
                });
              }
            }
          }
        }
      } catch (err) {
        console.error('Read error:', err);
      }
    };

    readLoop();
  }, [reader, processData]);

  const value: ESPContextType = {
    isConnected,
    isConnecting,
    error,
    gapHeight,
    objectTemp,
    orientation,
    acceleration,
    calibration,
    voltage,
    relayStates,
    dataHistory,
    temperatureHistory,
    gapHeightHistory,
    voltageHistory,
    connectToSerial,
    disconnectSerial,
    toggleRelay,
    turnAllOn,
    turnAllOff,
    clearHistory,
  };

  return <ESPContext.Provider value={value}>{children}</ESPContext.Provider>;
};