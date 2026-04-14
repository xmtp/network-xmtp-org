import React from 'react';
import { Outlet } from 'react-router-dom';
import { networkLabel, isMainnet } from '@/config/network';

const MAINNET_URL = 'https://network.xmtp.org';
const TESTNET_URL = 'https://testnet.network.xmtp.org';

export const Layout: React.FC = () => {
  return (
    <div className="min-h-screen bg-black flex flex-col">
      {/* Header */}
      <header className="border-b border-zinc-800/50 bg-zinc-950">
        <div className="container mx-auto px-4 py-4 flex items-center justify-center">
          <div className="flex flex-col items-center gap-1.5">
            <img src="/xmtp-logo-white.svg" alt="XMTP" className="h-6" />
            <span className="text-sm font-mono font-medium uppercase tracking-[0.2em] text-zinc-400">
              {networkLabel}
            </span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 container mx-auto px-4 pt-4 pb-6">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="border-t border-zinc-800/50 bg-zinc-950 mt-auto">
        <div className="container mx-auto px-4 py-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-zinc-500">
            <div className="flex items-center gap-4">
              <a href="https://xmtp.org" target="_blank" rel="noopener noreferrer" className="hover:text-zinc-300 transition-colors">
                About XMTP
              </a>
              <a href="https://docs.xmtp.org" target="_blank" rel="noopener noreferrer" className="hover:text-zinc-300 transition-colors">
                Documentation
              </a>
              <a
                href={isMainnet ? TESTNET_URL : MAINNET_URL}
                className="hover:text-zinc-300 transition-colors"
              >
                Switch to {isMainnet ? 'Testnet' : 'Mainnet'}
              </a>
            </div>
            <div className="text-zinc-600">
              © 2026 XMTP
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};
