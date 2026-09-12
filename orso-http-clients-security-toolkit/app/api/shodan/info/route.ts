import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const apiKey = searchParams.get('key') || process.env.SHODAN_API_KEY;
  const isSimulated = searchParams.get('simulate') === 'true' || apiKey === 'demo';

  if (isSimulated || (!apiKey && searchParams.get('fallback') === 'demo')) {
    return NextResponse.json({
      query_credits: 98,
      scan_credits: 100,
      telnet: false,
      plan: 'dev_academic',
      https: true,
      unlocked: true,
      _simulation: true,
    });
  }

  if (!apiKey) {
    return NextResponse.json(
      { error: 'Falta la API Key de Shodan. Ingresa tu API key o activa el modo laboratorio de prueba.' },
      { status: 400 }
    );
  }

  try {
    const res = await fetch(`https://api.shodan.io/api-info?key=${encodeURIComponent(apiKey)}`, {
      headers: { Accept: 'application/json' },
    });

    if (!res.ok) {
      const body = await res.text();
      return NextResponse.json(
        { error: `Shodan HTTP ${res.status}: ${body || res.statusText}` },
        { status: res.status }
      );
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { error: `Error de conexión con Shodan API: ${errorMsg}` },
      { status: 500 }
    );
  }
}
