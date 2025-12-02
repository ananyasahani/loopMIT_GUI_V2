
import { useState, useEffect, useCallback } from 'react';
import { RelayState, RelayNumber } from '@/types/esp.types';

// Web Serial API types
type SerialPort = any;
type ReadableStreamDefaultReader = any;
type WritableStreamDefaultWriter = any;

export const useRelayControls = () => {
  const [relayStates, setRelayStates] = useState<RelayState>({
    relay1: false,
    relay2: false,
    relay3: false,
    relay4: false,
  });
  const [isConnected, setIsConnected] = useState(false);
  const [port, setPort] = useState<SerialPort | null>(null);
  const [reader, setReader] = useState<ReadableStreamDefaultReader | null>(null);
  const [writer, setWriter] = useState<WritableStreamDefaultWriter | null>(null);
  const [error, setError] = useState<string>('');

  const connectToSerial = async () => {
    try {
      if (!('serial' in navigator)) {
        setError('Web Serial API not supported in this browser');
        return;
      }

      const selectedPort = await (navigator as any).serial.requestPort();
      await selectedPort.open({ baudRate: 115200 });

      const textDecoder = new TextDecoderStream();
      const readableStreamClosed = selectedPort.readable.pipeTo(textDecoder.writable);
      const newReader = textDecoder.readable.getReader();

      const textEncoder = new TextEncoderStream();
      const writableStreamClosed = textEncoder.readable.pipeTo(selectedPort.writable);
      const newWriter = textEncoder.writable.getWriter();

      setPort(selectedPort);
      setReader(newReader);
      setWriter(newWriter);
      setIsConnected(true);
      setError('');

      // Request current relay states
      await sendCommand('STATUS');
    } catch (err) {
      setError(`Connection failed: ${err}`);
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
      setError('Not connected to serial port');
      return;
    }

    try {
      await writer.write(command + '\n');
      console.log('Sent command:', command);
    } catch (err) {
      setError(`Failed to send command: ${err}`);
      console.error('Send error:', err);
    }
  };

  const toggleRelay = async (relayNum: RelayNumber) => {
    const relayKey = `relay${relayNum}` as keyof RelayState;
    const newState = !relayStates[relayKey];
    const command = `RELAY${relayNum}_${newState ? 'ON' : 'OFF'}`;
    
    await sendCommand(command);
    
    // Optimistically update UI
    setRelayStates(prev => ({
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

  // Listen for responses from ESP32
  useEffect(() => {
    if (!reader) return;

    const readLoop = async () => {
      try {
        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          
          console.log('Received from ESP32:', value);
          
          // Parse status updates from ESP32
          if (value.includes('STATE:')) {
            const stateStr = value.split('STATE:')[1].trim();
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
      } catch (err) {
        console.error('Read error:', err);
      }
    };

    readLoop();
  }, [reader]);

  return {
    relayStates,
    isConnected,
    error,
    connectToSerial,
    disconnectSerial,
    toggleRelay,
    turnAllOn,
    turnAllOff,
  };
};