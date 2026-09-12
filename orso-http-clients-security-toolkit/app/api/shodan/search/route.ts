import { NextRequest, NextResponse } from 'next/server';

const SIMULATED_HOSTS = [
  {
    ip_str: '198.51.100.45',
    ip: 3325256749,
    port: 80,
    os: 'Linux 5.4.0 (Ubuntu)',
    timestamp: new Date().toISOString(),
    isp: 'Cloud Network Services Europe',
    asn: 'AS16276',
    org: 'Enterprise Web Solutions',
    hostnames: ['web-frontend-01.corp-portal.com'],
    domains: ['corp-portal.com'],
    location: {
      city: 'Madrid',
      region_code: 'MD',
      area_code: 34,
      country_code: 'ES',
      country_name: 'Spain',
      latitude: 40.4168,
      longitude: -3.7038,
      postal_code: '28001',
    },
    data: 'HTTP/1.1 200 OK\r\nServer: Apache/2.4.41 (Ubuntu)\r\nContent-Type: text/html; charset=UTF-8\r\nX-Powered-By: PHP/7.4.3\r\nConnection: keep-alive',
  },
  {
    ip_str: '203.0.113.88',
    ip: 3405803864,
    port: 443,
    os: 'FreeBSD 13.0',
    timestamp: new Date().toISOString(),
    isp: 'Akamai Global CDN',
    asn: 'AS20940',
    org: 'Global CDN Node',
    hostnames: ['edge-cache-lon.fastedge.net'],
    domains: ['fastedge.net'],
    location: {
      city: 'London',
      region_code: 'ENG',
      area_code: 44,
      country_code: 'GB',
      country_name: 'United Kingdom',
      latitude: 51.5074,
      longitude: -0.1278,
      postal_code: 'EC1A',
    },
    data: 'HTTP/1.1 200 OK\r\nServer: nginx/1.18.0\r\nStrict-Transport-Security: max-age=31536000\r\nContent-Security-Policy: default-src \'self\'',
  },
  {
    ip_str: '192.0.2.142',
    ip: 3221226126,
    port: 22,
    os: 'Linux 4.19 (Debian)',
    timestamp: new Date().toISOString(),
    isp: 'DigitalOcean, LLC',
    asn: 'AS14061',
    org: 'Staging Infrastructure Corp',
    hostnames: ['bastion.infra.internal.net'],
    domains: ['internal.net'],
    location: {
      city: 'New York',
      region_code: 'NY',
      area_code: 212,
      country_code: 'US',
      country_name: 'United States',
      latitude: 40.7128,
      longitude: -74.006,
      postal_code: '10001',
    },
    data: 'SSH-2.0-OpenSSH_8.2p1 Ubuntu-4ubuntu0.5\r\nKey type: ssh-rsa\r\nFingerprint: SHA256:7uKj49xZ... OpenSSH banner detected',
  },
  {
    ip_str: '198.51.100.210',
    ip: 3325256914,
    port: 8080,
    os: 'Windows Server 2019',
    timestamp: new Date().toISOString(),
    isp: 'Amazon.com, Inc.',
    asn: 'AS16509',
    org: 'Finance Dept Proxy',
    hostnames: ['gateway.latam-finance.org'],
    domains: ['latam-finance.org'],
    location: {
      city: 'Buenos Aires',
      region_code: 'C',
      area_code: 54,
      country_code: 'AR',
      country_name: 'Argentina',
      latitude: -34.6037,
      longitude: -58.3816,
      postal_code: 'C1002',
    },
    data: 'HTTP/1.1 401 Unauthorized\r\nServer: Microsoft-IIS/10.0\r\nWWW-Authenticate: NTLM\r\nDate: Fri, 11 Sep 2026 18:30:00 GMT',
  },
];

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { api_key, query, simulate } = body;
    const key = api_key || process.env.SHODAN_API_KEY;

    if (!query) {
      return NextResponse.json({ error: 'Query de búsqueda vacía' }, { status: 400 });
    }

    if (simulate || key === 'demo' || !key) {
      // Filter simulated results or return all
      const qLower = query.toLowerCase();
      const filtered = SIMULATED_HOSTS.filter(
        h =>
          h.data.toLowerCase().includes(qLower) ||
          h.os.toLowerCase().includes(qLower) ||
          h.org.toLowerCase().includes(qLower) ||
          h.location.country_name.toLowerCase().includes(qLower) ||
          h.port.toString().includes(qLower) ||
          h.ip_str.includes(qLower)
      );

      return NextResponse.json({
        total: filtered.length > 0 ? filtered.length : SIMULATED_HOSTS.length,
        matches: filtered.length > 0 ? filtered : SIMULATED_HOSTS,
        _simulated: true,
      });
    }

    const res = await fetch(
      `https://api.shodan.io/shodan/host/search?key=${encodeURIComponent(key)}&query=${encodeURIComponent(query)}`,
      {
        headers: { Accept: 'application/json' },
      }
    );

    if (!res.ok) {
      const errText = await res.text();
      return NextResponse.json(
        { error: `Shodan HTTP ${res.status}: ${errText || res.statusText}` },
        { status: res.status }
      );
    }

    const data = await res.json();
    return NextResponse.json({
      total: data.total || 0,
      matches: data.matches || [],
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { error: `Error en búsqueda Shodan: ${errorMsg}` },
      { status: 500 }
    );
  }
}
