'use client';

import React from 'react';
import { Globe, Radar, Terminal, FileSearch } from 'lucide-react';

export type TabKey = 'http' | 'shodan' | 'msf' | 'bing';

interface TabNavigationProps {
  activeTab: TabKey;
  onTabChange: (tab: TabKey) => void;
}

export function TabNavigation({ activeTab, onTabChange }: TabNavigationProps) {
  const tabs = [
    {
      id: 'http' as TabKey,
      label: 'HTTP Genérico',
      icon: Globe,
      badge: 'Request Tester',
    },
    {
      id: 'shodan' as TabKey,
      label: 'Shodan API',
      icon: Radar,
      badge: 'OSINT Recon',
    },
    {
      id: 'msf' as TabKey,
      label: 'Metasploit RPC',
      icon: Terminal,
      badge: 'session.list',
    },
    {
      id: 'bing' as TabKey,
      label: 'Bing Metadata',
      icon: FileSearch,
      badge: 'OpenXML/PDF/TXT',
    },
  ];

  return (
    <div className="flex border-b border-[#30363d] mb-6 overflow-x-auto scrollbar-thin">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            id={`tab-button-${tab.id}`}
            onClick={() => onTabChange(tab.id)}
            className={`flex items-center gap-2.5 px-4 sm:px-6 py-3 border-b-2 text-xs sm:text-sm font-medium transition-all whitespace-nowrap outline-none ${
              isActive
                ? 'border-[#58a6ff] text-[#58a6ff] bg-[#161b22]/70'
                : 'border-transparent text-[#8b949e] hover:text-[#c9d1d9] hover:bg-[#161b22]/40'
            }`}
          >
            <Icon className={`w-4 h-4 ${isActive ? 'text-[#58a6ff]' : 'text-[#8b949e]'}`} />
            <span>{tab.label}</span>
            <span
              className={`hidden md:inline-block text-[10px] px-1.5 py-0.5 rounded font-mono ${
                isActive
                  ? 'bg-[#1f6feb]/20 text-[#58a6ff] border border-[#1f6feb]/40'
                  : 'bg-[#21262d] text-[#8b949e]'
              }`}
            >
              {tab.badge}
            </span>
          </button>
        );
      })}
    </div>
  );
}
