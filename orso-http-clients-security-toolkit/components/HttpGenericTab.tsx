'use client';

import React, { useState } from 'react';
import { Send, Copy, Check, Clock, Database, Plus, Trash2, Code2, RotateCw } from 'lucide-react';

interface HeaderPair {
  key: string;
  value: string;
}

export function HttpGenericTab() {
  const [method, setMethod] = useState('GET');
  const [url, setUrl] = useState('https://www.google.com/robots.txt');
  const [customHeaders, setCustomHeaders] = useState<HeaderPair[]>([
    { key: 'Accept', value: '*/*' },
  ]);
  const [reqBody, setReqBody] = useState('');
  const [loading, setLoading] = useState(false);
  const [copiedCurl, setCopiedCurl] = useState(false);
  const [copiedBody, setCopiedBody] = useState(false);

  // Response state
  const [respStatus, setRespStatus] = useState<string | null>(null);
  const [respStatusCode, setRespStatusCode] = useState<number | null>(null);
  const [respLatency, setRespLatency] = useState<number | null>(null);
  const [respSize, setRespSize] = useState<number | null>(null);
  const [respHeaders, setRespHeaders] = useState<Record<string, string>>({});
  const [respBody, setRespBody] = useState<string>('—');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'pretty' | 'raw'>('pretty');

  const presets = [
    { label: 'Google robots.txt', method: 'GET', url: 'https://www.google.com/robots.txt', body: '' },
    { label: 'JSONPlaceholder GET', method: 'GET', url: 'https://jsonplaceholder.typicode.com/posts/1', body: '' },
    {
      label: 'JSON Echo POST',
      method: 'POST',
      url: 'https://jsonplaceholder.typicode.com/posts',
      body: JSON.stringify({ title: 'ORSO Test', body: 'HTTP client payload', userId: 1 }, null, 2),
      headers: [{ key: 'Content-Type', value: 'application/json' }],
    },
    { label: 'GitHub Zen API', method: 'GET', url: 'https://api.github.com/zen', body: '' },
  ];

  const addHeader = () => {
    setCustomHeaders([...customHeaders, { key: '', value: '' }]);
  };

  const removeHeader = (index: number) => {
    setCustomHeaders(customHeaders.filter((_, i) => i !== index));
  };

  const updateHeader = (index: number, field: 'key' | 'value', value: string) => {
    const updated = [...customHeaders];
    updated[index][field] = value;
    setCustomHeaders(updated);
  };

  const generateCurl = () => {
    let curl = `curl -X ${method} "${url}"`;
    customHeaders.forEach((h) => {
      if (h.key.trim() && h.value.trim()) {
        curl += ` -H "${h.key.trim()}: ${h.value.trim()}"`;
      }
    });
    if (['POST', 'PUT', 'PATCH'].includes(method) && reqBody.trim()) {
      curl += ` -d '${reqBody.replace(/'/g, "\\'")}'`;
    }
    return curl;
  };

  const copyCurl = () => {
    navigator.clipboard.writeText(generateCurl());
    setCopiedCurl(true);
    setTimeout(() => setCopiedCurl(false), 2000);
  };

  const copyResponseBody = () => {
    navigator.clipboard.writeText(respBody);
    setCopiedBody(true);
    setTimeout(() => setCopiedBody(false), 2000);
  };

  const handleSend = async () => {
    setLoading(true);
    setErrorMsg(null);
    setRespStatus('Enviando petición...');

    const headersMap: Record<string, string> = {};
    customHeaders.forEach((h) => {
      if (h.key.trim()) {
        headersMap[h.key.trim()] = h.value.trim();
      }
    });

    try {
      const res = await fetch('/api/http', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          method,
          url,
          headers: headersMap,
          body: reqBody,
        }),
      });

      const data = await res.json();

      if (data.error && !data.status_code) {
        setErrorMsg(data.error);
        setRespStatus('Error');
        setRespStatusCode(0);
        setRespHeaders({});
        setRespBody('—');
        return;
      }

      setRespStatus(data.status || `${data.status_code}`);
      setRespStatusCode(data.status_code);
      setRespLatency(data.latency_ms ?? null);
      setRespSize(data.size_bytes ?? null);
      setRespHeaders(data.headers || {});
      setRespBody(data.body || '(sin cuerpo en la respuesta)');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setErrorMsg(msg);
      setRespStatus('Error');
    } finally {
      setLoading(false);
    }
  };

  const formatBody = (raw: string) => {
    if (viewMode === 'pretty') {
      try {
        const parsed = JSON.parse(raw);
        return JSON.stringify(parsed, null, 2);
      } catch {
        return raw;
      }
    }
    return raw;
  };

  const formatSize = (bytes: number | null) => {
    if (!bytes || bytes <= 0) return '—';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  return (
    <div className="space-y-6">
      {/* Preset Quick Bar */}
      <div className="flex flex-wrap items-center gap-2 p-3 bg-[#161b22] border border-[#30363d] rounded-lg">
        <span className="text-xs font-semibold text-[#8b949e]">Presets de prueba:</span>
        {presets.map((p, idx) => (
          <button
            key={idx}
            onClick={() => {
              setMethod(p.method);
              setUrl(p.url);
              setReqBody(p.body);
              if (p.headers) setCustomHeaders(p.headers);
            }}
            className="text-xs px-2.5 py-1 rounded bg-[#21262d] hover:bg-[#30363d] text-[#58a6ff] border border-[#30363d] transition-colors"
          >
            {p.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Request Form */}
        <div className="lg:col-span-6 space-y-4">
          <div className="bg-[#161b22] border border-[#30363d] rounded-lg p-5 shadow-sm">
            <h2 className="text-base font-semibold text-[#58a6ff] mb-1">Cliente HTTP Genérico</h2>
            <p className="text-xs text-[#8b949e] mb-4">
              Envía cualquier método HTTP (GET, POST, PUT, DELETE, HEAD, PATCH, OPTIONS) a cualquier URL externa o interna.
            </p>

            {/* Method + URL */}
            <div className="space-y-3">
              <label className="block text-xs font-semibold text-[#8b949e]">Método y URL destino</label>
              <div className="flex gap-2">
                <select
                  id="http-method-select"
                  value={method}
                  onChange={(e) => setMethod(e.target.value)}
                  className="w-28 bg-[#0d1117] border border-[#30363d] text-[#c9d1d9] text-xs font-mono font-bold rounded-md px-3 py-2 focus:outline-none focus:border-[#58a6ff]"
                >
                  <option value="GET">GET</option>
                  <option value="POST">POST</option>
                  <option value="PUT">PUT</option>
                  <option value="DELETE">DELETE</option>
                  <option value="HEAD">HEAD</option>
                  <option value="PATCH">PATCH</option>
                  <option value="OPTIONS">OPTIONS</option>
                </select>

                <input
                  id="http-url-input"
                  type="text"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://ejemplo.com/api"
                  className="flex-1 bg-[#0d1117] border border-[#30363d] text-[#c9d1d9] text-xs font-mono rounded-md px-3 py-2 focus:outline-none focus:border-[#58a6ff]"
                />
              </div>

              {/* Custom Headers section */}
              <div className="pt-2">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-semibold text-[#8b949e]">Cabeceras HTTP (Headers)</label>
                  <button
                    id="add-header-btn"
                    onClick={addHeader}
                    className="flex items-center gap-1 text-[11px] text-[#58a6ff] hover:underline"
                  >
                    <Plus className="w-3 h-3" /> Añadir Cabecera
                  </button>
                </div>

                <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                  {customHeaders.map((h, i) => (
                    <div key={i} className="flex gap-2 items-center">
                      <input
                        type="text"
                        placeholder="Nombre (ej. Authorization)"
                        value={h.key}
                        onChange={(e) => updateHeader(i, 'key', e.target.value)}
                        className="w-1/2 bg-[#0d1117] border border-[#30363d] text-[#c9d1d9] text-xs font-mono rounded px-2.5 py-1.5 focus:border-[#58a6ff] focus:outline-none"
                      />
                      <input
                        type="text"
                        placeholder="Valor (ej. Bearer token)"
                        value={h.value}
                        onChange={(e) => updateHeader(i, 'value', e.target.value)}
                        className="flex-1 bg-[#0d1117] border border-[#30363d] text-[#c9d1d9] text-xs font-mono rounded px-2.5 py-1.5 focus:border-[#58a6ff] focus:outline-none"
                      />
                      <button
                        onClick={() => removeHeader(i)}
                        className="p-1.5 text-zinc-500 hover:text-red-400 transition-colors"
                        title="Eliminar cabecera"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Request Body for POST/PUT/PATCH */}
              <div className="pt-2">
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-[#8b949e]">Cuerpo de la Petición (Payload)</label>
                  <button
                    onClick={() => {
                      try {
                        setReqBody(JSON.stringify(JSON.parse(reqBody), null, 2));
                      } catch {
                        // ignore
                      }
                    }}
                    className="text-[11px] text-[#8b949e] hover:text-[#58a6ff]"
                  >
                    Formatear JSON
                  </button>
                </div>
                <textarea
                  id="http-body-textarea"
                  value={reqBody}
                  onChange={(e) => setReqBody(e.target.value)}
                  placeholder='{"param": "valor"}'
                  rows={5}
                  className="w-full bg-[#0d1117] border border-[#30363d] text-[#c9d1d9] text-xs font-mono rounded-md p-3 focus:outline-none focus:border-[#58a6ff] resize-y"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-between pt-2">
                <button
                  id="send-http-button"
                  onClick={handleSend}
                  disabled={loading}
                  className="flex items-center gap-2 bg-[#238636] hover:bg-[#2ea043] text-white text-xs font-medium px-4 py-2.5 rounded-md transition-colors disabled:bg-[#30363d] disabled:text-[#8b949e] disabled:cursor-not-allowed cursor-pointer"
                >
                  {loading ? (
                    <>
                      <RotateCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Enviando...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5" />
                      <span>Enviar Petición HTTP</span>
                    </>
                  )}
                </button>

                <button
                  id="copy-curl-btn"
                  onClick={copyCurl}
                  className="flex items-center gap-1.5 text-xs text-[#8b949e] hover:text-[#c9d1d9] px-2.5 py-1.5 rounded bg-[#21262d] border border-[#30363d]"
                  title="Copiar comando cURL equivalente"
                >
                  {copiedCurl ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="text-emerald-400 font-medium">¡Copiado!</span>
                    </>
                  ) : (
                    <>
                      <Code2 className="w-3.5 h-3.5" />
                      <span>Copiar cURL</span>
                    </>
                  )}
                </button>
              </div>

              {errorMsg && (
                <div className="p-3 bg-red-950/40 border border-red-800/60 rounded-md text-xs text-red-300">
                  <p className="font-semibold mb-0.5">Error:</p>
                  <p className="font-mono text-[11px] break-all">{errorMsg}</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Response Details */}
        <div className="lg:col-span-6 space-y-4">
          <div className="bg-[#161b22] border border-[#30363d] rounded-lg p-5 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#30363d] pb-3 mb-4">
              <h2 className="text-base font-semibold text-[#58a6ff]">Respuesta del Servidor</h2>

              <div className="flex items-center gap-2">
                {respStatusCode !== null && (
                  <span
                    className={`px-2.5 py-0.5 rounded text-xs font-mono font-bold ${
                      respStatusCode >= 200 && respStatusCode < 300
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                        : respStatusCode >= 300 && respStatusCode < 400
                        ? 'bg-blue-500/20 text-blue-400 border border-blue-500/40'
                        : 'bg-rose-500/20 text-rose-400 border border-rose-500/40'
                    }`}
                  >
                    HTTP {respStatusCode}
                  </span>
                )}

                {respLatency !== null && (
                  <div className="flex items-center gap-1 text-[11px] text-[#8b949e] font-mono">
                    <Clock className="w-3 h-3 text-[#58a6ff]" />
                    <span>{respLatency} ms</span>
                  </div>
                )}

                {respSize !== null && (
                  <div className="flex items-center gap-1 text-[11px] text-[#8b949e] font-mono">
                    <Database className="w-3 h-3 text-amber-400" />
                    <span>{formatSize(respSize)}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Response Headers */}
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-[#8b949e]">
                  Cabeceras de Respuesta ({Object.keys(respHeaders).length})
                </span>
              </div>

              {Object.keys(respHeaders).length > 0 ? (
                <div className="max-h-36 overflow-y-auto border border-[#30363d] rounded-md bg-[#0d1117]">
                  <table className="w-full text-left text-xs font-mono">
                    <thead>
                      <tr className="border-b border-[#30363d] bg-[#161b22] text-[#8b949e]">
                        <th className="p-2">Header</th>
                        <th className="p-2">Valor</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#21262d]">
                      {Object.entries(respHeaders).map(([k, v]) => (
                        <tr key={k} className="hover:bg-[#161b22]/40">
                          <td className="p-2 font-medium text-[#58a6ff] align-top">{k}</td>
                          <td className="p-2 text-[#c9d1d9] break-all">{v}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="p-2.5 bg-[#0d1117] border border-[#30363d] rounded text-xs text-[#8b949e] font-mono">
                  Sin cabeceras recibidas aún
                </div>
              )}
            </div>

            {/* Response Body */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-[#8b949e]">Cuerpo de la Respuesta</span>
                <div className="flex items-center gap-2">
                  <div className="flex rounded bg-[#0d1117] border border-[#30363d] p-0.5 text-[11px]">
                    <button
                      onClick={() => setViewMode('pretty')}
                      className={`px-2 py-0.5 rounded ${
                        viewMode === 'pretty' ? 'bg-[#21262d] text-[#58a6ff]' : 'text-[#8b949e]'
                      }`}
                    >
                      Formato
                    </button>
                    <button
                      onClick={() => setViewMode('raw')}
                      className={`px-2 py-0.5 rounded ${
                        viewMode === 'raw' ? 'bg-[#21262d] text-[#58a6ff]' : 'text-[#8b949e]'
                      }`}
                    >
                      Crudo
                    </button>
                  </div>
                  <button
                    onClick={copyResponseBody}
                    className="flex items-center gap-1 text-[11px] text-[#8b949e] hover:text-[#c9d1d9] px-2 py-1 bg-[#21262d] border border-[#30363d] rounded"
                  >
                    {copiedBody ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    <span>Copiar</span>
                  </button>
                </div>
              </div>

              <pre
                id="http-response-body-pre"
                className="bg-[#0d1117] border border-[#30363d] rounded-md p-3.5 text-xs font-mono text-[#c9d1d9] overflow-auto max-h-80 whitespace-pre-wrap word-break leading-relaxed"
              >
                {formatBody(respBody)}
              </pre>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
