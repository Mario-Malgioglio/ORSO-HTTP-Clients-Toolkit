'use client';

import React, { useState } from 'react';
import {
  FileSearch,
  UploadCloud,
  FileText,
  AlertTriangle,
  CheckCircle,
  ExternalLink,
  Search,
  Sparkles,
  Download,
  Info,
  ShieldAlert,
  FileSpreadsheet,
} from 'lucide-react';
import { DocMetadata } from '@/lib/metadata-extractor';

export function MetadataExtractorTab() {
  const [mode, setMode] = useState<'search' | 'upload' | 'url'>('upload');

  // Search mode state
  const [domain, setDomain] = useState('nytimes.com');
  const [filetype, setFiletype] = useState('docx');
  const [loadingSearch, setLoadingSearch] = useState(false);

  // URL mode state
  const [directUrl, setDirectUrl] = useState('');
  const [loadingUrl, setLoadingUrl] = useState(false);

  // Upload state
  const [loadingUpload, setLoadingUpload] = useState(false);

  // Combined Results list
  const [results, setResults] = useState<DocMetadata[]>([]);
  const [statusMsg, setStatusMsg] = useState<{ text: string; ok: boolean } | null>(null);
  const [selectedDoc, setSelectedDoc] = useState<DocMetadata | null>(null);

  const formatSize = (bytes: number) => {
    if (!bytes || bytes <= 0) return '—';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const handleDownloadJSON = () => {
    if (results.length === 0) return;
    const blob = new Blob([JSON.stringify(results, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `metadatos-encontrados-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleDownloadCSV = () => {
    if (results.length === 0) return;
    const headers = [
      'ID',
      'Origen_o_URL',
      'Tipo_Archivo',
      'Titulo',
      'Autor_Creador',
      'Modificado_Por',
      'Empresa',
      'Aplicacion_Generadora',
      'Version_Office',
      'Tamano_Bytes',
      'Riesgos_OPSEC',
      'Error',
    ];

    const escapeCSV = (val: unknown) => {
      if (val === undefined || val === null) return '""';
      const str = String(val).replace(/"/g, '""');
      return `"${str}"`;
    };

    const rows = results.map((doc, idx) => [
      idx + 1,
      doc.url || doc.filename || 'Desconocido',
      doc.file_type,
      doc.title || '',
      doc.creator || '',
      doc.last_modified_by || '',
      doc.company || '',
      doc.application || '',
      doc.office_version || '',
      doc.size || 0,
      (doc.security_risks || []).join('; '),
      doc.error || '',
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map((row) => row.map(escapeCSV).join(',')),
    ].join('\r\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `metadatos-encontrados-${Date.now()}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleDownloadReport = () => {
    if (results.length === 0) return;
    const lines: string[] = [
      '======================================================================',
      '           INFORME DE EXTRACCIÓN DE METADATOS Y FUGA DE INFORMACIÓN',
      '             Black Hat Go - Chapter 3: Metadata Harvesting Tool',
      `           Generado: ${new Date().toLocaleString()}`,
      `           Total Documentos Analizados: ${results.length}`,
      '======================================================================\n',
    ];

    results.forEach((doc, idx) => {
      lines.push(`[#${idx + 1}] ${doc.filename || doc.url || 'Documento sin nombre'}`);
      lines.push(`----------------------------------------------------------------------`);
      lines.push(`Tipo de archivo     : ${doc.file_type?.toUpperCase() || 'DESCONOCIDO'}`);
      lines.push(`Origen / Enlace     : ${doc.url || doc.filename || 'Carga local'}`);
      lines.push(`Tamaño              : ${formatSize(doc.size)} (${doc.size} bytes)`);
      lines.push(`Título              : ${doc.title || 'No definido'}`);
      lines.push(`Autor / Creador     : ${doc.creator || 'No definido'}`);
      lines.push(`Última Modificación : ${doc.last_modified_by || 'No definido'}`);
      lines.push(`Empresa             : ${doc.company || 'No definido'}`);
      lines.push(`Aplicación          : ${doc.application || 'No definido'}`);
      lines.push(`Versión Office      : ${doc.office_version || 'No definido'}`);

      if (doc.security_risks && doc.security_risks.length > 0) {
        lines.push(`ALERTAS OPSEC / RIESGOS:`);
        doc.security_risks.forEach((risk) => {
          lines.push(`  [!] ${risk}`);
        });
      } else {
        lines.push(`Alertas OPSEC       : Ninguna detectada`);
      }

      if (doc.error) {
        lines.push(`Error de análisis   : ${doc.error}`);
      }
      lines.push('\n');
    });

    const blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `informe-metadatos-${Date.now()}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleDownloadSingleDoc = (doc: DocMetadata, format: 'json' | 'txt') => {
    const rawName = doc.filename || (doc.url ? doc.url.split('/').pop() : 'documento') || 'documento';
    const safeName = rawName.replace(/[^a-zA-Z0-9._-]/g, '_').substring(0, 35);

    if (format === 'json') {
      const blob = new Blob([JSON.stringify(doc, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `metadatos-${safeName}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } else {
      const content = [
        `FICHA DE METADATOS: ${rawName}`,
        `Fecha de Análisis: ${new Date().toLocaleString()}`,
        `============================================================`,
        `Archivo / URL       : ${doc.url || doc.filename || 'Desconocido'}`,
        `Tipo de archivo     : ${doc.file_type?.toUpperCase()}`,
        `Tamaño              : ${formatSize(doc.size)} (${doc.size} bytes)`,
        `Título              : ${doc.title || 'No definido'}`,
        `Autor / Creador     : ${doc.creator || 'No definido'}`,
        `Última Modificación : ${doc.last_modified_by || 'No definido'}`,
        `Empresa             : ${doc.company || 'No definido'}`,
        `Aplicación          : ${doc.application || 'No definido'}`,
        `Versión Office      : ${doc.office_version || 'No definido'}`,
        `Riesgos OPSEC       : ${doc.security_risks?.join(' | ') || 'Ninguno'}`,
        doc.error ? `Error: ${doc.error}` : '',
      ].filter(Boolean).join('\n');

      const blob = new Blob([content], { type: 'text/plain;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `ficha-metadatos-${safeName}.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  };

  const handleBingSearch = async () => {
    if (!domain.trim()) {
      setStatusMsg({ text: '❌ Ingresa un dominio para buscar', ok: false });
      return;
    }

    setLoadingSearch(true);
    setStatusMsg({
      text: `Consultando motor de búsqueda para site:${domain} filetype:${filetype}...`,
      ok: true,
    });

    try {
      const res = await fetch('/api/bing/metadata', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ domain, filetype }),
      });

      const data = await res.json();

      if (data.error) {
        setStatusMsg({ text: `❌ ${data.error}`, ok: false });
        return;
      }

      const docs = data.results || [];
      if (docs.length === 0) {
        setStatusMsg({
          text: `⚠️ No se descargaron documentos de "${domain}". Bing puede requerir captcha o no hay archivos públicos de tipo ${filetype}. Prueba con el extractor directo de URL o subida de archivo.`,
          ok: false,
        });
      } else {
        setResults((prev) => [...docs, ...prev]);
        setStatusMsg({
          text: `✅ ${docs.length} documentos procesados con éxito desde ${domain}`,
          ok: true,
        });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setStatusMsg({ text: `❌ Error en búsqueda Bing: ${msg}`, ok: false });
    } finally {
      setLoadingSearch(false);
    }
  };

  const handleUrlExtract = async () => {
    if (!directUrl.trim()) {
      setStatusMsg({ text: '❌ Ingresa una URL de documento válida', ok: false });
      return;
    }

    setLoadingUrl(true);
    setStatusMsg({ text: `Descargando y analizando metadatos desde ${directUrl}...`, ok: true });

    try {
      const res = await fetch('/api/metadata/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: directUrl }),
      });

      const data = await res.json();
      if (data.error) {
        setStatusMsg({ text: `❌ ${data.error}`, ok: false });
        return;
      }

      if (data.result) {
        setResults((prev) => [data.result, ...prev]);
        setSelectedDoc(data.result);
        setStatusMsg({ text: `✅ Metadatos extraídos correctamente`, ok: true });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setStatusMsg({ text: `❌ Error de análisis: ${msg}`, ok: false });
    } finally {
      setLoadingUrl(false);
    }
  };

  const handleFileUpload = async (file: File) => {
    setLoadingUpload(true);
    setStatusMsg({ text: `Analizando archivo local: ${file.name}...`, ok: true });

    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/metadata/extract', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (data.error) {
        setStatusMsg({ text: `❌ ${data.error}`, ok: false });
        return;
      }

      if (data.result) {
        setResults((prev) => [data.result, ...prev]);
        setSelectedDoc(data.result);
        setStatusMsg({ text: `✅ Metadatos de "${file.name}" extraídos con éxito`, ok: true });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setStatusMsg({ text: `❌ Error al analizar archivo: ${msg}`, ok: false });
    } finally {
      setLoadingUpload(false);
    }
  };

  const loadSampleDoc = async (sampleType: 'docx' | 'pdf' | 'txt') => {
    setLoadingUpload(true);
    setStatusMsg({ text: `Generando archivo de prueba real con metadatos (${sampleType.toUpperCase()})...`, ok: true });

    try {
      const res = await fetch('/api/metadata/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sample_type: sampleType }),
      });

      const data = await res.json();
      if (data.result) {
        setResults((prev) => [data.result, ...prev]);
        setSelectedDoc(data.result);
        setStatusMsg({
          text: `✅ Muestra ${sampleType.toUpperCase()} cargada y auditada con detección de fuga de datos`,
          ok: true,
        });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setStatusMsg({ text: `❌ Error: ${msg}`, ok: false });
    } finally {
      setLoadingUpload(false);
    }
  };

  const getTypeBadge = (type: string) => {
    switch (type) {
      case 'openxml':
        return <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-[#1f6feb] text-white uppercase">OpenXML</span>;
      case 'pdf':
        return <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-[#da3633] text-white uppercase">PDF</span>;
      case 'txt':
        return <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-[#6e7681] text-white uppercase">TXT</span>;
      default:
        return <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-[#30363d] text-[#8b949e] uppercase">Unknown</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Configuration Box */}
      <div className="bg-[#161b22] border border-[#30363d] rounded-lg p-5 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#30363d] pb-4 mb-4">
          <div>
            <h2 className="text-base font-semibold text-[#58a6ff]">
              Extractor de Metadatos y Fugas de Información (Ch-3)
            </h2>
            <p className="text-xs text-[#8b949e]">
              Detección por <em>content sniffing</em> binario en <strong>Office Open XML</strong> (docx, xlsx, pptx),{' '}
              <strong>PDF</strong> (autor, productor, título) y <strong>TXT</strong>.
            </p>
          </div>

          {/* Sub-mode switcher */}
          <div className="flex rounded bg-[#0d1117] border border-[#30363d] p-0.5 text-xs">
            <button
              onClick={() => setMode('upload')}
              className={`px-3 py-1.5 rounded transition-colors ${
                mode === 'upload' ? 'bg-[#21262d] text-[#58a6ff] font-medium' : 'text-[#8b949e]'
              }`}
            >
              Subir Archivo
            </button>
            <button
              onClick={() => setMode('search')}
              className={`px-3 py-1.5 rounded transition-colors ${
                mode === 'search' ? 'bg-[#21262d] text-[#58a6ff] font-medium' : 'text-[#8b949e]'
              }`}
            >
              Búsqueda Bing
            </button>
            <button
              onClick={() => setMode('url')}
              className={`px-3 py-1.5 rounded transition-colors ${
                mode === 'url' ? 'bg-[#21262d] text-[#58a6ff] font-medium' : 'text-[#8b949e]'
              }`}
            >
              Por URL Directa
            </button>
          </div>
        </div>

        {/* Quick Sample Generators Bar */}
        <div className="mb-4 p-3 bg-[#0d1117] border border-[#30363d] rounded-md flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 text-xs text-[#c9d1d9]">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span className="font-semibold">Generar muestras instantáneas de auditoría:</span>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => loadSampleDoc('docx')}
              disabled={loadingUpload}
              className="text-xs px-2.5 py-1 bg-[#21262d] hover:bg-[#30363d] text-blue-400 rounded border border-[#30363d]"
            >
              + Muestra DOCX (Word)
            </button>
            <button
              onClick={() => loadSampleDoc('pdf')}
              disabled={loadingUpload}
              className="text-xs px-2.5 py-1 bg-[#21262d] hover:bg-[#30363d] text-rose-400 rounded border border-[#30363d]"
            >
              + Muestra PDF (InDesign)
            </button>
            <button
              onClick={() => loadSampleDoc('txt')}
              disabled={loadingUpload}
              className="text-xs px-2.5 py-1 bg-[#21262d] hover:bg-[#30363d] text-zinc-300 rounded border border-[#30363d]"
            >
              + Muestra TXT (Notas)
            </button>
          </div>
        </div>

        {/* MODE 1: Upload File */}
        {mode === 'upload' && (
          <div className="space-y-4">
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                  handleFileUpload(e.dataTransfer.files[0]);
                }
              }}
              className="border-2 border-dashed border-[#30363d] hover:border-[#58a6ff]/60 bg-[#0d1117] rounded-lg p-6 text-center transition-colors cursor-pointer"
              onClick={() => document.getElementById('file-upload-input')?.click()}
            >
              <UploadCloud className="w-8 h-8 text-[#58a6ff] mx-auto mb-2" />
              <p className="text-xs font-semibold text-[#c9d1d9] mb-1">
                Arrastra un archivo aquí o haz clic para explorar
              </p>
              <p className="text-[11px] text-[#8b949e]">
                Soporta Word/Excel/PowerPoint (.docx, .xlsx, .pptx), Adobe PDF (.pdf) y texto plano (.txt)
              </p>
              <input
                id="file-upload-input"
                type="file"
                accept=".docx,.xlsx,.pptx,.pdf,.txt"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    handleFileUpload(e.target.files[0]);
                  }
                }}
              />
            </div>
          </div>
        )}

        {/* MODE 2: Search via Bing */}
        {mode === 'search' && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
              <div className="sm:col-span-8">
                <label className="block text-xs font-semibold text-[#8b949e] mb-1">Dominio Objetivo</label>
                <input
                  id="bing-domain-input"
                  type="text"
                  placeholder="ej. nytimes.com, cisco.com"
                  value={domain}
                  onChange={(e) => setDomain(e.target.value)}
                  className="w-full bg-[#0d1117] border border-[#30363d] text-[#c9d1d9] text-xs font-mono rounded-md px-3 py-2 focus:outline-none focus:border-[#58a6ff]"
                />
              </div>

              <div className="sm:col-span-4">
                <label className="block text-xs font-semibold text-[#8b949e] mb-1">Tipo de Archivo</label>
                <select
                  id="bing-filetype-select"
                  value={filetype}
                  onChange={(e) => setFiletype(e.target.value)}
                  className="w-full bg-[#0d1117] border border-[#30363d] text-[#c9d1d9] text-xs font-mono rounded-md px-3 py-2 focus:outline-none focus:border-[#58a6ff]"
                >
                  <option value="docx">docx · Microsoft Word</option>
                  <option value="xlsx">xlsx · Microsoft Excel</option>
                  <option value="pptx">pptx · PowerPoint</option>
                  <option value="pdf">pdf · Adobe PDF</option>
                  <option value="txt">txt · Texto plano</option>
                </select>
              </div>
            </div>

            <button
              id="bing-search-button"
              onClick={handleBingSearch}
              disabled={loadingSearch}
              className="flex items-center gap-2 bg-[#238636] hover:bg-[#2ea043] text-white text-xs font-medium px-4 py-2 rounded-md transition-colors disabled:bg-[#30363d]"
            >
              <Search className="w-3.5 h-3.5" />
              <span>{loadingSearch ? 'Buscando y extrayendo...' : 'Buscar y extraer metadatos'}</span>
            </button>
          </div>
        )}

        {/* MODE 3: Direct URL */}
        {mode === 'url' && (
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-[#8b949e] mb-1">URL directa del documento</label>
              <div className="flex gap-2">
                <input
                  id="metadata-direct-url"
                  type="url"
                  placeholder="https://ejemplo.com/reporte.docx"
                  value={directUrl}
                  onChange={(e) => setDirectUrl(e.target.value)}
                  className="flex-1 bg-[#0d1117] border border-[#30363d] text-[#c9d1d9] text-xs font-mono rounded-md px-3 py-2 focus:outline-none focus:border-[#58a6ff]"
                />
                <button
                  id="extract-url-button"
                  onClick={handleUrlExtract}
                  disabled={loadingUrl}
                  className="flex items-center gap-2 bg-[#238636] hover:bg-[#2ea043] text-white text-xs font-medium px-4 py-2 rounded-md transition-colors disabled:bg-[#30363d]"
                >
                  <span>{loadingUrl ? 'Descargando...' : 'Extraer'}</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Status message */}
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

      {/* Results Table matching the Go code specification */}
      <div className="bg-[#161b22] border border-[#30363d] rounded-lg p-5 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-[#30363d] pb-3 mb-4 gap-3">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold text-[#58a6ff]">Metadatos Encontrados</h3>
            <span className="px-2 py-0.5 rounded text-xs bg-[#21262d] text-[#8b949e] font-mono border border-[#30363d]">
              {results.length} {results.length === 1 ? 'documento' : 'documentos'}
            </span>
          </div>

          {results.length > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs text-[#8b949e] mr-1 hidden md:inline">Descargar reporte:</span>
              <button
                id="btn-download-all-csv"
                onClick={handleDownloadCSV}
                className="flex items-center gap-1.5 text-xs text-emerald-400 hover:text-emerald-300 px-2.5 py-1 bg-[#21262d] hover:bg-[#30363d] border border-emerald-800/40 rounded transition-colors font-mono font-medium shadow-sm"
                title="Descargar metadatos encontrados en formato CSV (Excel / Hoja de cálculo)"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
                <span>Descargar CSV</span>
              </button>

              <button
                id="btn-download-all-json"
                onClick={handleDownloadJSON}
                className="flex items-center gap-1.5 text-xs text-[#58a6ff] hover:text-[#79c0ff] px-2.5 py-1 bg-[#21262d] hover:bg-[#30363d] border border-blue-800/40 rounded transition-colors font-mono font-medium shadow-sm"
                title="Descargar metadatos encontrados en formato JSON estructurado"
              >
                <Download className="w-3.5 h-3.5 text-[#58a6ff]" />
                <span>Descargar JSON</span>
              </button>

              <button
                id="btn-download-all-report"
                onClick={handleDownloadReport}
                className="flex items-center gap-1.5 text-xs text-amber-300 hover:text-amber-200 px-2.5 py-1 bg-[#21262d] hover:bg-[#30363d] border border-amber-800/40 rounded transition-colors font-mono font-medium shadow-sm"
                title="Descargar informe de auditoría forense en texto plano (.txt)"
              >
                <FileText className="w-3.5 h-3.5 text-amber-300" />
                <span>Descargar Informe TXT</span>
              </button>
            </div>
          )}
        </div>

        {results.length > 0 ? (
          <div className="overflow-x-auto border border-[#30363d] rounded-md">
            <table className="w-full text-left text-xs font-mono">
              <thead>
                <tr className="bg-[#161b22] text-[#8b949e] border-b border-[#30363d]">
                  <th className="p-2.5">#</th>
                  <th className="p-2.5">Origen / URL</th>
                  <th className="p-2.5">Tipo</th>
                  <th className="p-2.5">Autor / Creador</th>
                  <th className="p-2.5">App / Productor</th>
                  <th className="p-2.5">Versión Office</th>
                  <th className="p-2.5">Tamaño</th>
                  <th className="p-2.5">Info / Fuga OPSEC</th>
                  <th className="p-2.5 text-center">Descargar</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#21262d] bg-[#0d1117]">
                {results.map((doc, idx) => {
                  const source = doc.url || doc.filename || 'desconocido';
                  const hasRisks = doc.security_risks && doc.security_risks.length > 0;

                  return (
                    <tr
                      key={idx}
                      onClick={() => setSelectedDoc(doc)}
                      className={`hover:bg-[#161b22]/70 cursor-pointer transition-colors ${
                        selectedDoc === doc ? 'bg-[#1f6feb]/10' : ''
                      }`}
                    >
                      <td className="p-2.5 text-zinc-500 font-bold">{idx + 1}</td>
                      <td className="p-2.5 max-w-[220px] truncate text-[#58a6ff]" title={source}>
                        {doc.url ? (
                          <a
                            href={doc.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="hover:underline flex items-center gap-1"
                          >
                            <span>{source}</span>
                            <ExternalLink className="w-3 h-3 flex-shrink-0" />
                          </a>
                        ) : (
                          <span>{source}</span>
                        )}
                      </td>
                      <td className="p-2.5">{getTypeBadge(doc.file_type)}</td>
                      <td className="p-2.5 text-emerald-400 font-semibold">{doc.creator || '—'}</td>
                      <td className="p-2.5 text-zinc-300">{doc.application || '—'}</td>
                      <td className="p-2.5 text-amber-300">{doc.office_version || '—'}</td>
                      <td className="p-2.5 text-[#8b949e]">{formatSize(doc.size)}</td>
                      <td className="p-2.5">
                        {doc.error ? (
                          <span className="text-rose-400 font-sans">⚠ {doc.error}</span>
                        ) : doc.file_type === 'txt' && doc.preview ? (
                          <div className="max-w-[260px] truncate text-[#8b949e] text-[11px] font-sans">
                            {doc.preview}
                          </div>
                        ) : hasRisks ? (
                          <div className="flex items-center gap-1.5 text-amber-400 font-sans text-[11px]">
                            <ShieldAlert className="w-3.5 h-3.5 flex-shrink-0" />
                            <span>{doc.security_risks?.length} hallazgos OPSEC</span>
                          </div>
                        ) : doc.last_modified_by ? (
                          <span className="text-zinc-400 font-sans text-[11px]">
                            Mod. por: {doc.last_modified_by}
                          </span>
                        ) : (
                          <span className="text-zinc-500 font-sans text-[11px]">Sin alertas</span>
                        )}
                      </td>
                      <td className="p-2.5 text-center" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            id={`btn-download-json-${idx}`}
                            onClick={() => handleDownloadSingleDoc(doc, 'json')}
                            title="Descargar metadatos de este archivo en JSON"
                            className="inline-flex items-center gap-1 text-[11px] text-[#58a6ff] hover:text-[#79c0ff] px-2 py-0.5 bg-[#21262d] hover:bg-[#30363d] border border-[#30363d] rounded transition-colors font-mono"
                          >
                            <Download className="w-3 h-3" />
                            <span>JSON</span>
                          </button>
                          <button
                            id={`btn-download-txt-${idx}`}
                            onClick={() => handleDownloadSingleDoc(doc, 'txt')}
                            title="Descargar ficha de metadatos en TXT"
                            className="inline-flex items-center gap-1 text-[11px] text-emerald-400 hover:text-emerald-300 px-2 py-0.5 bg-[#21262d] hover:bg-[#30363d] border border-[#30363d] rounded transition-colors font-mono"
                          >
                            <FileText className="w-3 h-3" />
                            <span>TXT</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-8 text-center text-xs text-[#8b949e] font-mono bg-[#0d1117] rounded-md border border-[#30363d]">
            No hay documentos analizados aún. Puedes subir un archivo Word/Excel/PDF, buscar en un dominio con Bing, o pulsar uno de los botones de &quot;Generar muestras instantáneas&quot; arriba.
          </div>
        )}
      </div>

      {/* Detail Inspector Card if a document is selected */}
      {selectedDoc && (
        <div className="bg-[#161b22] border border-[#30363d] rounded-lg p-5 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-[#30363d] pb-3 mb-4 gap-3">
            <h3 className="text-sm font-bold text-[#58a6ff] flex items-center gap-2">
              <Info className="w-4 h-4" />
              <span>Detalle de Fuga de Metadatos: {selectedDoc.filename || selectedDoc.url}</span>
            </h3>
            <div className="flex items-center gap-2">
              <button
                id="btn-download-selected-json"
                onClick={() => handleDownloadSingleDoc(selectedDoc, 'json')}
                className="flex items-center gap-1.5 text-xs text-[#58a6ff] hover:text-[#79c0ff] px-2.5 py-1 bg-[#21262d] hover:bg-[#30363d] border border-[#30363d] rounded transition-colors font-mono"
                title="Descargar metadatos de este documento en JSON"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Descargar JSON</span>
              </button>
              <button
                id="btn-download-selected-txt"
                onClick={() => handleDownloadSingleDoc(selectedDoc, 'txt')}
                className="flex items-center gap-1.5 text-xs text-emerald-400 hover:text-emerald-300 px-2.5 py-1 bg-[#21262d] hover:bg-[#30363d] border border-[#30363d] rounded transition-colors font-mono"
                title="Descargar ficha técnica de este documento en TXT"
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Descargar Ficha TXT</span>
              </button>
              <span className="text-xs text-[#8b949e] font-mono ml-1">{formatSize(selectedDoc.size)}</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div className="bg-[#0d1117] border border-[#30363d] rounded p-3 text-xs font-mono space-y-1.5">
              <p className="text-[#8b949e] font-bold uppercase text-[10px]">Propiedades del Documento</p>
              <p>
                <span className="text-zinc-500">Título:</span>{' '}
                <span className="text-zinc-200">{selectedDoc.title || 'No definido'}</span>
              </p>
              <p>
                <span className="text-zinc-500">Autor / Creador:</span>{' '}
                <span className="text-emerald-400 font-semibold">{selectedDoc.creator || 'No definido'}</span>
              </p>
              <p>
                <span className="text-zinc-500">Última Modificación por:</span>{' '}
                <span className="text-blue-300">{selectedDoc.last_modified_by || 'No definido'}</span>
              </p>
              <p>
                <span className="text-zinc-500">Empresa:</span>{' '}
                <span className="text-zinc-200">{selectedDoc.company || 'No definido'}</span>
              </p>
              <p>
                <span className="text-zinc-500">Generador / App:</span>{' '}
                <span className="text-zinc-200">{selectedDoc.application || 'No definido'}</span>
              </p>
              <p>
                <span className="text-zinc-500">Versión Office:</span>{' '}
                <span className="text-amber-300">{selectedDoc.office_version || 'No definido'}</span>
              </p>
            </div>

            <div className="bg-[#0d1117] border border-[#30363d] rounded p-3 text-xs font-sans space-y-2">
              <p className="text-amber-400 font-bold uppercase text-[10px] flex items-center gap-1 font-mono">
                <ShieldAlert className="w-3.5 h-3.5" />
                <span>Auditoría de Seguridad & Fuga de Datos (OPSEC)</span>
              </p>
              {selectedDoc.security_risks && selectedDoc.security_risks.length > 0 ? (
                <ul className="space-y-1.5">
                  {selectedDoc.security_risks.map((risk, rIdx) => (
                    <li key={rIdx} className="text-xs text-amber-200/90 flex items-start gap-1.5">
                      <span className="text-amber-400 font-bold">•</span>
                      <span>{risk}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-zinc-400 text-xs">
                  No se detectaron fugas de nombres de usuario o software obsoleto de alto riesgo en este archivo.
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
