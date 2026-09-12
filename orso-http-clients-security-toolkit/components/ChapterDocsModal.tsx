'use client';

import React from 'react';
import { X, BookOpen, Terminal, Globe, Radar, FileSearch, ShieldCheck } from 'lucide-react';

interface ChapterDocsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ChapterDocsModal({ isOpen, onClose }: ChapterDocsModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
      <div className="bg-[#161b22] border border-[#30363d] rounded-xl max-w-3xl w-full max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#30363d] bg-[#161b22]">
          <div className="flex items-center gap-2.5">
            <BookOpen className="w-5 h-5 text-[#58a6ff]" />
            <div>
              <h2 className="text-base font-bold text-[#58a6ff]">
                Black Hat Go · Capítulo 3: HTTP Clients Toolkit
              </h2>
              <p className="text-xs text-[#8b949e]">
                Fundamentos técnicos de clientes HTTP, APIs de seguridad y análisis forense de metadatos
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-zinc-400 hover:text-white hover:bg-[#21262d] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-6 overflow-y-auto space-y-6 text-xs text-[#c9d1d9] font-sans leading-relaxed">
          {/* Section 1 */}
          <div className="space-y-2 border-l-2 border-[#58a6ff] pl-3">
            <div className="flex items-center gap-2 text-sm font-bold text-[#58a6ff]">
              <Globe className="w-4 h-4" />
              <span>1. Clientes HTTP en Go (net/http)</span>
            </div>
            <p>
              El paquete estándar <code>net/http</code> de Go provee <code>http.Client</code> con soporte para transporte personalizado, timeouts, redirecciones y gestión de cookies. En este toolkit, el cliente HTTP interactivo permite construir peticiones personalizadas y evaluar las cabeceras de respuesta y tiempos de respuesta.
            </p>
          </div>

          {/* Section 2 */}
          <div className="space-y-2 border-l-2 border-amber-400 pl-3">
            <div className="flex items-center gap-2 text-sm font-bold text-amber-400">
              <Radar className="w-4 h-4" />
              <span>2. Integración con Shodan REST API</span>
            </div>
            <p>
              Shodan escanea constantemente todo el espacio IPv4 direccionable. En el Capítulo 3, se implementa un cliente REST en Go para consumir los endpoints <code>/api-info</code> (créditos y estado del plan) y <code>/shodan/host/search</code> (búsqueda de banners de servicios, puertos abiertos, ASN y geolocalización de activos).
            </p>
          </div>

          {/* Section 3 */}
          <div className="space-y-2 border-l-2 border-purple-400 pl-3">
            <div className="flex items-center gap-2 text-sm font-bold text-purple-400">
              <Terminal className="w-4 h-4" />
              <span>3. Metasploit RPC vía MessagePack</span>
            </div>
            <p>
              El demonio <code>msfrpcd</code> expone una interfaz RPC binaria sobre HTTP que no usa JSON estándar sino <strong>MessagePack (msgpack)</strong>. El flujo implementado en Go consiste en autenticarse con <code>auth.login</code> para obtener un token temporal y posteriormente invocar <code>session.list</code> para monitorear las sesiones activas en el laboratorio.
            </p>
          </div>

          {/* Section 4 */}
          <div className="space-y-2 border-l-2 border-emerald-400 pl-3">
            <div className="flex items-center gap-2 text-sm font-bold text-emerald-400">
              <FileSearch className="w-4 h-4" />
              <span>4. Extracción de Metadatos de Documentos & OPSEC</span>
            </div>
            <p>
              Los documentos corporativos públicos a menudo contienen fugas involuntarias de información confidencial:
            </p>
            <ul className="list-disc pl-5 space-y-1 text-[#8b949e]">
              <li>
                <strong className="text-zinc-200">Office Open XML (.docx, .xlsx, .pptx):</strong> Son archivos comprimidos ZIP que contienen <code>docProps/core.xml</code> (autor original, usuario que realizó la última modificación) y <code>docProps/app.xml</code> (versión exacta del software y nombre de la empresa).
              </li>
              <li>
                <strong className="text-zinc-200">Archivos PDF:</strong> Contienen diccionarios en el trailer con etiquetas <code>/Author</code>, <code>/Creator</code> y <code>/Producer</code>.
              </li>
              <li>
                <strong className="text-zinc-200">Riesgo OPSEC:</strong> Los nombres de autor suelen coincidir con nombres de usuario de dominio de Windows (ej. <code>CORP\jdoe</code>), facilitando ataques de ingeniería social o password spraying.
              </li>
            </ul>
          </div>

          {/* Section 5: Defense & Hardening */}
          <div className="p-4 bg-[#0d1117] border border-[#30363d] rounded-lg">
            <div className="flex items-center gap-2 text-xs font-bold text-emerald-400 uppercase tracking-wider mb-1.5">
              <ShieldCheck className="w-4 h-4" />
              <span>Recomendaciones de Sanitización Defensiva</span>
            </div>
            <p className="text-[11px] text-[#8b949e]">
              Antes de publicar archivos PDF u Office en sitios web públicos, utiliza herramientas de limpieza de metadatos (como el Inspector de Documentos de Microsoft Office o utilidades como <code>exiftool -all=</code>) para prevenir la divulgación de credenciales internas y arquitecturas de red.
            </p>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 border-t border-[#30363d] bg-[#161b22] flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-md bg-[#21262d] hover:bg-[#30363d] text-white text-xs font-medium border border-[#30363d] transition-colors"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
