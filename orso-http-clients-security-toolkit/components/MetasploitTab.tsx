'use client';

import React, { useState } from 'react';
import { Terminal, Shield, Lock, User, Server, AlertTriangle, CheckCircle2, RefreshCw, Cpu, Layers } from 'lucide-react';

interface MsfSession {
  id: number;
  type: string;
  tunnel_local: string;
  tunnel_peer: string;
  via_exploit: string;
  via_payload: string;
  desc?: string;
  info?: string;
  workspace: string;
  session_host: string;
  session_port: number;
  username: string;
  uuid: string;
}

export function MetasploitTab() {
  const [host, setHost] = useState('10.0.1.6:55552');
  const [user, setUser] = useState('msf');
  const [pass, setPass] = useState('s3cr3t');
  const [simulate, setSimulate] = useState(true);
  const [loading, setLoading] = useState(false);
  const [sessions, setSessions] = useState<Record<string, MsfSession>>({});
  const [sessionCount, setSessionCount] = useState<number | null>(null);
  const [statusMsg, setStatusMsg] = useState<{ text: string; ok: boolean } | null>(null);
  const [rawJson, setRawJson] = useState<string>('—');
  const [activeSubTab, setActiveSubTab] = useState<'cards' | 'json'>('cards');

  const handleFetchSessions = async () => {
    setLoading(true);
    setStatusMsg({ text: 'Conectando al demonio msfrpcd vía MessagePack...', ok: true });

    try {
      const res = await fetch('/api/metasploit/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          host: simulate ? 'lab-demo' : host,
          user,
          pass,
          simulate,
        }),
      });

      const data = await res.json();

      if (data.error && !data.sessions) {
        setStatusMsg({ text: `❌ ${data.error}`, ok: false });
        return;
      }

      const sess = data.sessions || {};
      setSessions(sess);
      const count = Object.keys(sess).length;
      setSessionCount(count);
      setRawJson(JSON.stringify(sess, null, 2));

      setStatusMsg({
        text: `✅ ${count} sesiones de auditoría activas detectadas en workspace`,
        ok: true,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setStatusMsg({ text: `❌ Error de conexión RPC: ${msg}`, ok: false });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Configuration Card */}
      <div className="bg-[#161b22] border border-[#30363d] rounded-lg p-5 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#30363d] pb-4 mb-4">
          <div>
            <h2 className="text-base font-semibold text-[#58a6ff]">Metasploit RPC · Monitor de Sesiones</h2>
            <p className="text-xs text-[#8b949e]">
              Conexión binaria mediante <code>MessagePack</code> sobre HTTP para consultar <code>auth.login</code> y{' '}
              <code>session.list</code>.
            </p>
          </div>

          <label className="flex items-center gap-2 text-xs text-[#c9d1d9] cursor-pointer bg-[#0d1117] px-3 py-1.5 rounded-md border border-[#30363d]">
            <input
              id="msf-sim-checkbox"
              type="checkbox"
              checked={simulate}
              onChange={(e) => setSimulate(e.target.checked)}
              className="rounded border-zinc-700 text-blue-500 focus:ring-0"
            />
            <span className="font-mono text-xs text-amber-400 font-semibold">Modo Laboratorio Simulado</span>
          </label>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-semibold text-[#8b949e] mb-1">Host y Puerto RPC (msfrpcd)</label>
            <div className="flex items-center bg-[#0d1117] border border-[#30363d] rounded-md px-2.5 py-1.5 focus-within:border-[#58a6ff]">
              <Server className="w-3.5 h-3.5 text-zinc-500 mr-2" />
              <input
                id="msf-host-input"
                type="text"
                disabled={simulate}
                value={simulate ? 'lab-auditor.local:55552' : host}
                onChange={(e) => setHost(e.target.value)}
                placeholder="10.0.1.6:55552"
                className="w-full bg-transparent text-[#c9d1d9] text-xs font-mono focus:outline-none disabled:text-zinc-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#8b949e] mb-1">Usuario RPC</label>
            <div className="flex items-center bg-[#0d1117] border border-[#30363d] rounded-md px-2.5 py-1.5 focus-within:border-[#58a6ff]">
              <User className="w-3.5 h-3.5 text-zinc-500 mr-2" />
              <input
                id="msf-user-input"
                type="text"
                disabled={simulate}
                value={user}
                onChange={(e) => setUser(e.target.value)}
                placeholder="msf"
                className="w-full bg-transparent text-[#c9d1d9] text-xs font-mono focus:outline-none disabled:text-zinc-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#8b949e] mb-1">Contraseña RPC</label>
            <div className="flex items-center bg-[#0d1117] border border-[#30363d] rounded-md px-2.5 py-1.5 focus-within:border-[#58a6ff]">
              <Lock className="w-3.5 h-3.5 text-zinc-500 mr-2" />
              <input
                id="msf-pass-input"
                type="password"
                disabled={simulate}
                value={simulate ? '••••••••••••' : pass}
                onChange={(e) => setPass(e.target.value)}
                placeholder="s3cr3t"
                className="w-full bg-transparent text-[#c9d1d9] text-xs font-mono focus:outline-none disabled:text-zinc-500"
              />
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between mt-4">
          <button
            id="msf-fetch-button"
            onClick={handleFetchSessions}
            disabled={loading}
            className="flex items-center gap-2 bg-[#238636] hover:bg-[#2ea043] text-white text-xs font-medium px-4 py-2.5 rounded-md transition-colors disabled:bg-[#30363d] cursor-pointer"
          >
            {loading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Terminal className="w-3.5 h-3.5" />}
            <span>{loading ? 'Consultando RPC...' : 'Listar Sesiones Activas'}</span>
          </button>

          <span className="text-[11px] text-[#8b949e]">
            Protocolo: <code>msgpack (binary)</code> / Endpoint: <code>POST /api</code>
          </span>
        </div>

        {statusMsg && (
          <div
            className={`mt-4 p-2.5 rounded-md text-xs font-mono border ${
              statusMsg.ok
                ? 'bg-emerald-950/30 border-emerald-800/50 text-emerald-300'
                : 'bg-rose-950/30 border-rose-800/50 text-rose-300'
            }`}
          >
            {statusMsg.text}
          </div>
        )}
      </div>

      {/* Sessions Result List */}
      <div className="bg-[#161b22] border border-[#30363d] rounded-lg p-5 shadow-sm">
        <div className="flex items-center justify-between border-b border-[#30363d] pb-3 mb-4">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold text-[#58a6ff]">Sesiones Meterpreter & Shell</h3>
            {sessionCount !== null && (
              <span className="px-2 py-0.5 rounded text-xs bg-[#21262d] text-emerald-400 font-mono font-bold border border-[#30363d]">
                {sessionCount} activas
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
              Tarjetas de Sesión
            </button>
            <button
              onClick={() => setActiveSubTab('json')}
              className={`px-3 py-1 rounded transition-colors ${
                activeSubTab === 'json' ? 'bg-[#21262d] text-[#58a6ff] font-medium' : 'text-[#8b949e]'
              }`}
            >
              MessagePack decodificado (JSON)
            </button>
          </div>
        </div>

        {activeSubTab === 'cards' ? (
          Object.keys(sessions).length > 0 ? (
            <div className="grid grid-cols-1 gap-4">
              {Object.entries(sessions).map(([idKey, s]) => {
                const isPrivileged =
                  s.username?.toLowerCase().includes('system') ||
                  s.username?.toLowerCase().includes('root') ||
                  s.username?.toLowerCase().includes('admin');

                return (
                  <div
                    key={idKey}
                    className="bg-[#0d1117] border border-[#30363d] rounded-lg p-4 hover:border-[#58a6ff]/60 transition-all"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#21262d] pb-2.5 mb-3">
                      <div className="flex items-center gap-2">
                        <span className="px-2.5 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/30 text-xs font-mono font-bold">
                          Sesión #{s.id || idKey}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded text-xs font-semibold uppercase font-mono ${
                            s.type === 'meterpreter'
                              ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40'
                              : 'bg-zinc-800 text-zinc-300 border border-zinc-700'
                          }`}
                        >
                          {s.type}
                        </span>
                        {isPrivileged && (
                          <span className="px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/40 text-[11px] font-bold">
                            Privilegios Elevados ({s.username})
                          </span>
                        )}
                      </div>

                      <div className="text-xs font-mono text-[#8b949e]">
                        Workspace: <span className="text-[#c9d1d9]">{s.workspace || 'default'}</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs font-mono mb-3">
                      <div className="p-2.5 rounded bg-[#161b22] border border-[#30363d] space-y-1">
                        <p className="text-zinc-400 font-semibold text-[11px] uppercase tracking-wider">
                          Túnel de Red (Local ⇄ Remoto)
                        </p>
                        <p className="text-[#58a6ff] text-xs">
                          {s.tunnel_local} ⟶ {s.tunnel_peer}
                        </p>
                        <p className="text-zinc-500 text-[11px]">
                          Host Remoto: <span className="text-zinc-300">{s.session_host}:{s.session_port}</span>
                        </p>
                      </div>

                      <div className="p-2.5 rounded bg-[#161b22] border border-[#30363d] space-y-1">
                        <p className="text-zinc-400 font-semibold text-[11px] uppercase tracking-wider">
                          Vectores de Auditoría
                        </p>
                        <p className="text-zinc-300 truncate" title={s.via_exploit}>
                          <span className="text-zinc-500">Exploit:</span> {s.via_exploit || 'manual'}
                        </p>
                        <p className="text-zinc-300 truncate" title={s.via_payload}>
                          <span className="text-zinc-500">Payload:</span> {s.via_payload || '—'}
                        </p>
                      </div>
                    </div>

                    <div className="bg-[#161b22] border border-[#30363d] rounded p-2.5 text-xs font-mono">
                      <span className="text-zinc-500 block mb-1 text-[11px] uppercase font-semibold">
                        Información del Sistema Operativo & Sesión
                      </span>
                      <p className="text-[#c9d1d9]">{s.info || s.desc || 'Sin información reportada'}</p>
                      <p className="text-[11px] text-zinc-500 mt-1">UUID: {s.uuid}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="p-8 text-center text-xs text-[#8b949e] font-mono bg-[#0d1117] rounded-md border border-[#30363d]">
              No hay sesiones listadas. Pulsa &quot;Listar Sesiones Activas&quot; para consultar el servidor msfrpcd o probar el entorno de laboratorio.
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
