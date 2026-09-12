import JSZip from 'jszip';

export interface DocMetadata {
  url?: string;
  filename?: string;
  file_type: 'openxml' | 'pdf' | 'txt' | 'unknown';
  creator?: string;
  last_modified_by?: string;
  created_at?: string;
  modified_at?: string;
  application?: string;
  company?: string;
  office_version?: string;
  title?: string;
  preview?: string;
  size: number;
  error?: string;
  security_risks?: string[];
}

const OFFICE_VERSIONS: Record<string, string> = {
  '16': 'Office 2016 / 2019 / 365',
  '15': 'Office 2013',
  '14': 'Office 2010',
  '12': 'Office 2007',
  '11': 'Office 2003',
};

export function sniffType(buf: Uint8Array): 'openxml' | 'pdf' | 'txt' | 'unknown' {
  if (buf.length < 4) return 'unknown';

  // PDF signature: %PDF (0x25 0x50 0x44 0x46)
  if (buf[0] === 0x25 && buf[1] === 0x50 && buf[2] === 0x44 && buf[3] === 0x46) {
    return 'pdf';
  }

  // ZIP / OpenXML signature: PK\x03\x04 (0x50 0x4B 0x03 0x04)
  if (buf[0] === 0x50 && buf[1] === 0x4b && buf[2] === 0x03 && buf[3] === 0x04) {
    return 'openxml';
  }

  // Check if mostly printable ASCII/UTF-8
  const checkLen = Math.min(buf.length, 512);
  let printable = 0;
  for (let i = 0; i < checkLen; i++) {
    const b = buf[i];
    if (b === 9 || b === 10 || b === 13 || (b >= 32 && b < 127) || b >= 128) {
      printable++;
    }
  }

  if (checkLen > 0 && printable / checkLen > 0.88) {
    return 'txt';
  }

  return 'unknown';
}

function extractXMLTag(xmlText: string, tag: string): string {
  const regex = new RegExp(`<(?:[a-zA-Z0-9_-]+:)?${tag}[^>]*>([\\s\\S]*?)<\\/(?:[a-zA-Z0-9_-]+:)?${tag}>`, 'i');
  const match = xmlText.match(regex);
  return match ? match[1].trim() : '';
}

export async function parseDocMetadata(buffer: Uint8Array, sourceName: string, isUrl: boolean = false): Promise<DocMetadata> {
  const meta: DocMetadata = {
    [isUrl ? 'url' : 'filename']: sourceName,
    size: buffer.length,
    file_type: 'unknown',
    security_risks: [],
  };

  const fileType = sniffType(buffer);
  meta.file_type = fileType;

  try {
    if (fileType === 'openxml') {
      await parseOpenXML(buffer, meta);
    } else if (fileType === 'pdf') {
      parsePDF(buffer, meta);
    } else if (fileType === 'txt') {
      parseTXT(buffer, meta);
    } else {
      meta.error = 'Formato no reconocido (ni ZIP/OpenXML, ni PDF, ni texto plano)';
    }
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    meta.error = `Error de extracción: ${errorMsg}`;
  }

  // Evaluate information leakage risks (OPSEC / Data Leakage)
  evaluateRisks(meta);

  return meta;
}

async function parseOpenXML(buffer: Uint8Array, meta: DocMetadata): Promise<void> {
  const zip = await JSZip.loadAsync(buffer);

  // Read docProps/core.xml
  const coreFile = zip.file('docProps/core.xml');
  if (coreFile) {
    const coreXml = await coreFile.async('text');
    meta.creator = extractXMLTag(coreXml, 'creator');
    meta.last_modified_by = extractXMLTag(coreXml, 'lastModifiedBy');
    meta.title = extractXMLTag(coreXml, 'title');
    meta.created_at = extractXMLTag(coreXml, 'created');
    meta.modified_at = extractXMLTag(coreXml, 'modified');
  }

  // Read docProps/app.xml
  const appFile = zip.file('docProps/app.xml');
  if (appFile) {
    const appXml = await appFile.async('text');
    meta.application = extractXMLTag(appXml, 'Application');
    meta.company = extractXMLTag(appXml, 'Company');
    const versionStr = extractXMLTag(appXml, 'AppVersion');
    if (versionStr) {
      const major = versionStr.split('.')[0];
      meta.office_version = OFFICE_VERSIONS[major] || `Versión ${versionStr}`;
    }
  }
}

function parsePDF(buffer: Uint8Array, meta: DocMetadata): void {
  // Read header and footer up to 16KB for fast metadata extraction
  const decoder = new TextDecoder('latin1');
  let headerText = '';
  let footerText = '';

  const headChunk = buffer.subarray(0, Math.min(buffer.length, 16384));
  headerText = decoder.decode(headChunk);

  if (buffer.length > 16384) {
    const footChunk = buffer.subarray(buffer.length - 16384);
    footerText = decoder.decode(footChunk);
  }

  const combined = headerText + '\n' + footerText;

  // Regex patterns from Go code + XMP extensions
  const authorMatch = combined.match(/\/Author\s*\(([^)]*)\)/i);
  const creatorMatch = combined.match(/\/Creator\s*\(([^)]*)\)/i);
  const producerMatch = combined.match(/\/Producer\s*\(([^)]*)\)/i);
  const titleMatch = combined.match(/\/Title\s*\(([^)]*)\)/i);

  if (authorMatch && authorMatch[1]) meta.creator = cleanPdfString(authorMatch[1]);
  if (!meta.creator && creatorMatch && creatorMatch[1]) meta.creator = cleanPdfString(creatorMatch[1]);
  if (producerMatch && producerMatch[1]) meta.application = cleanPdfString(producerMatch[1]);
  if (titleMatch && titleMatch[1]) meta.title = cleanPdfString(titleMatch[1]);

  // Check for XMP XML metadata packet if still empty
  if (!meta.creator || !meta.application) {
    const xmpCreator = extractXMLTag(combined, 'creator');
    const xmpProducer = extractXMLTag(combined, 'Producer');
    const xmpTool = extractXMLTag(combined, 'CreatorTool');

    if (!meta.creator && xmpCreator) meta.creator = xmpCreator;
    if (!meta.application && (xmpProducer || xmpTool)) meta.application = xmpProducer || xmpTool;
  }

  if (!meta.creator && !meta.application && !meta.title) {
    meta.error = 'Sin metadatos legibles en texto plano (PDF comprimido con objeto de flujo /Info)';
  }
}

function cleanPdfString(raw: string): string {
  return raw
    .replace(/\\([()\\])/g, '$1')
    .replace(/[\x00-\x1F\x7F]/g, ' ')
    .trim();
}

function parseTXT(buffer: Uint8Array, meta: DocMetadata): void {
  const decoder = new TextDecoder('utf-8', { fatal: false });
  const sample = buffer.subarray(0, Math.min(buffer.length, 2000));
  let text = decoder.decode(sample);

  // Sanitize non-printable characters
  text = text.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
  text = text.trim();

  if (text.length > 400) {
    meta.preview = text.substring(0, 400) + '...';
  } else {
    meta.preview = text;
  }
}

function evaluateRisks(meta: DocMetadata): void {
  const risks: string[] = [];

  if (meta.creator) {
    risks.push(`Fuga de identidad: Creador revelado ("${meta.creator}"). Puede exponer nombres reales o nombres de usuario de dominio.`);
    if (meta.creator.includes('\\') || meta.creator.includes('.')) {
      risks.push(`Patrón de usuario de red detectado en creador: "${meta.creator}". Útil para ataques de fuerza bruta o phishing.`);
    }
  }

  if (meta.last_modified_by && meta.last_modified_by !== meta.creator) {
    risks.push(`Fuga de colaboradores internos: Último editor revelado ("${meta.last_modified_by}").`);
  }

  if (meta.company && meta.company !== 'Microsoft') {
    risks.push(`Fuga de organización interna: Empresa registrada "${meta.company}".`);
  }

  if (meta.office_version) {
    if (meta.office_version.includes('2010') || meta.office_version.includes('2007') || meta.office_version.includes('2003')) {
      risks.push(`Software obsoleto detectado (${meta.office_version}). Versiones sin soporte oficial con vulnerabilidades conocidas.`);
    } else {
      risks.push(`Huella digital de software: ${meta.office_version}. Permite perfilar el entorno de la víctima.`);
    }
  }

  if (meta.application) {
    risks.push(`Generador de archivo identificado: "${meta.application}".`);
  }

  meta.security_risks = risks;
}
