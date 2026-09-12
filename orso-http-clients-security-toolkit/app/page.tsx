'use client';

import React, { useState } from 'react';
import { Header } from '@/components/Header';
import { TabNavigation, TabKey } from '@/components/TabNavigation';
import { HttpGenericTab } from '@/components/HttpGenericTab';
import { ShodanTab } from '@/components/ShodanTab';
import { MetasploitTab } from '@/components/MetasploitTab';
import { MetadataExtractorTab } from '@/components/MetadataExtractorTab';
import { ChapterDocsModal } from '@/components/ChapterDocsModal';
import { Terminal, Shield, Globe, Radar, FileSearch, Code } from 'lucide-react';

export default function Home() {
  const [activeTab, setActiveTab] = useState<TabKey>('http');
  const [docsModalOpen, setDocsModalOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#0d1117] text-[#c9d1d9] flex flex-col selection:bg-[#58a6ff]/30 selection:text-white">
      {/* Top Application Header */}
      <Header onOpenDocs={() => setDocsModalOpen(true)} activeTab={activeTab} />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-8 py-6">
        {/* Tab Navigation */}
        <TabNavigation activeTab={activeTab} onTabChange={setActiveTab} />

        {/* Tab Content Panels */}
        <div className="transition-all duration-150">
          {activeTab === 'http' && (
            <div id="panel-http" className="animate-fadeIn">
              <HttpGenericTab />
            </div>
          )}

          {activeTab === 'shodan' && (
            <div id="panel-shodan" className="animate-fadeIn">
              <ShodanTab />
            </div>
          )}

          {activeTab === 'msf' && (
            <div id="panel-msf" className="animate-fadeIn">
              <MetasploitTab />
            </div>
          )}

          {activeTab === 'bing' && (
            <div id="panel-bing" className="animate-fadeIn">
              <MetadataExtractorTab />
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-[#30363d] bg-[#161b22] py-4 px-4 sm:px-8 mt-auto">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-[#8b949e]">
          <div className="flex items-center gap-2">
            <span className="font-mono text-[#58a6ff] font-semibold">ORSO Toolkit</span>
            <span>·</span>
            <span>Seguridad en Clientes HTTP, Reconocimiento OSINT y Análisis de Metadatos</span>
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={() => setDocsModalOpen(true)}
              className="text-[#8b949e] hover:text-[#58a6ff] transition-colors"
            >
              Documentación del Capítulo
            </button>
            <span>·</span>
            <span className="font-mono text-[11px] text-zinc-500">Go net/http & Next.js Architecture</span>
          </div>
        </div>
      </footer>

      {/* Educational Docs Modal */}
      <ChapterDocsModal isOpen={docsModalOpen} onClose={() => setDocsModalOpen(false)} />
    </div>
  );
}
