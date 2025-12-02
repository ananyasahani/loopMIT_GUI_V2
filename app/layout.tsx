import type { Metadata } from 'next';
import './globals.css';
import { ESPProvider } from '@/context/ESPContext';

export const metadata: Metadata = {
  title: 'ESP32 Control & Monitor',
  description: 'Control relay module and monitor sensors via ESP32',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <ESPProvider>{children}</ESPProvider>
      </body>
    </html>
  );
}