import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { method = 'GET', url, headers = {}, body: reqBody } = body;

    if (!url) {
      return NextResponse.json({ error: 'URL vacía o no especificada' }, { status: 400 });
    }

    // Validate URL format
    let targetUrl: URL;
    try {
      targetUrl = new URL(url);
    } catch {
      return NextResponse.json({ error: 'URL inválida. Debe incluir http:// o https://' }, { status: 400 });
    }

    const startTime = performance.now();

    const fetchHeaders = new Headers();
    // Default User-Agent if not provided
    fetchHeaders.set('User-Agent', 'GoHTTP-Client/1.0 (ORSO-Toolkit)');
    
    if (headers && typeof headers === 'object') {
      for (const [key, value] of Object.entries(headers)) {
        if (typeof value === 'string' && value.trim() !== '') {
          fetchHeaders.set(key, value);
        }
      }
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);

    const init: RequestInit = {
      method: method.toUpperCase(),
      headers: fetchHeaders,
      signal: controller.signal,
      redirect: 'follow',
    };

    if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method.toUpperCase()) && reqBody) {
      init.body = typeof reqBody === 'string' ? reqBody : JSON.stringify(reqBody);
    }

    const response = await fetch(targetUrl.toString(), init);
    clearTimeout(timeoutId);

    const endTime = performance.now();
    const latencyMs = Math.round(endTime - startTime);

    const responseHeaders: Record<string, string> = {};
    response.headers.forEach((val, key) => {
      responseHeaders[key] = val;
    });

    const buffer = await response.arrayBuffer();
    const sizeBytes = buffer.byteLength;
    const decoder = new TextDecoder('utf-8', { fatal: false });
    let responseText = decoder.decode(buffer);

    if (responseText.length > 65536) {
      responseText =
        responseText.substring(0, 65536) +
        `\n\n... [truncado por límite de visualización, tamaño total: ${sizeBytes} bytes]`;
    }

    return NextResponse.json({
      status: `${response.status} ${response.statusText}`,
      status_code: response.status,
      latency_ms: latencyMs,
      size_bytes: sizeBytes,
      headers: responseHeaders,
      body: responseText,
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({
      error: `Error al realizar la petición HTTP: ${errorMsg}`,
      status: 'Error de Red / Conexión',
      status_code: 0,
      headers: {},
      body: '',
    }, { status: 200 });
  }
}
