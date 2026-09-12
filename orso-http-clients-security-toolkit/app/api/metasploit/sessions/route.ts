import { NextRequest, NextResponse } from 'next/server';
import { encode, decode } from '@msgpack/msgpack';

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
  exploit_uuid?: string;
}

const LAB_SIMULATED_SESSIONS: Record<string, MsfSession> = {
  '1': {
    id: 1,
    type: 'meterpreter',
    tunnel_local: '192.168.1.50:4444',
    tunnel_peer: '192.168.1.120:49212',
    via_exploit: 'exploit/windows/smb/ms17_010_eternalblue',
    via_payload: 'payload/windows/x64/meterpreter/reverse_tcp',
    desc: 'Meterpreter session x64',
    info: 'NT AUTHORITY\\SYSTEM @ LAB-DC01 (Windows Server 2016)',
    workspace: 'lab_audit',
    session_host: '192.168.1.120',
    session_port: 445,
    username: 'NT AUTHORITY\\SYSTEM',
    uuid: 'a8d29bf1-e402-4a0b-932d-1149e9cb6501',
  },
  '2': {
    id: 2,
    type: 'shell',
    tunnel_local: '192.168.1.50:443',
    tunnel_peer: '192.168.1.185:58102',
    via_exploit: 'exploit/multi/http/apache_drupal_rce',
    via_payload: 'payload/linux/x64/shell/reverse_tcp',
    desc: 'Linux Command Shell',
    info: 'www-data @ web-staging (Ubuntu 20.04 LTS)',
    workspace: 'lab_audit',
    session_host: '192.168.1.185',
    session_port: 80,
    username: 'www-data',
    uuid: '710eec33-559d-4340-9a3d-4c5539ab426e',
  },
};

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { host, user = 'msf', pass, simulate } = body;

    const msfHost = host || process.env.MSFHOST;
    const msfPass = pass || process.env.MSFPASS;
    const msfUser = user || 'msf';

    if (simulate || !msfHost || msfHost === 'lab-demo') {
      return NextResponse.json({
        sessions: LAB_SIMULATED_SESSIONS,
        count: Object.keys(LAB_SIMULATED_SESSIONS).length,
        _simulated: true,
        message: 'Conexión a entorno de laboratorio simulado activa. Mostrando sesiones de auditoría.',
      });
    }

    if (!msfPass) {
      return NextResponse.json(
        { error: 'Falta la contraseña de Metasploit RPC (MSFPASS). Proporciónala o usa el modo simulado.' },
        { status: 400 }
      );
    }

    // Attempt real MSF RPC connection via MessagePack
    const apiUrl = msfHost.startsWith('http') ? `${msfHost}/api` : `http://${msfHost}/api`;

    // Step 1: auth.login
    const loginPayload = encode(['auth.login', msfUser, msfPass]);

    const loginRes = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'binary/message-pack',
      },
      body: loginPayload,
      signal: AbortSignal.timeout(15000),
    });

    if (!loginRes.ok) {
      return NextResponse.json(
        { error: `Metasploit HTTP ${loginRes.status}: ${loginRes.statusText}` },
        { status: loginRes.status }
      );
    }

    const loginBuffer = await loginRes.arrayBuffer();
    const loginData = decode(new Uint8Array(loginBuffer)) as Record<string, unknown>;

    if (loginData.error) {
      return NextResponse.json(
        { error: `Fallo de autenticación RPC: ${String(loginData.error_message || 'Credenciales inválidas')}` },
        { status: 401 }
      );
    }

    const token = loginData.token as string;
    if (!token) {
      return NextResponse.json({ error: 'Token de sesión vacío retornado por MSF RPC' }, { status: 500 });
    }

    // Step 2: session.list
    const listPayload = encode(['session.list', token]);
    const listRes = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'binary/message-pack',
      },
      body: listPayload,
      signal: AbortSignal.timeout(15000),
    });

    if (!listRes.ok) {
      return NextResponse.json(
        { error: `Error en session.list HTTP ${listRes.status}` },
        { status: listRes.status }
      );
    }

    const listBuffer = await listRes.arrayBuffer();
    const sessionsMap = decode(new Uint8Array(listBuffer)) as Record<string, MsfSession>;

    return NextResponse.json({
      sessions: sessionsMap || {},
      count: Object.keys(sessionsMap || {}).length,
      _simulated: false,
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      {
        error: `No se pudo conectar al demonio msfrpcd (${errorMsg}). Puedes activar el 'Modo Laboratorio Simulado' para probar la interfaz y el formato de datos sin un servidor RPC activo.`,
        fallback_available: true,
      },
      { status: 500 }
    );
  }
}
