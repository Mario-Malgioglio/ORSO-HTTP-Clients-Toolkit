'use client';

import React, { useState } from 'react';
import { Search, Key, ShieldCheck, Eye, EyeOff, Globe, Server, MapPin, Database, Sparkles, AlertCircle } from 'lucide-react';

interface ShodanHost {
  ip_str: string;
  ip?: number;
  port: number;
  os?: string;
  timestamp?: string;
  isp?: string;
  asn?: string;
  org?: string;
  hostnames?: string[];
  domains?: string[];
  location: {
    city?: string;
    country_name?: string;
    country_code?: string;
    latitude?: number;
    longitude?: number;
    postal_code?: string;
  };
  data?: string;
}

interface ShodanInfoData {
  query_credits: number;
  scan_credits: number;
  plan: string;
  telnet: boolean;
  https: boolean;
  unlocked: boolean;
  _simulation?: boolean;
}

export function ShodanTab() {
  const [apiKey, setApiKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [query, setQuery] = useState('apache');
  const [useSimulated, setUseSimulated] = useState(true);

  // States
  const [loadingInfo, setLoadingInfo] = useState(false);
  const [loadingSearch, setLoadingSearch] = useState(false);
  const [infoData, setInfoData] = useState<ShodanInfoData | null>(null);
  const [hosts, setHosts] = useState<ShodanHost[]>([]);
  const [totalMatches, setTotalMatches] = useState<number | null>(null);
  const [statusMsg, setStatusMsg] = useState<{ text: string; ok: boolean } | null>(null);
  const [activeSubTab, setActiveSubTab] = useState<'cards' | 'json'>('cards');
  const [rawJson, setRawJson] = useState<string>('—');

  const queryPresets = [
    { label: 'Apache Servers', q: 'apache' },
    { label: 'Nginx SSL', q: 'nginx port:443' },
    { label: 'SSH OpenSSH', q: 'OpenSSH port:22' },
    { label: 'Microsoft IIS', q: 'Microsoft-IIS' },
    { label: 'España (ES)', q: 'country:ES' },
  ];

  const fetchSubscriptionInfo = async () => {
    setLoadingInfo(true);
    setStatusMsg({ text: 'Consultando datos de suscripción a Shodan...', ok: true });
    try {
      const url = `/api/shodan/info?key=${encodeURIComponent(apiKey)}&simulate=${useSimulated}&fallback=demo`;
      const res = await fetch(url);
      const data = await res.json();

      if (data.error) {
        setStatusMsg({ text: `❌ ${data.error}`, ok: false });
        return;
      }

      setInfoData(data);
      setRawJson(JSON.stringify(data, null, 2));
      setStatusMsg({
        text: `✅ Plan "${data.plan || 'Standard'}" verificado. Créditos disponibles: ${data.query_credits}`,
        ok: true,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setStatusMsg({ text: `❌ Error de red: ${msg}`, ok: false });
    } finally {
      setLoadingInfo(false);
    }
  };

  const handleSearch = async () => {
    if (!query.trim()) {
      setStatusMsg({ text: '❌ Por favor ingresa una query de búsqueda', ok: false });
      return;
    }

    setLoadingSearch(true);
    setStatusMsg({ text: `Buscando hosts con filtro "${query}"...`, ok: true });

    try {
      const res = await fetch('/api/shodan/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          api_key: apiKey,
          query,
          simulate: useSimulated,
        }),
      });

      const data = await res.json();

      if (data.error) {
        setStatusMsg({ text: `❌ ${data.error}`, ok: false });
        return;
      }

      const matches = data.matches || [];
      setHosts(matches);
      setTotalMatches(data.total ?? matches.length);
      setRawJson(JSON.stringify(data, null, 2));
      setStatusMsg({
        text: `✅ ${matches.length} hosts obtenidos (${data.total || matches.length} totales registrados)`,
        ok: true,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setStatusMsg({ text: `❌ Error en búsqueda Shodan: ${msg}`, ok: false });
    } finally {
      setLoadingSearch(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Configuration & Search Bar Card */}
      <div className="bg-[#161b22] border border-[#30363d] rounded-lg p-5 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#30363d] pb-4 mb-4">
          <div>
            <h2 className="text-base font-semibold text-[#58a6ff]">Shodan API Intelligence & Recon</h2>
            <p className="text-xs text-[#8b949e]">
              Consulta planes de suscripción y realiza búsquedas de dispositivos expuestos a Internet.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <label className="flex items-center gap-2 text-xs text-[#c9d1d9] cursor-pointer bg-[#0d1117] px-3 py-1.5 rounded-md border border-[#30363d]">
              <input
                id="shodan-sim-checkbox"
                type="checkbox"
                checked={useSimulated}
                onChange={(e) => setUseSimulated(e.target.checked)}
                className="rounded border-zinc-700 text-blue-500 focus:ring-0"
              />
              <span className="flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>Modo Demo / Sandbox</span>
              </span>
            </label>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
          {/* API Key section */}
          <div className="md:col-span-6 space-y-2">
            <label className="block text-xs font-semibold text-[#8b949e]">
              API Key de Shodan {!useSimulated && <span className="text-red-400">*</span>}
            </label>
            <div className="relative flex items-center">
              <input
                id="shodan-api-key-input"
                type={showKey ? 'text' : 'password'}
                placeholder={useSimulated ? 'Modo Sandbox activo (o ingresa tu key)' : 'Ingresa tu SHODAN_API_KEY'}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                className="w-full bg-[#0d1117] border border-[#30363d] text-[#c9d1d9] text-xs font-mono rounded-md pl-3 pr-10 py-2 focus:outline-none focus:border-[#58a6ff]"
              />
              <button
                type="button"
                onClick={() => setShowKey(!showKey)}
                className="absolute right-2 text-zinc-400 hover:text-zinc-200 p-1"
                title={showKey ? 'Ocultar clave' : 'Mostrar clave'}
              >
                {showKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </button>
            </div>

            <button
              id="shodan-verify-key-button"
              onClick={fetchSubscriptionInfo}
              disabled={loadingInfo}
              className="w-full flex items-center justify-center gap-1.5 bg-[#21262d] hover:bg-[#30363d] text-[#c9d1d9] text-xs font-medium py-2 px-3 rounded-md border border-[#30363d] transition-colors"
            >
              <Key className="w-3.5 h-3.5 text-amber-400" />
              <span>{loadingInfo ? 'Consultando...' : 'Ver suscripción / Créditos'}</span>
            </button>
          </div>

          {/* Search Query section */}
          <div className="md:col-span-6 space-y-2">
            <label className="block text-xs font-semibold text-[#8b949e]">Query de Búsqueda de Hosts</label>
            <div className="flex gap-2">
              <input
                id="shodan-query-input"
                type="text"
                placeholder="ej: apache, nginx, port:22, country:ES"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                className="flex-1 bg-[#0d1117] border border-[#30363d] text-[#c9d1d9] text-xs font-mono rounded-md px-3 py-2 focus:outline-none focus:border-[#58a6ff]"
              />
              <button
                id="shodan-search-button"
                onClick={handleSearch}
                disabled={loadingSearch}
                className="flex items-center gap-1.5 bg-[#238636] hover:bg-[#2ea043] text-white text-xs font-medium px-4 py-2 rounded-md transition-colors disabled:bg-[#30363d]"
              >
                <Search className="w-3.5 h-3.5" />
                <span>{loadingSearch ? 'Buscando...' : 'Buscar'}</span>
              </button>
            </div>

            {/* Quick Query Filters */}
            <div className="flex flex-wrap items-center gap-1.5 pt-1">
              <span className="text-[11px] text-[#8b949e]">Filtros rápidos:</span>
              {queryPresets.map((qp, i) => (
                <button
                  key={i}
                  onClick={() => {
                    setQuery(qp.q);
                  }}
                  className="text-[11px] font-mono px-2 py-0.5 rounded bg-[#0d1117] hover:bg-[#21262d] text-[#58a6ff] border border-[#30363d] transition-colors"
                >
                  {qp.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Status bar */}
        {statusMsg && (
          <div
            className={`mt-4 p-2.5 rounded-md text-xs font-mono flex items-center gap-2 border ${
              statusMsg.ok
                ? 'bg-emerald-950/30 border-emerald-800/50 text-emerald-300'
                : 'bg-rose-950/30 border-rose-800/50 text-rose-300'
            }`}
          >
            <span>{statusMsg.text}</span>
          </div>
        )}
      </div>

      {/* Subscription Info Card (if loaded) */}
      {infoData && (
        <div className="bg-[#161b22] border border-[#30363d] rounded-lg p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#8b949e]">
              Estado de Cuenta Shodan {infoData._simulation && '(Modo Demo Sandbox)'}
            </h3>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
            <div className="p-2.5 bg-[#0d1117] border border-[#30363d] rounded-md">
              <p className="text-[11px] text-[#8b949e]">Plan de Cuenta</p>
              <p className="text-sm font-bold font-mono text-[#58a6ff] uppercase">{infoData.plan || 'Free'}</p>
            </div>
            <div className="p-2.5 bg-[#0d1117] border border-[#30363d] rounded-md">
              <p className="text-[11px] text-[#8b949e]">Créditos Query</p>
              <p className="text-sm font-bold font-mono text-emerald-400">{infoData.query_credits}</p>
            </div>
            <div className="p-2.5 bg-[#0d1117] border border-[#30363d] rounded-md">
              <p className="text-[11px] text-[#8b949e]">Créditos Scan</p>
              <p className="text-sm font-bold font-mono text-amber-400">{infoData.scan_credits}</p>
            </div>
            <div className="p-2.5 bg-[#0d1117] border border-[#30363d] rounded-md">
              <p className="text-[11px] text-[#8b949e]">HTTPS API</p>
              <p className="text-sm font-bold font-mono text-emerald-400">{infoData.https ? 'Habilitado' : 'No'}</p>
            </div>
            <div className="p-2.5 bg-[#0d1117] border border-[#30363d] rounded-md">
              <p className="text-[11px] text-[#8b949e]">Telnet Scanner</p>
              <p className="text-sm font-bold font-mono text-zinc-400">{infoData.telnet ? 'Sí' : 'No'}</p>
            </div>
            <div className="p-2.5 bg-[#0d1117] border border-[#30363d] rounded-md">
              <p className="text-[11px] text-[#8b949e]">Desbloqueado</p>
              <p className="text-sm font-bold font-mono text-emerald-400">{infoData.unlocked ? 'Sí' : 'No'}</p>
            </div>
          </div>
        </div>
      )}

      {/* Results View: Cards or Raw JSON */}
      <div className="bg-[#161b22] border border-[#30363d] rounded-lg p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#30363d] pb-3 mb-4">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold text-[#58a6ff]">Resultados de Hosts</h3>
            {totalMatches !== null && (
              <span className="px-2 py-0.5 rounded text-xs bg-[#21262d] text-[#8b949e] font-mono border border-[#30363d]">
                {hosts.length} de {totalMatches} hosts
              </span>
            )}
          </div>

          <div className="flex rounded bg-[#0d1117] border border-[#30363d] p-0.5 text-xs">
            <button
              onClick={() => setActiveSubTab('cards')}
              className={`px-3 py-1 rounded transition-colors ${
                activeSubTab === 'cards' ? 'bg-[#21262d] text-[#58a6ff] font-medium' : 'text-[#8b949e]'
              }`}
            >
              Vista Detallada
            </button>
            <button
              onClick={() => setActiveSubTab('json')}
              className={`px-3 py-1 rounded transition-colors ${
                activeSubTab === 'json' ? 'bg-[#21262d] text-[#58a6ff] font-medium' : 'text-[#8b949e]'
              }`}
            >
              JSON Crudo
            </button>
          </div>
        </div>

        {activeSubTab === 'cards' ? (
          hosts.length > 0 ? (
            <div className="space-y-4">
              {hosts.map((host, i) => (
                <div
                  key={i}
                  className="bg-[#0d1117] border border-[#30363d] rounded-lg p-4 hover:border-[#58a6ff]/60 transition-colors"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-2 pb-2 border-b border-[#21262d]">
                    <div className="flex items-center gap-2 font-mono">
                      <span className="text-sm font-bold text-[#58a6ff]">{host.ip_str}</span>
                      <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-xs font-bold">
                        Puerto {host.port}
                      </span>
                      {host.os && (
                        <span className="px-2 py-0.5 rounded bg-[#21262d] text-zinc-300 text-xs">{host.os}</span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 text-xs text-[#8b949e]">
                      <MapPin className="w-3.5 h-3.5 text-rose-400" />
                      <span>
                        {host.location?.city ? `${host.location.city}, ` : ''}
                        {host.location?.country_name || host.location?.country_code || 'Ubicación Desconocida'}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 text-xs mb-3 font-mono text-[#8b949e]">
                    <div>
                      <span className="text-zinc-500">Organización: </span>
                      <span className="text-zinc-300">{host.org || '—'}</span>
                    </div>
                    <div>
                      <span className="text-zinc-500">ISP / ASN: </span>
                      <span className="text-zinc-300">
                        {host.isp || '—'} {host.asn ? `(${host.asn})` : ''}
                      </span>
                    </div>
                    <div>
                      <span className="text-zinc-500">Hostnames: </span>
                      <span className="text-zinc-300">
                        {host.hostnames && host.hostnames.length > 0 ? host.hostnames.join(', ') : 'Ninguno'}
                      </span>
                    </div>
                  </div>

                  {host.data && (
                    <div>
                      <span className="text-[11px] font-semibold text-[#8b949e] uppercase block mb-1">
                        Banner de Servicio HTTP/SSH/FTP
                      </span>
                      <pre className="bg-[#161b22] border border-[#30363d] rounded p-2.5 text-[11px] font-mono text-[#c9d1d9] overflow-x-auto whitespace-pre-wrap max-h-32">
                        {host.data}
                      </pre>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="p-8 text-center text-xs text-[#8b949e] font-mono bg-[#0d1117] rounded-md border border-[#30363d]">
              No hay hosts cargados. Haz clic en &quot;Buscar&quot; para explorar la red o prueba una de las búsquedas rápidas.
            </div>
          )
        ) : (
          <pre className="bg-[#0d1117] border border-[#30363d] rounded-md p-4 text-xs font-mono text-[#c9d1d9] overflow-auto max-h-96">
            {rawJson}
          </pre>
        )}
      </div>
    </div>
  );
}
