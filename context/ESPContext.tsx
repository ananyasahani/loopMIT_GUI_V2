'use client';

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import {
  ESPData,
  VoltageData,
  TemperatureData,
  AccelerationData,
  SpeedData,
  RelayState,
  RelayNumber,
  LidarData,
} from '@/types/esp.types';

interface ESPContextType {
  // Connection state
  isConnected: boolean;
  isConnecting: boolean;
  error: string;
  
  // Sensor data
  voltageData: VoltageData;
  temperatureData: TemperatureData;
  accelerationData: AccelerationData;
  speedData: SpeedData;
  lidarData: LidarData;
  
  // Relay control
  relayStates: RelayState;
  
  // Data history
  dataHistory: ESPData[];
  isCriticalTemperature: boolean;
  
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

const CRITICAL_TEMP = 120;

export const ESPProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Connection state
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [port, setPort] = useState< SerialPort | null>(null);
  const [reader, setReader] = useState<ReadableStreamDefaultReader | null>(null);
  const [writer, setWriter] = useState<WritableStreamDefaultWriter | null>(null);
  const [error, setError] = useState<string>('');

  // Sensor data states
  const [voltageData, setVoltageData] = useState<VoltageData>({
    inverter: 0,
    lvs: 0,
    contacter: 0,
  });

  const [temperatureData, setTemperatureData] = useState<TemperatureData>({
    motor: 0,
    object: 0,
    ambient: 0,
    battery: 0,
  });

  const [accelerationData, setAccelerationData] = useState<AccelerationData>({
    x: 0,
    y: 0,
    z: 0,
    magnitude: 0,
  });

  const [speedData, setSpeedData] = useState<SpeedData>({
    value: 0,
    unit: 'm/s',
  });

  const [lidarData, setLidarData] = useState<LidarData>({
    distance: 0,
    quality: 0,
  });

  const [relayStates, setRelayStates] = useState<RelayState>({
    relay1: false,
    relay2: false,
    relay3: false,
    relay4: false,
  });

  const [dataHistory, setDataHistory] = useState<ESPData[]>([]);
  const [isCriticalTemperature, setIsCriticalTemperature] = useState(false);

  // Process incoming sensor data
  const processData = useCallback((data: ESPData) => {
    // Add to history
    setDataHistory((prev) => {
      const newHistory = [...prev, { ...data, timestamp: new Date().toISOString() }];
      return newHistory.slice(-100);
    });

    // Update voltage data
    if (data.VB1 !== undefined || data.VB2 !== undefined || data.VB3 !== undefined) {
      setVoltageData({
        inverter: data.VB2 ?? 0,
        lvs: data.VB1 ?? 0,
        contacter: data.VB3 ?? 0,
      });
    }

    // Update temperature data
    if (
      data.dsTemperature !== undefined ||
      data.objectTemp !== undefined ||
      data.ambientTemp !== undefined ||
      data.mlxTemperature !== undefined
    ) {
      const newTempData = {
        motor: data.dsTemperature ?? 0,
        object: data.objectTemp ?? 0,
        ambient: data.ambientTemp ?? 0,
        battery: data.mlxTemperature ?? 0,
      };

      setTemperatureData(newTempData);

      const maxTemp = Math.max(newTempData.motor, newTempData.object, newTempData.battery);
      setIsCriticalTemperature(maxTemp > CRITICAL_TEMP);
    }

    // Update acceleration data
    if (data.accel && Array.isArray(data.accel) && data.accel.length >= 3) {
      const [x, y, z] = data.accel;
      const magnitude = Math.sqrt(x * x + y * y + z * z);

      setAccelerationData({ x, y, z, magnitude });

      const speed = Math.max(0, Math.abs(magnitude - 9.8));
      setSpeedData({ value: speed, unit: 'm/s' });
    }

    // Update lidar data
    if (data.lidarDistance !== undefined || data.lidarQuality !== undefined) {
      setLidarData({
        distance: data.lidarDistance ?? 0,
        quality: data.lidarQuality ?? 0,
      });
    }

    // Update relay states
    if (data.relayStates) {
      setRelayStates(data.relayStates);
    }
  }, []);

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
    voltageData,
    temperatureData,
    accelerationData,
    speedData,
    lidarData,
    relayStates,
    dataHistory,
    isCriticalTemperature,
    connectToSerial,
    disconnectSerial,
    toggleRelay,
    turnAllOn,
    turnAllOff,
    clearHistory,
  };

  return <ESPContext.Provider value={value}>{children}</ESPContext.Provider>;
};