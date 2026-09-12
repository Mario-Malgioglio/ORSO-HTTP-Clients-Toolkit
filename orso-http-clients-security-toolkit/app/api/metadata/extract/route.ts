import { NextRequest, NextResponse } from 'next/server';
import { parseDocMetadata } from '@/lib/metadata-extractor';
import JSZip from 'jszip';

export async function POST(req: NextRequest) {
  try {
    const contentType = req.headers.get('content-type') || '';

    // If multipart/form-data (File upload)
    if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData();
      const file = formData.get('file') as File | null;

      if (!file) {
        return NextResponse.json({ error: 'No se subió ningún archivo' }, { status: 400 });
      }

      const buffer = await file.arrayBuffer();
      const uint8 = new Uint8Array(buffer);
      const meta = await parseDocMetadata(uint8, file.name, false);

      return NextResponse.json({ result: meta });
    }

    // Else JSON body with url or sample type
    const body = await req.json();
    const { url, sample_type } = body;

    // Handle generated test samples for instant demo testing
    if (sample_type) {
      if (sample_type === 'docx') {
        const zip = new JSZip();
        // Mimic docProps/core.xml
        zip.file(
          'docProps/core.xml',
          `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties"
  xmlns:dc="http://purl.org/dc/elements/1.1/"
  xmlns:dcterms="http://purl.org/dc/terms/">
  <dc:creator>CORP\\jdoe_admin</dc:creator>
  <cp:lastModifiedBy>mrodriguez_sec</cp:lastModifiedBy>
  <dc:title>Reporte Confidencial de Seguridad Q3</dc:title>
  <dcterms:created>2024-03-15T09:30:00Z</dcterms:created>
  <dcterms:modified>2024-03-18T16:45:00Z</dcterms:modified>
</cp:coreProperties>`
        );

        // Mimic docProps/app.xml
        zip.file(
          'docProps/app.xml',
          `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties">
  <Application>Microsoft Office Word</Application>
  <Company>CyberDefend Solutions S.A.</Company>
  <AppVersion>16.0000</AppVersion>
</Properties>`
        );

        zip.file('word/document.xml', '<w:document><w:body><w:p><w:r><w:t>Documento de auditoria interna</w:t></w:r></w:p></w:body></w:document>');
        const zipBytes = await zip.generateAsync({ type: 'uint8array' });
        const meta = await parseDocMetadata(zipBytes, 'Auditoria_Confidencial_Q3.docx', false);
        return NextResponse.json({ result: meta, sample: true });
      }

      if (sample_type === 'pdf') {
        const pdfContent = `%PDF-1.4
1 0 obj
<< /Title (Manual de Procedimientos y Credenciales de Red)
   /Author (carlos.mendoza@latam-finance.org)
   /Creator (Adobe InDesign 2022)
   /Producer (Adobe PDF Library 15.0)
   /CreationDate (D:20231120143000Z) >>
endobj
2 0 obj
<< /Type /Catalog /Pages 3 0 R >>
endobj
xref
0 3
0000000000 65535 f
0000000009 00000 n
0000000210 00000 n
trailer
<< /Size 3 /Root 2 0 R /Info 1 0 R >>
startxref
260
%%EOF`;
        const encoder = new TextEncoder();
        const pdfBytes = encoder.encode(pdfContent);
        const meta = await parseDocMetadata(pdfBytes, 'Procedimientos_Red_Interna.pdf', false);
        return NextResponse.json({ result: meta, sample: true });
      }

      if (sample_type === 'txt') {
        const txtContent = `================================================
SERVIDOR DE ARCHIVOS INTERNO - NOTAS DE DESPLIEGUE
Fecha: 11-Sep-2026
Autor: devops@staging-cluster.local
Entorno: Producción DMZ
================================================
Lista de verificación de endpoints HTTP y credenciales de prueba.
Configuración activa en puerto 8080 con certificados autofirmados.`;
        const encoder = new TextEncoder();
        const txtBytes = encoder.encode(txtContent);
        const meta = await parseDocMetadata(txtBytes, 'deploy-notes-dmz.txt', false);
        return NextResponse.json({ result: meta, sample: true });
      }
    }

    if (!url) {
      return NextResponse.json({ error: 'URL no especificada' }, { status: 400 });
    }

    const docRes = await fetch(url, {
      headers: {
        'User-Agent': 'GoHTTP-Client/1.0 (ORSO-Toolkit)',
      },
      signal: AbortSignal.timeout(20000),
    });

    if (!docRes.ok) {
      return NextResponse.json({
        error: `HTTP ${docRes.status} al descargar el archivo: ${docRes.statusText}`,
      }, { status: 400 });
    }

    const arrayBuf = await docRes.arrayBuffer();
    const uint8 = new Uint8Array(arrayBuf);
    const meta = await parseDocMetadata(uint8, url, true);

    return NextResponse.json({ result: meta });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: `Error extrayendo metadatos: ${errorMsg}` }, { status: 500 });
  }
}
