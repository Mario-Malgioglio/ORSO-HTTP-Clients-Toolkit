'use client';

import React from 'react';
import { Terminal, Shield, BookOpen, ExternalLink, Cpu } from 'lucide-react';

interface HeaderProps {
  onOpenDocs: () => void;
  activeTab: string;
}

export function Header({ onOpenDocs, activeTab }: HeaderProps) {
  return (
    <header className="bg-[#161b22] border-b border-[#30363d] px-4 sm:px-8 py-3.5 sticky top-0 z-30 shadow-md">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-sm">
            <Terminal className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base sm:text-lg font-bold text-[#58a6ff] tracking-tight">
                ORSO · HTTP Clients Toolkit
              </h1>
              <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-[#21262d] text-[#8b949e] border border-[#30363d]">
                Go & Next.js Edition
              </span>
            </div>
            <p className="text-xs text-[#8b949e] hidden sm:block">
              Shodan API · Metasploit RPC · Extractor de Metadatos (OpenXML/PDF/TXT) · Cliente HTTP
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#0d1117] border border-[#30363d] text-xs text-[#8b949e]">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span className="font-mono text-[11px] text-zinc-300">Proxy HTTP Online</span>
          </div>

          <button
            id="open-docs-btn"
            onClick={onOpenDocs}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-[#21262d] hover:bg-[#30363d] text-[#c9d1d9] text-xs font-medium border border-[#30363d] transition-colors"
            title="Ver documentación técnica de Black Hat Go Cap. 3"
          >
            <BookOpen className="w-3.5 h-3.5 text-[#58a6ff]" />
            <span>Guía Técnica Ch-3</span>
          </button>
        </div>
      </div>
    </header>
  );
}
