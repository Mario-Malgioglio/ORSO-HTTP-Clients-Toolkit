# 🛡️ ORSO · HTTP Clients Security Toolkit

[![Go](https://img.shields.io/badge/Go-1.22+-00ADD8?style=flat&logo=go&logoColor=white)](https://go.dev/)
[![Next.js](https://img.shields.io/badge/Next.js-15.4-black?style=flat&logo=next.js&logoColor=white)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178C6?style=flat&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-v4-38bdf8?style=flat&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Security Auditing](https://img.shields.io/badge/Security-OSINT%20%26%20Forensics-red.svg)](#)

> **ORSO** es una suite completa de auditoría, reconocimiento y análisis de seguridad para clientes HTTP, inspirada en las técnicas ofensivas y defensivas del **Capítulo 3 de *Black Hat Go*** (*HTTP Clients and Remote Server Interaction*, No Starch Press).
>
> Proporciona una arquitectura dual: una **aplicación web moderna fullstack** (Next.js 15, TypeScript y Tailwind CSS) y un **binario CLI nativo y autocontenido** escrito en **Go estándar (`main.go`)**.

---

## 📑 Tabla de Contenidos

- [Visión General](#-visión-general)
- [Arquitectura Dual](#-arquitectura-dual)
- [Módulos del Sistema](#-módulos-del-sistema)
  - [1. Cliente HTTP Genérico (`net/http`)](#1-cliente-http-genérico-nethttp)
  - [2. Reconocimiento OSINT con Shodan API](#2-reconocimiento-osint-con-shodan-api)
  - [3. Monitor de Sesiones Metasploit RPC (`msfrpcd`)](#3-monitor-de-sesiones-metasploit-rpc-msfrpcd)
  - [4. Extractor Forense de Metadatos y Auditoría OPSEC](#4-extractor-forense-de-metadatos-y-auditoría-opsec)
- [Uso en Consola CLI con Go (`main.go`)](#-uso-en-consola-cli-con-go-maingo)
- [Uso e Instalación del Dashboard Web (Next.js)](#-uso-e-instalación-del-dashboard-web-nextjs)
- [Capacidades Forenses y Formatos Soportados](#-capacidades-forenses-y-formatos-soportados)
- [Exportación y Descargas](#-exportación-y-descargas)
- [Estructura del Repositorio](#-estructura-del-repositorio)
- [Variables de Entorno](#-variables-de-entorno)
- [Aviso de Responsabilidad y Ética](#-aviso-de-responsabilidad-y-ética)
- [Licencia](#-licencia)

---

## 🧭 Visión General

El Capítulo 3 de *Black Hat Go* aborda cómo los atacantes y auditores de seguridad aprovechan los clientes HTTP para interactuar programáticamente con servicios remotos: desde el consumo de APIs de inteligencia sobre amenazas (como Shodan), pasando por la orquestación remota de frameworks de explotación (Metasploit RPC mediante MessagePack), hasta la recolección pasiva de inteligencia mediante dorks y análisis forense de metadatos en documentos corporativos (OpenXML y PDF).

**ORSO** reúne todas estas herramientas bajo un ecosistema cohesionado y visual, ideal para:
- **Pruebas de penetración (Red Team)** y recolección de inteligencia OSINT.
- **Auditoría forense y de fuga de datos (OPSEC)** en documentos públicos.
- **Laboratorios de formación en ciberseguridad** para comprender protocolos binarios como MessagePack y estructuras internas de empaquetado Office OpenXML.
- **Diagnóstico y depuración de APIs HTTP** con inspección temporal de latencia y encabezados.

---

## ⚡ Arquitectura Dual

ORSO ha sido diseñado para funcionar de dos formas complementarias:

| Dimensión | 🌐 Dashboard Web Fullstack | 🐹 Binario CLI Nativo Go (`main.go`) |
| :--- | :--- | :--- |
| **Entorno** | Navegador web moderno (Desktop y Mobile) | Consola de terminal (Linux, macOS, Windows) |
| **Tecnología** | Next.js 15 (App Router), React 19, TypeScript | Go (Golang 1.22+) sin dependencias externas |
| **Estilo Visual** | Interfaz terminal oscura (`#0d1117`), Tailwind CSS v4, Lucide Icons | Salida en consola con formato enriquecido y colores ANSI |
| **Extracción** | Descompresión en memoria con `JSZip` y analizador XML | Analizador ZIP nativo (`archive/zip`) y `encoding/xml` |
| **Mensajería RPC** | `@msgpack/msgpack` | Encoder / Decoder MessagePack propio en Go puro |
| **Despliegue** | Cloud Run, Docker, Vercel, Node.js local | Compilación en ejecutable binario único o `go run` |
| **Modo Offline** | Sandbox educativo integrado para Shodan y Metasploit | Flags `-demo` y servidor web embebido (`main.go serve`) |

---

## 🎯 Módulos del Sistema

### 1. Cliente HTTP Genérico (`net/http`)
Diseñado para la inspección precisa y manipulación de peticiones HTTP en auditorías de seguridad:
- **Métodos Soportados**: `GET`, `POST`, `PUT`, `DELETE`, `HEAD`, `PATCH` y `OPTIONS`.
- **Gestión de Encabezados**: Inyección y edición de cabeceras personalizadas (`User-Agent`, `Authorization`, `X-Forwarded-For`, etc.).
- **Editor de Carga Útil (Payload)**: Editor de cuerpo con formateo y validación de JSON en tiempo real.
- **Métricas de Rendimiento**: Medición de latencia de red en milisegundos (`ms`), códigos de estado HTTP tipados y tamaño exacto en bytes.
- **Generador de cURL**: Exportación inmediata de cualquier petición configurada a un comando de terminal listo para copiar.
- **Presets de Prueba Integrados**: Atajos para inspeccionar `robots.txt`, APIs REST públicas y payloads JSON interactivos.

### 2. Reconocimiento OSINT con Shodan API
Integración directa con el motor de búsqueda para dispositivos conectados a Internet:
- **Auditoría de Suscripción (`/api-info`)**: Consulta en tiempo real de créditos de búsqueda, créditos de escaneo, límites de consulta y plan contratado.
- **Búsqueda Filtrada de Hosts (`/shodan/host/search`)**: Ejecución de queries especializadas (ej. `apache`, `nginx`, `port:22`, `country:ES`, `product:OpenSSH`).
- **Tarjetas Forenses de Hosts**:
  - Dirección IP pública y puertos de red expuestos.
  - Sistema Autónomo (ASN), Organización e ISP registrado.
  - Ubicación geográfica (Ciudad, País, Código ISO y coordenadas).
  - Banners de servicios remotos capturados en los puertos activos.
- **Modo Sandbox / Laboratorio**: Permite explorar resultados realistas sin consumir créditos ni requerir una API Key de Shodan.

### 3. Monitor de Sesiones Metasploit RPC (`msfrpcd`)
Cliente nativo para el protocolo binario **MessagePack** empleado por el demonio RPC de Metasploit:
- **Autenticación `auth.login`**: Intercambio de credenciales y adquisición de tokens temporales de sesión.
- **Inspección de Sesiones (`session.list`)**: Monitoreo de hosts comprometidos en el laboratorio de pruebas:
  - Tipo de sesión (`meterpreter`, `shell`).
  - Túnel de conexión (dirección IP y puerto local vs. remoto).
  - Módulo de exploit y payload desplegados.
  - Contexto de usuario detectado (`NT AUTHORITY\SYSTEM`, `root`, cuentas sin privilegios).
- **Modo Laboratorio Simulado**: Entorno educativo que emula la respuesta de un demonio `msfrpcd` para prácticas y demostraciones sin infraestructura previa.

### 4. Extractor Forense de Metadatos y Auditoría OPSEC
Motor forense para la recolección pasiva de información oculta en documentos corporativos:
- **Content Sniffing Binario**: Detección automática por firmas mágicas (`PK\x03\x04` para Office OpenXML y `%PDF-` para Adobe PDF).
- **Análisis de Microsoft Office Open XML (`.docx`, `.xlsx`, `.pptx`)**:
  - Desempaquetado del contenedor ZIP en memoria.
  - Lectura de propiedades Dublin Core en `docProps/core.xml`: título, creador, último editor y fechas de modificación.
  - Lectura de propiedades de aplicación en `docProps/app.xml`: empresa, software generador y versión de Office.
  - Mapeo de versiones obsoletas o vulnerables (Office 2003, 2007, 2010, 2013, 2016/365).
- **Análisis de Adobe PDF**: Búsqueda forense de campos en diccionarios de información (`/Author`, `/Title`, `/Creator`, `/Producer`).
- **Canales de Ingesta**:
  - *Bing Dorking Automático*: Recolección con operadores `site:dominio filetype:ext`.
  - *Descarga por URL Directa*: Análisis remoto seguro.
  - *Carga Local*: Soporte Drag & Drop y selector de archivos.
  - *Generador de Muestras*: Creación de documentos sintéticos con fugas simuladas para validación.
- **Auditoría de Riesgos OPSEC**: Detección de cuentas internas corporativas (`CORP\usuario`, `admin`), rutas locales y suites ofimáticas vulnerables a exploits (ej. CVE-2017-11882).

---

## 🐹 Uso en Consola CLI con Go (`main.go`)

El archivo **`main.go`** contiene la implementación completa y autónoma en **Go estándar**. No requiere dependencias de terceros (`go get`), únicamente una instalación de Go 1.22+.

### Ayuda General
```bash
go run main.go
```

### 1. Cliente HTTP
```bash
# Petición GET básica con encabezados detallados
go run main.go http -X GET -u https://httpbin.org/get -v

# Petición POST con cuerpo JSON y encabezado personalizado
go run main.go http -X POST -u https://httpbin.org/post -d '{"equipo":"redteam","id":42}' -H "Authorization: Bearer token123"

# Ignorar certificados SSL inválidos (-k) y definir tiempo de espera (-t segundos)
go run main.go http -X GET -u https://servidor-interno.local -k -t 5
```

### 2. Reconocimiento Shodan
```bash
# Configurar API Key
export SHODAN_API_KEY="tu_clave_shodan"

# Consultar créditos y estado de suscripción
go run main.go shodan info

# Buscar hosts por filtro con límite de resultados
go run main.go shodan search -q "apache country:ES" -limit 5

# Consultar información detallada de una IP
go run main.go shodan ip -ip 8.8.8.8
```

### 3. Metasploit RPC
```bash
# Modo laboratorio didáctico simulado (sin requerir msfrpcd activo)
go run main.go msf -demo

# Conectar a un demonio msfrpcd real
go run main.go msf -h 192.168.1.50 -p 55553 -u msf -P miPassword -ssl
```

### 4. Extractor Forense de Metadatos
```bash
# Analizar archivo local y exportar reportes en JSON y CSV
go run main.go metadata -f balance_financiero.docx --export-json reporte.json --export-csv reporte.csv

# Descargar y analizar documento remoto desde URL
go run main.go metadata -u https://ejemplo.com/documento_confidencial.pdf

# Realizar Bing Dorking en un dominio objetivo
go run main.go metadata -d nytimes.com -ext docx
```

### 5. Servidor Web Embebido en Go
```bash
# Iniciar servidor web local en el puerto deseado
go run main.go serve -port 8080
# Accede desde tu navegador en http://localhost:8080
```

---

## 🚀 Uso e Instalación del Dashboard Web (Next.js)

### Prerrequisitos
- **Node.js**: `20.x` o superior.
- **npm**, **pnpm** o **bun**.

### Pasos de Instalación

1. **Clonar el repositorio:**
   ```bash
   git clone https://github.com/tu-usuario/orso-security-toolkit.git
   cd orso-security-toolkit
   ```

2. **Instalar dependencias:**
   ```bash
   npm install
   ```

3. **Configurar variables de entorno (opcional):**
   ```bash
   cp .env.example .env.local
   ```

4. **Ejecutar en modo de desarrollo:**
   ```bash
   npm run dev
   ```
   Abre [http://localhost:3000](http://localhost:3000) en el navegador.

5. **Compilar y ejecutar en producción:**
   ```bash
   npm run build
   npm run start
   ```

---

## 🔍 Capacidades Forenses y Formatos Soportados

| Formato | Firma Binaria (Magic Bytes) | Estructura Analizada | Metadatos Extraídos |
| :--- | :--- | :--- | :--- |
| **DOCX** | `50 4B 03 04` (`PK\x03\x04`) | `docProps/core.xml`<br>`docProps/app.xml` | Creador, Modificador, Título, Empresa, Versión Office, Fecha de Creación y Modificación |
| **XLSX** | `50 4B 03 04` (`PK\x03\x04`) | `docProps/core.xml`<br>`docProps/app.xml` | Autor, Última modificación, Compañía registrada, Generador de hoja de cálculo |
| **PPTX** | `50 4B 03 04` (`PK\x03\x04`) | `docProps/core.xml`<br>`docProps/app.xml` | Creador de la presentación, Organización, Suite ofimática emisora |
| **PDF** | `25 50 44 46` (`%PDF-`) | Diccionario `/Info` | `/Author`, `/Title`, `/Creator`, `/Producer`, Software de conversión |
| **TXT / Raw** | Detección MIME | Buffer UTF-8 / ASCII | Vista previa forense de contenido y conteo de caracteres |

---

## 💾 Exportación y Descargas

El extractor de metadatos de ORSO cuenta con un sistema integral de exportación forense:

1. **Descargar CSV (`.csv`)**:
   - Genera una hoja de cálculo estructurada compatible con Microsoft Excel, LibreOffice Calc y Google Sheets.
   - Columnas incluidas: `ID`, `Origen_o_URL`, `Tipo_Archivo`, `Titulo`, `Autor_Creador`, `Modificado_Por`, `Empresa`, `Aplicacion_Generadora`, `Version_Office`, `Tamano_Bytes`, `Riesgos_OPSEC`, `Error`.
2. **Descargar JSON (`.json`)**:
   - Estructura completa de objetos analizados, lista para su consumo en scripts de Python, pipelines de SIEM o bases de datos de amenazas.
3. **Descargar Informe TXT (`.txt`)**:
   - Reporte formateado en texto plano con cabecera de auditoría, marcas de tiempo, ficha técnica por archivo y sección de alertas OPSEC detectadas.
4. **Descargas Individuales**:
   - Botones rápidos de descarga en formato **JSON** y **Ficha TXT** disponibles en cada fila de la tabla de resultados y en el inspector de detalle.

---

## 📁 Estructura del Repositorio

```text
├── main.go                       # Aplicación autónoma en Go (CLI + Web Server)
├── README.md                     # Documentación exhaustiva del proyecto
├── metadata.json                 # Metadatos de la aplicación
├── package.json                  # Dependencias y scripts de Next.js
├── tsconfig.json                 # Configuración de TypeScript
├── app/
│   ├── layout.tsx                # Layout principal, fuentes y etiquetas meta
│   ├── page.tsx                  # Dashboard principal y selector de módulos
│   ├── globals.css               # Estilos globales y utilidades Tailwind CSS v4
│   └── api/                      # Rutas de backend en Next.js
│       ├── http/route.ts         # Proxy de peticiones HTTP con medición de latencia
│       ├── shodan/route.ts       # Proxy de consultas a Shodan API
│       ├── metasploit/route.ts   # Conector MessagePack para Metasploit RPC
│       ├── metadata/extract/     # Extractor de metadatos desde URLs remotas
│       └── bing/metadata/        # Recolector pasivo vía Bing Dorking
├── components/
│   ├── Header.tsx                # Barra de navegación superior con títulos de ORSO
│   ├── HttpGenericTab.tsx        # Módulo de cliente HTTP genérico y generador cURL
│   ├── ShodanTab.tsx             # Módulo de reconocimiento OSINT con Shodan
│   ├── MetasploitTab.tsx         # Módulo de monitoreo de sesiones Metasploit RPC
│   ├── MetadataExtractorTab.tsx  # Extractor de metadatos, tabla y exportador CSV/JSON/TXT
│   └── TechnicalGuideModal.tsx   # Modal interactivo con conceptos clave de Black Hat Go
└── lib/
    ├── metadata-extractor.ts     # Motor forense para descompresión OpenXML y PDF
    ├── metasploit-client.ts      # Cliente y codificador binario MessagePack
    ├── shodan-client.ts          # Tipos y llamadas de API para Shodan
    └── utils.ts                  # Helpers generales de formato y Tailwind
```

---

## 🔑 Variables de Entorno

Puedes configurar las siguientes variables en un archivo `.env.local`:

```env
# Clave de API de Shodan (Opcional si usas el modo Sandbox en la UI)
SHODAN_API_KEY=tu_api_key_de_shodan

# Clave de Google Gemini (Opcional, reservada para funciones asistidas de IA)
GEMINI_API_KEY=tu_api_key_de_gemini

# URL base para resolución de callbacks o entornos de despliegue
APP_URL=http://localhost:3000
```

---

## ⚖️ Aviso de Responsabilidad y Ética

> [!WARNING]
> **ORSO** ha sido desarrollado exclusivamente con fines **educativos, de investigación académica y para auditorías de seguridad autorizadas** bajo mutuo acuerdo.
>
> El uso de herramientas de escaneo de puertos, recopilación de información de infraestructura externa o interacción con servicios RPC sin autorización expresa puede violar normativas locales e internacionales de ciberseguridad. Los autores no se responsabilizan por el uso indebido de las técnicas y programas aquí expuestos.

---

## 📜 Licencia

Este proyecto se encuentra bajo la licencia **MIT**. Para más detalles, consulta el archivo `LICENSE` si está presente en el repositorio.

