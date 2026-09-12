import type {Metadata} from 'next';
import './globals.css'; // Global styles

export const metadata: Metadata = {
  title: 'HTTP Clients Security Toolkit · ORSO',
  description: 'Toolkit de auditoría y clientes HTTP inspirado en Black Hat Go Cap. 3: Cliente HTTP interactivo, reconocimiento con Shodan, monitor Metasploit RPC y extractor de metadatos de documentos.',
  openGraph: {
    title: 'HTTP Clients Security Toolkit · ORSO',
    description: 'Toolkit de auditoría y clientes HTTP inspirado en Black Hat Go Cap. 3: Cliente HTTP interactivo, reconocimiento con Shodan, monitor Metasploit RPC y extractor de metadatos de documentos.',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'HTTP Clients Security Toolkit · ORSO',
    description: 'Toolkit de auditoría y clientes HTTP inspirado en Black Hat Go Cap. 3: Cliente HTTP interactivo, reconocimiento con Shodan, monitor Metasploit RPC y extractor de metadatos de documentos.',
  },
};

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="en">
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
