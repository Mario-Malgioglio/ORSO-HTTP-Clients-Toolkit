import { NextRequest, NextResponse } from 'next/server';
import { parseDocMetadata, DocMetadata } from '@/lib/metadata-extractor';

export async function POST(req: NextRequest) {
  try {
    const { domain, filetype = 'docx' } = await req.json();

    if (!domain) {
      return NextResponse.json({ error: 'Dominio no especificado' }, { status: 400 });
    }

    const cleanDomain = domain.replace(/^https?:\/\//, '').replace(/\/.*$/, '').trim();
    const query = `site:${cleanDomain} filetype:${filetype}`;
    const searchUrl = `https://www.bing.com/search?q=${encodeURIComponent(query)}`;

    let urlsToFetch: string[] = [];

    try {
      const bingRes = await fetch(searchUrl, {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36',
          'Accept-Language': 'en-US,en;q=0.9',
          Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        },
        signal: AbortSignal.timeout(12000),
      });

      if (bingRes.ok) {
        const html = await bingRes.text();
        // Extract links with regex
        const hrefRegex = /<a[^>]+href="(https?:\/\/[^"'\s>]+)"[^>]*>/gi;
        let match;
        const seen = new Set<string>();

        while ((match = hrefRegex.exec(html)) !== null) {
          const link = match[1];
          // Check if link matches domain and file extension
          if (
            link.includes(cleanDomain) &&
            link.toLowerCase().includes(`.${filetype.toLowerCase()}`) &&
            !link.includes('bing.com') &&
            !link.includes('microsoft.com') &&
            !seen.has(link)
          ) {
            seen.add(link);
            urlsToFetch.push(link);
            if (urlsToFetch.length >= 5) break;
          }
        }
      }
    } catch {
      // Bing scrape attempt caught
    }

    const results: DocMetadata[] = [];

    // If URLs were found via search, fetch and extract their metadata
    if (urlsToFetch.length > 0) {
      for (const docUrl of urlsToFetch) {
        try {
          const docRes = await fetch(docUrl, {
            headers: {
              'User-Agent': 'GoHTTP-Client/1.0 (ORSO-Toolkit)',
            },
            signal: AbortSignal.timeout(15000),
          });

          if (!docRes.ok) {
            results.push({
              url: docUrl,
              file_type: 'unknown',
              size: 0,
              error: `HTTP ${docRes.status} ${docRes.statusText}`,
            });
            continue;
          }

          const arrayBuf = await docRes.arrayBuffer();
          const uint8 = new Uint8Array(arrayBuf);
          const meta = await parseDocMetadata(uint8, docUrl, true);
          results.push(meta);
        } catch (fetchErr: unknown) {
          const msg = fetchErr instanceof Error ? fetchErr.message : String(fetchErr);
          results.push({
            url: docUrl,
            file_type: 'unknown',
            size: 0,
            error: `Error de descarga: ${msg}`,
          });
        }
      }
    }

    return NextResponse.json({
      query,
      domain: cleanDomain,
      filetype,
      count: results.length,
      results,
      dork_url: `https://www.google.com/search?q=${encodeURIComponent(query)}`,
      bing_search_url: searchUrl,
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: `Error en búsqueda Bing: ${errorMsg}` }, { status: 500 });
  }
}
