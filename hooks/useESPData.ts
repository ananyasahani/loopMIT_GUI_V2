import { useState, useCallback, useEffect } from 'react';
import { useWebSocket } from './useWebSocket';
import type {
  ESPData,
  OrientationData,
  AccelerationData,
  CalibrationData,
  RelayState,
  RelayNumber,
  HistoryDataPoint,
} from '@/types/esp.types';

export type ConnectionType = 'websocket' | 'serial';

interface UseESPDataProps {
  connectionType?: ConnectionType;
  websocketUrl?: string;
  autoConnect?: boolean;
}

interface UseESPDataReturn {
  // Connection state
  isConnected: boolean;
  isConnecting: boolean;
  error: string;
  connectionType: ConnectionType;

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

  // Connection methods
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  switchConnectionType: (type: ConnectionType) => void;

  // Command methods
  sendCommand: (command: string) => Promise<void>;
  toggleRelay: (relayNum: RelayNumber) => Promise<void>;
  turnAllOn: () => Promise<void>;
  turnAllOff: () => Promise<void>;

  // Utility methods
  clearHistory: () => void;
}

const HISTORY_MAX_POINTS = 120; // 2 minutes at 1Hz
const HISTORY_TIME_WINDOW = 120000; // 2 minutes in ms

export const useESPData = ({
  connectionType: initialConnectionType = 'websocket',
  websocketUrl = 'ws://localhost:8080',
  autoConnect = false,
}: UseESPDataProps = {}): UseESPDataReturn => {
  // Connection type state
  const [connectionType, setConnectionType] = useState<ConnectionType>(initialConnectionType);

  // Serial port states
  const [port, setPort] = useState<any>(null);
  const [reader, setReader] = useState<any>(null);
  const [writer, setWriter] = useState<any>(null);
  const [serialConnected, setSerialConnected] = useState(false);
  const [serialConnecting, setSerialConnecting] = useState(false);
  const [serialError, setSerialError] = useState('');

  // Sensor data states
  const [gapHeight, setGapHeight] = useState(0);
  const [objectTemp, setObjectTemp] = useState(0);
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
  const [voltage, setVoltage] = useState(0);
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

    // Add to history with timestamp
    setDataHistory((prev) => {
      const newHistory = [...prev, { ...data, timestamp: new Date().toISOString() }];
      return newHistory.slice(-100); // Keep last 100 entries
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

  // Handle incoming messages (for both WebSocket and Serial)
  const handleMessage = useCallback((data: any) => {
    try {
      let parsedData: ESPData;

      // If data is string, try to parse as JSON
      if (typeof data === 'string') {
        // Handle relay state updates
        if (data.includes('STATE:')) {
          const stateStr = data.split('STATE:')[1].trim();
          const states = stateStr.split(',');
          if (states.length === 4) {
            setRelayStates({
              relay1: states[0] === '1',
              relay2: states[1] === '1',
              relay3: states[2] === '1',
              relay4: states[3] === '1',
            });
          }
          return;
        }

        // Try to parse JSON
        parsedData = JSON.parse(data);
      } else {
        parsedData = data;
      }

      // Process the data
      processData(parsedData);
    } catch (err) {
      console.error('Error processing message:', err);
    }
  }, [processData]);

  // WebSocket hook
  const {
    isConnected: wsConnected,
    isConnecting: wsConnecting,
    error: wsError,
    sendMessage: wsSendMessage,
    connect: wsConnect,
    disconnect: wsDisconnect,
  } = useWebSocket({
    url: websocketUrl,
    onMessage: handleMessage,
    onOpen: () => {
      console.log('WebSocket connected, requesting status...');
      wsSendMessage('STATUS\n');
    },
    autoConnect: autoConnect && connectionType === 'websocket',
  });

  // Serial API connection
  const connectSerial = useCallback(async () => {
    try {
      if (!('serial' in navigator)) {
        setSerialError('Web Serial API not supported in this browser');
        return;
      }

      setSerialConnecting(true);
      setSerialError('');

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
      setSerialConnected(true);
      setSerialConnecting(false);

      // Request status
      await newWriter.write('STATUS\n');
    } catch (err) {
      setSerialError(`Connection failed: ${err}`);
      setSerialConnecting(false);
      console.error('Serial connection error:', err);
    }
  }, []);

  const disconnectSerial = useCallback(async () => {
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
      setSerialConnected(false);
      setSerialError('');
    } catch (err) {
      console.error('Disconnect error:', err);
    }
  }, [reader, writer, port]);

  // Serial data reading loop
  useEffect(() => {
    if (!reader || connectionType !== 'serial') return;

    let buffer = '';
    const readLoop = async () => {
      try {
        while (true) {
          const { value, done } = await reader.read();
          if (done) break;

          buffer += value;

          // Process complete lines
          let newlineIndex;
          while ((newlineIndex = buffer.indexOf('\n')) !== -1) {
            const line = buffer.substring(0, newlineIndex).trim();
            buffer = buffer.substring(newlineIndex + 1);

            if (line) {
              handleMessage(line);
            }
          }
        }
      } catch (err) {
        console.error('Read error:', err);
        setSerialError(`Read error: ${err}`);
      }
    };

    readLoop();
  }, [reader, connectionType, handleMessage]);

  // Unified connection methods
  const connect = useCallback(async () => {
    if (connectionType === 'websocket') {
      wsConnect();
    } else {
      await connectSerial();
    }
  }, [connectionType, wsConnect, connectSerial]);

  const disconnect = useCallback(async () => {
    if (connectionType === 'websocket') {
      wsDisconnect();
    } else {
      await disconnectSerial();
    }
  }, [connectionType, wsDisconnect, disconnectSerial]);

  const switchConnectionType = useCallback((type: ConnectionType) => {
    // Disconnect current connection
    if (connectionType === 'websocket' && wsConnected) {
      wsDisconnect();
    } else if (connectionType === 'serial' && serialConnected) {
      disconnectSerial();
    }
    setConnectionType(type);
  }, [connectionType, wsConnected, serialConnected, wsDisconnect, disconnectSerial]);

  // Send command (works for both connection types)
  const sendCommand = useCallback(async (command: string) => {
    try {
      if (connectionType === 'websocket') {
        if (!wsConnected) {
          throw new Error('WebSocket not connected');
        }
        wsSendMessage(command + '\n');
      } else {
        if (!writer) {
          throw new Error('Serial port not connected');
        }
        await writer.write(command + '\n');
        console.log('Sent via Serial:', command);
      }
    } catch (err) {
      const errorMsg = `Failed to send command: ${err}`;
      console.error(errorMsg);
      if (connectionType === 'serial') {
        setSerialError(errorMsg);
      }
      throw err;
    }
  }, [connectionType, wsConnected, wsSendMessage, writer]);

  // Relay control methods
  const toggleRelay = useCallback(async (relayNum: RelayNumber) => {
    const relayKey = `relay${relayNum}` as keyof RelayState;
    const newState = !relayStates[relayKey];
    const command = `RELAY${relayNum}_${newState ? 'ON' : 'OFF'}`;

    await sendCommand(command);

    // Optimistically update UI
    setRelayStates((prev) => ({
      ...prev,
      [relayKey]: newState,
    }));
  }, [relayStates, sendCommand]);

  const turnAllOn = useCallback(async () => {
    await sendCommand('ALL_ON');
    setRelayStates({
      relay1: true,
      relay2: true,
      relay3: true,
      relay4: true,
    });
  }, [sendCommand]);

  const turnAllOff = useCallback(async () => {
    await sendCommand('ALL_OFF');
    setRelayStates({
      relay1: false,
      relay2: false,
      relay3: false,
      relay4: false,
    });
  }, [sendCommand]);

  const clearHistory = useCallback(() => {
    setDataHistory([]);
    setTemperatureHistory([]);
    setGapHeightHistory([]);
    setVoltageHistory([]);
  }, []);

  // Determine connection state based on active connection type
  const isConnected = connectionType === 'websocket' ? wsConnected : serialConnected;
  const isConnecting = connectionType === 'websocket' ? wsConnecting : serialConnecting;
  const error = connectionType === 'websocket' ? wsError : serialError;

  return {
    // Connection state
    isConnected,
    isConnecting,
    error,
    connectionType,

    // Sensor data
    gapHeight,
    objectTemp,
    orientation,
    acceleration,
    calibration,
    voltage,

    // Relay control
    relayStates,

    // Data history
    dataHistory,
    temperatureHistory,
    gapHeightHistory,
    voltageHistory,

    // Connection methods
    connect,
    disconnect,
    switchConnectionType,

    // Command methods
    sendCommand,
    toggleRelay,
    turnAllOn,
    turnAllOff,

    // Utility methods
    clearHistory,
  };
};