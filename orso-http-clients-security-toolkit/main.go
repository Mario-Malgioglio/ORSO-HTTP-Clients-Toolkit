package main

/*
   ORSO · HTTP Clients Security Toolkit
   Inspired by Black Hat Go (Chapter 3: HTTP Clients & Remote Server Interaction)

   Features:
   1. Generic HTTP Client (Custom methods, headers, payload, latency timing, TLS)
   2. Shodan API Client (Subscription info, host search, IP lookup)
   3. Metasploit RPC Client (MessagePack protocol, auth.login, session.list)
   4. Forensic Metadata Extractor (OpenXML docProps/core.xml, app.xml, PDF, Bing Dorking, OPSEC analysis, CSV/JSON export)
   5. Built-in Embedded Web Server (CLI + Web UI in a single binary)

   Usage:
     go run main.go [command] [options]

   Commands:
     http       Make custom HTTP request with timing and inspection
     shodan     Query Shodan API for subscription info or host reconnaissance
     msf        Interact with Metasploit msfrpcd daemon to list active sessions
     metadata   Extract metadata from documents (.docx, .xlsx, .pdf) or Bing dorking
     serve      Launch built-in local web interface on port 8080
*/

import (
	"archive/zip"
	"bytes"
	"context"
	"crypto/tls"
	"encoding/binary"
	"encoding/csv"
	"encoding/json"
	"encoding/xml"
	"flag"
	"fmt"
	"io"
	"math"
	"net"
	"net/http"
	"net/url"
	"os"
	"path/filepath"
	"regexp"
	"sort"
	"strconv"
	"strings"
	"time"
)

// ============================================================================
// ANSI Terminal Colors & Banner
// ============================================================================

const (
	colorReset  = "\033[0m"
	colorRed    = "\033[31m"
	colorGreen  = "\033[32m"
	colorYellow = "\033[33m"
	colorBlue   = "\033[34m"
	colorPurple = "\033[35m"
	colorCyan   = "\033[36m"
	colorGray   = "\033[90m"
	colorBold   = "\033[1m"
)

const banner = `
` + colorCyan + `  ██████╗ ██████╗ ███████╗ ██████╗ ` + colorReset + `
` + colorCyan + ` ██╔═══██╗██╔══██╗██╔════╝██╔═══██╗` + colorReset + `
` + colorCyan + ` ██║   ██║██████╔╝███████╗██║   ██║` + colorReset + `
` + colorCyan + ` ██║   ██║██╔══██╗╚════██║██║   ██║` + colorReset + `
` + colorCyan + ` ╚██████╔╝██║  ██║███████║╚██████╔╝` + colorReset + `
` + colorCyan + `  ╚═════╝ ╚═╝  ╚═╝╚══════╝ ╚═════╝ ` + colorReset + `
  ` + colorBold + `ORSO · HTTP Clients Security Toolkit` + colorReset + `
  ` + colorGray + `Based on Black Hat Go (Ch. 3) · Standalone Go Application` + colorReset + `
`

func printBanner() {
	fmt.Println(banner)
}

// ============================================================================
// 1. Generic HTTP Client Module
// ============================================================================

type headerSlice []string

func (h *headerSlice) String() string {
	return strings.Join(*h, ", ")
}

func (h *headerSlice) Set(val string) error {
	*h = append(*h, val)
	return nil
}

func runHTTPClient(args []string) {
	fs := flag.NewFlagSet("http", flag.ExitOnError)
	method := fs.String("X", "GET", "HTTP Method (GET, POST, PUT, DELETE, HEAD, PATCH, OPTIONS)")
	targetURL := fs.String("u", "", "Target URL (e.g., https://httpbin.org/get)")
	data := fs.String("d", "", "HTTP Request Body payload")
	timeoutSec := fs.Int("t", 15, "Timeout in seconds")
	insecure := fs.Bool("k", false, "Allow insecure TLS certificates")
	verbose := fs.Bool("v", false, "Verbose output (show request and response headers)")
	var headers headerSlice
	fs.Var(&headers, "H", "Custom Header (format: 'Key: Value'). Can be repeated.")

	fs.Parse(args)

	if *targetURL == "" {
		fmt.Printf("%s[!] Error: Se requiere la URL de destino (-u https://...)%s\n\n", colorRed, colorReset)
		fs.Usage()
		return
	}

	client := &http.Client{
		Timeout: time.Duration(*timeoutSec) * time.Second,
		Transport: &http.Transport{
			TLSClientConfig: &tls.Config{InsecureSkipVerify: *insecure},
		},
	}

	var reqBody io.Reader
	if *data != "" {
		reqBody = strings.NewReader(*data)
	}

	req, err := http.NewRequest(strings.ToUpper(*method), *targetURL, reqBody)
	if err != nil {
		fmt.Printf("%s[!] Error creando solicitud: %v%s\n", colorRed, err, colorReset)
		return
	}

	req.Header.Set("User-Agent", "GoHTTP-Client/1.0 (ORSO-Toolkit)")
	for _, h := range headers {
		parts := strings.SplitN(h, ":", 2)
		if len(parts) == 2 {
			req.Header.Set(strings.TrimSpace(parts[0]), strings.TrimSpace(parts[1]))
		}
	}

	fmt.Printf("%s[*] Enviando solicitud: %s %s%s\n", colorCyan, req.Method, req.URL.String(), colorReset)
	if *verbose {
		fmt.Printf("%s--- Request Headers ---%s\n", colorGray, colorReset)
		for k, v := range req.Header {
			fmt.Printf("  %s: %s\n", k, strings.Join(v, ", "))
		}
	}

	start := time.Now()
	resp, err := client.Do(req)
	duration := time.Since(start)

	if err != nil {
		fmt.Printf("%s[!] Fallo en la solicitud: %v%s\n", colorRed, err, colorReset)
		return
	}
	defer resp.Body.Close()

	bodyBytes, err := io.ReadAll(resp.Body)
	if err != nil {
		fmt.Printf("%s[!] Error leyendo cuerpo de respuesta: %v%s\n", colorRed, err, colorReset)
		return
	}

	// Status color
	statusColor := colorGreen
	if resp.StatusCode >= 400 && resp.StatusCode < 500 {
		statusColor = colorYellow
	} else if resp.StatusCode >= 500 {
		statusColor = colorRed
	}

	fmt.Println()
	fmt.Printf("%s╔═══════════════════════════════════════════════════════════╗%s\n", colorGray, colorReset)
	fmt.Printf("  %sCódigo de Estado:%s %s%s%s\n", colorBold, colorReset, statusColor, resp.Status, colorReset)
	fmt.Printf("  %sLatencia / Tiempo:%s %s%d ms%s\n", colorBold, colorReset, colorCyan, duration.Milliseconds(), colorReset)
	fmt.Printf("  %sTamaño Respuesta:%s %d bytes (%.2f KB)\n", colorBold, colorReset, len(bodyBytes), float64(len(bodyBytes))/1024.0)
	fmt.Printf("%s╚═══════════════════════════════════════════════════════════╝%s\n", colorGray, colorReset)

	if *verbose || len(resp.Header) > 0 {
		fmt.Printf("\n%s--- Response Headers ---%s\n", colorGray, colorReset)
		var keys []string
		for k := range resp.Header {
			keys = append(keys, k)
		}
		sort.Strings(keys)
		for _, k := range keys {
			fmt.Printf("  %s%s:%s %s\n", colorBold, k, colorReset, strings.Join(resp.Header[k], ", "))
		}
	}

	fmt.Printf("\n%s--- Response Body (primeros 2048 bytes) ---%s\n", colorGray, colorReset)
	limit := len(bodyBytes)
	if limit > 2048 {
		limit = 2048
	}
	fmt.Println(string(bodyBytes[:limit]))
	if len(bodyBytes) > 2048 {
		fmt.Printf("%s... [truncado, total %d bytes]%s\n", colorGray, len(bodyBytes), colorReset)
	}
}

// ============================================================================
// 2. Shodan API Client Module
// ============================================================================

type ShodanAPIInfo struct {
	ScanCredits  int    `json:"scan_credits"`
	UsageLimits  any    `json:"usage_limits"`
	Plan         string `json:"plan"`
	HTTPS        bool   `json:"https"`
	Unlocked     bool   `json:"unlocked"`
	QueryCredits int    `json:"query_credits"`
	MonitoredIPs int    `json:"monitored_ips"`
	UnlockedLeft int    `json:"unlocked_left"`
	Telnet       bool   `json:"telnet"`
}

type ShodanHostLocation struct {
	City        string  `json:"city"`
	RegionCode  string  `json:"region_code"`
	CountryName string  `json:"country_name"`
	CountryCode string  `json:"country_code"`
	Latitude    float64 `json:"latitude"`
	Longitude   float64 `json:"longitude"`
}

type ShodanHostMatch struct {
	IPStr     string             `json:"ip_str"`
	Port      int                `json:"port"`
	Data      string             `json:"data"`
	ASN       string             `json:"asn"`
	ISP       string             `json:"isp"`
	Org       string             `json:"org"`
	Hostnames []string           `json:"hostnames"`
	Location  ShodanHostLocation `json:"location"`
	Timestamp string             `json:"timestamp"`
}

type ShodanSearchResult struct {
	Total   int               `json:"total"`
	Matches []ShodanHostMatch `json:"matches"`
}

func runShodanClient(args []string) {
	if len(args) < 1 {
		fmt.Printf("%s[!] Uso: main.go shodan <subcomando> [opciones]%s\n", colorYellow, colorReset)
		fmt.Println("  Subcomandos:")
		fmt.Println("    info    - Consulta información de suscripción y créditos")
		fmt.Println("    search  - Busca hosts por filtros o texto (ej. apache, port:22)")
		fmt.Println("    ip      - Inspecciona detalles de una IP específica")
		return
	}

	apiKey := os.Getenv("SHODAN_API_KEY")

	subcmd := args[0]
	fs := flag.NewFlagSet("shodan "+subcmd, flag.ExitOnError)
	keyFlag := fs.String("key", apiKey, "Clave de API de Shodan (o variable SHODAN_API_KEY)")
	queryFlag := fs.String("q", "apache", "Query de búsqueda para Shodan")
	ipFlag := fs.String("ip", "", "Dirección IP para consultar")
	limitFlag := fs.Int("limit", 10, "Límite de resultados a mostrar")
	fs.Parse(args[1:])

	key := *keyFlag
	if key == "" {
		fmt.Printf("%s[!] Error: Se requiere clave de API de Shodan (-key TU_KEY o export SHODAN_API_KEY)%s\n", colorRed, colorReset)
		return
	}

	client := &http.Client{Timeout: 15 * time.Second}

	switch subcmd {
	case "info":
		apiURL := fmt.Sprintf("https://api.shodan.io/api-info?key=%s", url.QueryEscape(key))
		resp, err := client.Get(apiURL)
		if err != nil {
			fmt.Printf("%s[!] Error consultando /api-info: %v%s\n", colorRed, err, colorReset)
			return
		}
		defer resp.Body.Close()

		if resp.StatusCode != http.StatusOK {
			b, _ := io.ReadAll(resp.Body)
			fmt.Printf("%s[!] Error de Shodan (%d): %s%s\n", colorRed, resp.StatusCode, string(b), colorReset)
			return
		}

		var info ShodanAPIInfo
		if err := json.NewDecoder(resp.Body).Decode(&info); err != nil {
			fmt.Printf("%s[!] Error decodificando respuesta: %v%s\n", colorRed, err, colorReset)
			return
		}

		fmt.Printf("\n%s=== Shodan API Subscription Info ===%s\n", colorBold, colorReset)
		fmt.Printf("  Plan            : %s%s%s\n", colorCyan, info.Plan, colorReset)
		fmt.Printf("  Query Credits   : %s%d%s\n", colorGreen, info.QueryCredits, colorReset)
		fmt.Printf("  Scan Credits    : %s%d%s\n", colorGreen, info.ScanCredits, colorReset)
		fmt.Printf("  Monitored IPs   : %d\n", info.MonitoredIPs)
		fmt.Printf("  Unlocked        : %t\n", info.Unlocked)

	case "search":
		apiURL := fmt.Sprintf("https://api.shodan.io/shodan/host/search?key=%s&query=%s", url.QueryEscape(key), url.QueryEscape(*queryFlag))
		fmt.Printf("%s[*] Buscando en Shodan: %s%s\n", colorCyan, *queryFlag, colorReset)

		resp, err := client.Get(apiURL)
		if err != nil {
			fmt.Printf("%s[!] Error en búsqueda: %v%s\n", colorRed, err, colorReset)
			return
		}
		defer resp.Body.Close()

		if resp.StatusCode != http.StatusOK {
			b, _ := io.ReadAll(resp.Body)
			fmt.Printf("%s[!] Error de Shodan (%d): %s%s\n", colorRed, resp.StatusCode, string(b), colorReset)
			return
		}

		var results ShodanSearchResult
		if err := json.NewDecoder(resp.Body).Decode(&results); err != nil {
			fmt.Printf("%s[!] Error decodificando JSON: %v%s\n", colorRed, err, colorReset)
			return
		}

		fmt.Printf("\n%s[+] Total de hosts encontrados: %d%s\n\n", colorGreen, results.Total, colorReset)
		count := 0
		for _, m := range results.Matches {
			count++
			if count > *limitFlag {
				break
			}
			location := fmt.Sprintf("%s, %s", m.Location.City, m.Location.CountryName)
			if m.Location.City == "" {
				location = m.Location.CountryName
			}
			fmt.Printf("%s[%d] %s:%d%s (%s)\n", colorBold, count, m.IPStr, m.Port, colorReset, location)
			fmt.Printf("    Org/ISP : %s / %s (ASN: %s)\n", m.Org, m.ISP, m.ASN)
			if len(m.Hostnames) > 0 {
				fmt.Printf("    Hosts   : %s\n", strings.Join(m.Hostnames, ", "))
			}
			bannerPreview := strings.ReplaceAll(strings.TrimSpace(m.Data), "\n", " ")
			if len(bannerPreview) > 90 {
				bannerPreview = bannerPreview[:90] + "..."
			}
			fmt.Printf("    Banner  : %s%s%s\n\n", colorGray, bannerPreview, colorReset)
		}

	case "ip":
		if *ipFlag == "" {
			fmt.Printf("%s[!] Error: Se requiere la IP a consultar (-ip 1.2.3.4)%s\n", colorRed, colorReset)
			return
		}
		apiURL := fmt.Sprintf("https://api.shodan.io/shodan/host/%s?key=%s", url.PathEscape(*ipFlag), url.QueryEscape(key))
		resp, err := client.Get(apiURL)
		if err != nil {
			fmt.Printf("%s[!] Error: %v%s\n", colorRed, err, colorReset)
			return
		}
		defer resp.Body.Close()

		body, _ := io.ReadAll(resp.Body)
		var pretty bytes.Buffer
		json.Indent(&pretty, body, "", "  ")
		fmt.Println(pretty.String())

	default:
		fmt.Printf("%s[!] Subcomando no reconocido: %s%s\n", colorRed, subcmd, colorReset)
	}
}

// ============================================================================
// 3. Metasploit RPC Client (msfrpcd & MessagePack)
// ============================================================================

// Lightweight MessagePack Encoder/Decoder for msfrpcd communication
type MsgPackEncoder struct {
	buf bytes.Buffer
}

func (e *MsgPackEncoder) Encode(v any) error {
	switch val := v.(type) {
	case nil:
		e.buf.WriteByte(0xc0)
	case bool:
		if val {
			e.buf.WriteByte(0xc3)
		} else {
			e.buf.WriteByte(0xc2)
		}
	case int:
		e.encodeInt(int64(val))
	case int64:
		e.encodeInt(val)
	case float64:
		e.buf.WriteByte(0xcb)
		binary.Write(&e.buf, binary.BigEndian, math.Float64bits(val))
	case string:
		e.encodeString(val)
	case []any:
		e.encodeSlice(val)
	case map[string]any:
		e.encodeMap(val)
	default:
		return fmt.Errorf("unsupported type: %T", v)
	}
	return nil
}

func (e *MsgPackEncoder) encodeInt(i int64) {
	if i >= 0 && i <= 127 {
		e.buf.WriteByte(byte(i))
	} else if i >= -32 && i < 0 {
		e.buf.WriteByte(byte(i))
	} else if i >= math.MinInt16 && i <= math.MaxInt16 {
		e.buf.WriteByte(0xd1)
		binary.Write(&e.buf, binary.BigEndian, int16(i))
	} else if i >= math.MinInt32 && i <= math.MaxInt32 {
		e.buf.WriteByte(0xd2)
		binary.Write(&e.buf, binary.BigEndian, int32(i))
	} else {
		e.buf.WriteByte(0xd3)
		binary.Write(&e.buf, binary.BigEndian, i)
	}
}

func (e *MsgPackEncoder) encodeString(s string) {
	b := []byte(s)
	l := len(b)
	if l <= 31 {
		e.buf.WriteByte(byte(0xa0 | l))
	} else if l <= 255 {
		e.buf.WriteByte(0xd9)
		e.buf.WriteByte(byte(l))
	} else if l <= math.MaxUint16 {
		e.buf.WriteByte(0xda)
		binary.Write(&e.buf, binary.BigEndian, uint16(l))
	} else {
		e.buf.WriteByte(0xdb)
		binary.Write(&e.buf, binary.BigEndian, uint32(l))
	}
	e.buf.Write(b)
}

func (e *MsgPackEncoder) encodeSlice(slice []any) {
	l := len(slice)
	if l <= 15 {
		e.buf.WriteByte(byte(0x90 | l))
	} else if l <= math.MaxUint16 {
		e.buf.WriteByte(0xdc)
		binary.Write(&e.buf, binary.BigEndian, uint16(l))
	} else {
		e.buf.WriteByte(0xdd)
		binary.Write(&e.buf, binary.BigEndian, uint32(l))
	}
	for _, item := range slice {
		e.Encode(item)
	}
}

func (e *MsgPackEncoder) encodeMap(m map[string]any) {
	l := len(m)
	if l <= 15 {
		e.buf.WriteByte(byte(0x80 | l))
	} else if l <= math.MaxUint16 {
		e.buf.WriteByte(0xde)
		binary.Write(&e.buf, binary.BigEndian, uint16(l))
	} else {
		e.buf.WriteByte(0xdf)
		binary.Write(&e.buf, binary.BigEndian, uint32(l))
	}
	for k, v := range m {
		e.encodeString(k)
		e.Encode(v)
	}
}

// Simple MsgPack Decoder
type MsgPackDecoder struct {
	r *bytes.Reader
}

func (d *MsgPackDecoder) Decode() (any, error) {
	b, err := d.r.ReadByte()
	if err != nil {
		return nil, err
	}

	// Positive FixInt
	if b <= 0x7f {
		return int(b), nil
	}
	// FixMap
	if b >= 0x80 && b <= 0x8f {
		return d.readMap(int(b & 0x0f))
	}
	// FixArray
	if b >= 0x90 && b <= 0x9f {
		return d.readArray(int(b & 0x0f))
	}
	// FixStr
	if b >= 0xa0 && b <= 0xbf {
		return d.readString(int(b & 0x1f))
	}
	// Negative FixInt
	if b >= 0xe0 {
		return int(int8(b)), nil
	}

	switch b {
	case 0xc0:
		return nil, nil
	case 0xc2:
		return false, nil
	case 0xc3:
		return true, nil
	case 0xd9:
		l, _ := d.r.ReadByte()
		return d.readString(int(l))
	case 0xda:
		var l uint16
		binary.Read(d.r, binary.BigEndian, &l)
		return d.readString(int(l))
	case 0xdb:
		var l uint32
		binary.Read(d.r, binary.BigEndian, &l)
		return d.readString(int(l))
	case 0xdc:
		var l uint16
		binary.Read(d.r, binary.BigEndian, &l)
		return d.readArray(int(l))
	case 0xdd:
		var l uint32
		binary.Read(d.r, binary.BigEndian, &l)
		return d.readArray(int(l))
	case 0xde:
		var l uint16
		binary.Read(d.r, binary.BigEndian, &l)
		return d.readMap(int(l))
	case 0xdf:
		var l uint32
		binary.Read(d.r, binary.BigEndian, &l)
		return d.readMap(int(l))
	default:
		return nil, fmt.Errorf("unknown msgpack byte: 0x%02x", b)
	}
}

func (d *MsgPackDecoder) readString(l int) (string, error) {
	buf := make([]byte, l)
	_, err := io.ReadFull(d.r, buf)
	return string(buf), err
}

func (d *MsgPackDecoder) readArray(l int) ([]any, error) {
	arr := make([]any, l)
	for i := 0; i < l; i++ {
		val, err := d.Decode()
		if err != nil {
			return nil, err
		}
		arr[i] = val
	}
	return arr, nil
}

func (d *MsgPackDecoder) readMap(l int) (map[string]any, error) {
	m := make(map[string]any, l)
	for i := 0; i < l; i++ {
		k, err := d.Decode()
		if err != nil {
			return nil, err
		}
		keyStr := fmt.Sprintf("%v", k)
		v, err := d.Decode()
		if err != nil {
			return nil, err
		}
		m[keyStr] = v
	}
	return m, nil
}

func runMetasploitClient(args []string) {
	fs := flag.NewFlagSet("msf", flag.ExitOnError)
	host := fs.String("h", "127.0.0.1", "Host de msfrpcd")
	port := fs.Int("p", 55553, "Puerto de msfrpcd")
	user := fs.String("u", "msf", "Usuario de autenticación")
	pass := fs.String("P", "password", "Contraseña de autenticación")
	useSSL := fs.Bool("ssl", false, "Usar HTTPS/SSL")
	demo := fs.Bool("demo", false, "Simular entorno de laboratorio (Modo didáctico)")
	fs.Parse(args)

	if *demo {
		fmt.Printf("%s[*] Ejecutando en Modo Laboratorio Simulado%s\n", colorYellow, colorReset)
		time.Sleep(200 * time.Millisecond)
		fmt.Printf("%s[+] Autenticación exitosa en msfrpcd con token temporal: %stmp_98a76f23b%s\n", colorGreen, colorCyan, colorReset)
		fmt.Printf("%s[+] Consultando 'session.list'...\n\n", colorGreen)

		fmt.Printf("%s╔═══════════════════════════════════════════════════════════════════════════════════╗%s\n", colorGray, colorReset)
		fmt.Printf("║ %-4s ║ %-12s ║ %-28s ║ %-18s ║ %-8s ║\n", "ID", "TIPO", "TÚNEL", "EXPLOIT", "USUARIO")
		fmt.Printf("%s╠═══════════════════════════════════════════════════════════════════════════════════╣%s\n", colorGray, colorReset)
		fmt.Printf("║ %-4s ║ %s%-12s%s ║ %-28s ║ %-18s ║ %s%-8s%s ║\n", "1", colorGreen, "meterpreter", colorReset, "192.168.1.50:4444 -> .10", "ms17_010_eternal", colorRed, "SYSTEM", colorReset)
		fmt.Printf("║ %-4s ║ %s%-12s%s ║ %-28s ║ %-18s ║ %s%-8s%s ║\n", "2", colorYellow, "shell", colorReset, "192.168.1.50:5555 -> .14", "log4shell", colorYellow, "tomcat", colorReset)
		fmt.Printf("%s╚═══════════════════════════════════════════════════════════════════════════════════╝%s\n", colorGray, colorReset)
		return
	}

	scheme := "http"
	if *useSSL {
		scheme = "https"
	}
	baseURL := fmt.Sprintf("%s://%s:%d/api/1.0/", scheme, *host, *port)

	client := &http.Client{
		Timeout: 10 * time.Second,
		Transport: &http.Transport{
			TLSClientConfig: &tls.Config{InsecureSkipVerify: true},
		},
	}

	// 1. Send auth.login
	fmt.Printf("%s[*] Autenticando en %s (usuario: %s)...%s\n", colorCyan, baseURL, *user, colorReset)
	var enc MsgPackEncoder
	enc.Encode([]any{"auth.login", *user, *pass})

	req, _ := http.NewRequest("POST", baseURL, bytes.NewReader(enc.buf.Bytes()))
	req.Header.Set("Content-Type", "binary/message-pack")
	resp, err := client.Do(req)
	if err != nil {
		fmt.Printf("%s[!] No se pudo conectar a msfrpcd en %s:%d: %v%s\n", colorRed, *host, *port, err, colorReset)
		fmt.Printf("%s    (Tip: Puedes usar el flag -demo para probar el modo de laboratorio simulado)%s\n", colorGray, colorReset)
		return
	}
	defer resp.Body.Close()

	respData, _ := io.ReadAll(resp.Body)
	dec := &MsgPackDecoder{r: bytes.NewReader(respData)}
	result, err := dec.Decode()
	if err != nil {
		fmt.Printf("%s[!] Error decodificando respuesta MsgPack: %v%s\n", colorRed, err, colorReset)
		return
	}

	resMap, ok := result.(map[string]any)
	if !ok || resMap["result"] != "success" {
		fmt.Printf("%s[!] Error de autenticación: %v%s\n", colorRed, result, colorReset)
		return
	}

	token := fmt.Sprintf("%v", resMap["token"])
	fmt.Printf("%s[+] Autenticado exitosamente. Token: %s%s%s\n", colorGreen, colorCyan, token, colorReset)

	// 2. Call session.list
	enc.buf.Reset()
	enc.Encode([]any{"session.list", token})
	req2, _ := http.NewRequest("POST", baseURL, bytes.NewReader(enc.buf.Bytes()))
	req2.Header.Set("Content-Type", "binary/message-pack")
	resp2, err := client.Do(req2)
	if err != nil {
		fmt.Printf("%s[!] Error consultando session.list: %v%s\n", colorRed, err, colorReset)
		return
	}
	defer resp2.Body.Close()

	respData2, _ := io.ReadAll(resp2.Body)
	dec2 := &MsgPackDecoder{r: bytes.NewReader(respData2)}
	sessionsResult, err := dec2.Decode()
	if err != nil {
		fmt.Printf("%s[!] Error parseando sesiones: %v%s\n", colorRed, err, colorReset)
		return
	}

	fmt.Printf("\n%s=== Sesiones Activas en Metasploit ===%s\n", colorBold, colorReset)
	fmt.Printf("%v\n", sessionsResult)
}

// ============================================================================
// 4. Forensic Metadata Extractor (Black Hat Go Chapter 3 Core)
// ============================================================================

// OpenXML Core Properties (docProps/core.xml)
type OfficeCoreProperties struct {
	XMLName        xml.Name `xml:"coreProperties"`
	Title          string   `xml:"title"`
	Subject        string   `xml:"subject"`
	Creator        string   `xml:"creator"`
	Keywords       string   `xml:"keywords"`
	Description    string   `xml:"description"`
	LastModifiedBy string   `xml:"lastModifiedBy"`
	Revision       string   `xml:"revision"`
	Created        string   `xml:"created"`
	Modified       string   `xml:"modified"`
}

// OpenXML Extended Application Properties (docProps/app.xml)
type OfficeAppProperties struct {
	XMLName            xml.Name `xml:"Properties"`
	Application        string   `xml:"Application"`
	DocSecurity        int      `xml:"DocSecurity"`
	ScaleCrop          bool     `xml:"ScaleCrop"`
	HeadingPairs       any      `xml:"HeadingPairs"`
	TitlesOfParts      any      `xml:"TitlesOfParts"`
	Company            string   `xml:"Company"`
	LinksUpToDate      bool     `xml:"LinksUpToDate"`
	SharedDoc          bool     `xml:"SharedDoc"`
	HyperlinksChanged  bool     `xml:"HyperlinksChanged"`
	AppVersion         string   `xml:"AppVersion"`
}

type ExtractedDoc struct {
	Filename       string   `json:"filename"`
	URL            string   `json:"url,omitempty"`
	FileType       string   `json:"file_type"`
	Size           int64    `json:"size"`
	Title          string   `json:"title"`
	Creator        string   `json:"creator"`
	LastModifiedBy string   `json:"last_modified_by"`
	Company        string   `json:"company"`
	Application    string   `json:"application"`
	OfficeVersion  string   `json:"office_version"`
	Created        string   `json:"created,omitempty"`
	Modified       string   `json:"modified,omitempty"`
	SecurityRisks  []string `json:"security_risks"`
	Error          string   `json:"error,omitempty"`
}

func mapAppVersion(versionStr string) string {
	parts := strings.Split(versionStr, ".")
	if len(parts) == 0 {
		return ""
	}
	major, err := strconv.Atoi(parts[0])
	if err != nil {
		return versionStr
	}

	switch major {
	case 11:
		return "Microsoft Office 2003 (Legado)"
	case 12:
		return "Microsoft Office 2007 (Vulnerable a cve-2017-11882)"
	case 14:
		return "Microsoft Office 2010"
	case 15:
		return "Microsoft Office 2013"
	case 16:
		return "Microsoft Office 2016 / 2019 / 365"
	default:
		return fmt.Sprintf("Office Build v%s", versionStr)
	}
}

func extractOpenXMLMetadata(data []byte, filename string) (*ExtractedDoc, error) {
	zipReader, err := zip.NewReader(bytes.NewReader(data), int64(len(data)))
	if err != nil {
		return nil, fmt.Errorf("no es un archivo ZIP/OpenXML válido: %w", err)
	}

	doc := &ExtractedDoc{
		Filename: filename,
		FileType: strings.TrimPrefix(filepath.Ext(filename), "."),
		Size:     int64(len(data)),
	}
	if doc.FileType == "" {
		doc.FileType = "docx"
	}

	var coreProps OfficeCoreProperties
	var appProps OfficeAppProperties

	for _, f := range zipReader.File {
		if strings.EqualFold(f.Name, "docProps/core.xml") {
			rc, err := f.Open()
			if err == nil {
				xmlData, _ := io.ReadAll(rc)
				xml.Unmarshal(xmlData, &coreProps)
				rc.Close()
			}
		} else if strings.EqualFold(f.Name, "docProps/app.xml") {
			rc, err := f.Open()
			if err == nil {
				xmlData, _ := io.ReadAll(rc)
				xml.Unmarshal(xmlData, &appProps)
				rc.Close()
			}
		}
	}

	doc.Title = coreProps.Title
	doc.Creator = coreProps.Creator
	doc.LastModifiedBy = coreProps.LastModifiedBy
	doc.Company = appProps.Company
	doc.Application = appProps.Application
	doc.Created = coreProps.Created
	doc.Modified = coreProps.Modified

	if appProps.AppVersion != "" {
		doc.OfficeVersion = mapAppVersion(appProps.AppVersion)
	}

	// Security Risks & OPSEC audit
	var risks []string
	userRegex := regexp.MustCompile(`(?i)(corp\\|\badmin\b|\broot\b|\b[a-z]{1,3}\.[a-z]+\b|\buser\b)`)
	if doc.Creator != "" && userRegex.MatchString(doc.Creator) {
		risks = append(risks, fmt.Sprintf("Posible fuga de nombre de usuario interno en 'Creador': %s", doc.Creator))
	}
	if doc.LastModifiedBy != "" && userRegex.MatchString(doc.LastModifiedBy) {
		risks = append(risks, fmt.Sprintf("Posible fuga de usuario corporativo en 'Última modificación': %s", doc.LastModifiedBy))
	}
	if strings.Contains(doc.OfficeVersion, "2007") || strings.Contains(doc.OfficeVersion, "2003") {
		risks = append(risks, fmt.Sprintf("Versión de Office obsoleta detectada (%s), susceptible a exploits de ejecución remota", doc.OfficeVersion))
	}

	doc.SecurityRisks = risks
	return doc, nil
}

func extractPDFMetadata(data []byte, filename string) (*ExtractedDoc, error) {
	doc := &ExtractedDoc{
		Filename: filename,
		FileType: "pdf",
		Size:     int64(len(data)),
	}

	content := string(data)
	findPDFTag := func(tag string) string {
		re := regexp.MustCompile(fmt.Sprintf(`/%s\s*\(([^)]+)\)`, tag))
		m := re.FindStringSubmatch(content)
		if len(m) > 1 {
			return strings.TrimSpace(m[1])
		}
		return ""
	}

	doc.Title = findPDFTag("Title")
	doc.Creator = findPDFTag("Author")
	doc.Application = findPDFTag("Creator")
	producer := findPDFTag("Producer")
	if producer != "" {
		if doc.Application != "" {
			doc.Application += " / " + producer
		} else {
			doc.Application = producer
		}
	}

	var risks []string
	if doc.Creator != "" && (strings.Contains(strings.ToLower(doc.Creator), "admin") || strings.Contains(doc.Creator, "\\")) {
		risks = append(risks, fmt.Sprintf("Fuga de cuenta de usuario en metadatos PDF: %s", doc.Creator))
	}
	doc.SecurityRisks = risks

	return doc, nil
}

func extractMetadataFromBytes(data []byte, filename string) (*ExtractedDoc, error) {
	if len(data) >= 4 && bytes.Equal(data[:4], []byte("PK\x03\x04")) {
		return extractOpenXMLMetadata(data, filename)
	}
	if len(data) >= 5 && bytes.Equal(data[:5], []byte("%PDF-")) {
		return extractPDFMetadata(data, filename)
	}
	return nil, fmt.Errorf("formato no soportado (se requiere OpenXML o PDF)")
}

func runMetadataExtractor(args []string) {
	fs := flag.NewFlagSet("metadata", flag.ExitOnError)
	filePath := fs.String("f", "", "Ruta a archivo local (.docx, .xlsx, .pptx, .pdf)")
	targetURL := fs.String("u", "", "Descargar y analizar documento desde URL")
	domain := fs.String("d", "", "Buscar documentos mediante Bing Dorking en dominio (ej. nytimes.com)")
	fileType := fs.String("ext", "docx", "Extensión para búsqueda Bing (docx, pdf, xlsx)")
	exportJSON := fs.String("export-json", "", "Guardar reporte en archivo JSON")
	exportCSV := fs.String("export-csv", "", "Guardar reporte en archivo CSV")
	fs.Parse(args)

	var results []*ExtractedDoc

	// 1. Local file analysis
	if *filePath != "" {
		data, err := os.ReadFile(*filePath)
		if err != nil {
			fmt.Printf("%s[!] Error leyendo archivo %s: %v%s\n", colorRed, *filePath, err, colorReset)
			return
		}
		doc, err := extractMetadataFromBytes(data, filepath.Base(*filePath))
		if err != nil {
			fmt.Printf("%s[!] Error analizando %s: %v%s\n", colorRed, *filePath, err, colorReset)
			return
		}
		results = append(results, doc)
	}

	// 2. Direct URL analysis
	if *targetURL != "" {
		fmt.Printf("%s[*] Descargando documento desde %s...%s\n", colorCyan, *targetURL, colorReset)
		client := &http.Client{Timeout: 20 * time.Second}
		resp, err := client.Get(*targetURL)
		if err != nil {
			fmt.Printf("%s[!] Error descargando URL: %v%s\n", colorRed, err, colorReset)
			return
		}
		defer resp.Body.Close()

		data, err := io.ReadAll(resp.Body)
		if err != nil {
			fmt.Printf("%s[!] Error leyendo cuerpo: %v%s\n", colorRed, err, colorReset)
			return
		}

		u, _ := url.Parse(*targetURL)
		filename := filepath.Base(u.Path)
		if filename == "" || filename == "/" {
			filename = "documento.docx"
		}

		doc, err := extractMetadataFromBytes(data, filename)
		if err != nil {
			fmt.Printf("%s[!] Error analizando documento: %v%s\n", colorRed, err, colorReset)
			return
		}
		doc.URL = *targetURL
		results = append(results, doc)
	}

	// 3. Bing Dorking
	if *domain != "" {
		dork := fmt.Sprintf("site:%s filetype:%s", *domain, *fileType)
		fmt.Printf("%s[*] Ejecutando dorking en Bing: %s%s\n", colorCyan, dork, colorReset)
		bingURL := fmt.Sprintf("https://www.bing.com/search?q=%s", url.QueryEscape(dork))

		client := &http.Client{Timeout: 15 * time.Second}
		req, _ := http.NewRequest("GET", bingURL, nil)
		req.Header.Set("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36")
		resp, err := client.Do(req)
		if err != nil {
			fmt.Printf("%s[!] Error consultando Bing: %v%s\n", colorRed, err, colorReset)
		} else {
			defer resp.Body.Close()
			htmlBytes, _ := io.ReadAll(resp.Body)
			linkRegex := regexp.MustCompile(`https?://[^"'>\s]+\.` + regexp.QuoteMeta(*fileType))
			foundLinks := linkRegex.FindAllString(string(htmlBytes), 5)

			fmt.Printf("%s[+] Encontrados %d enlaces a documentos.%s\n", colorGreen, len(foundLinks), colorReset)
			for _, link := range foundLinks {
				fmt.Printf("    Analizando: %s\n", link)
				docResp, err := client.Get(link)
				if err != nil {
					continue
				}
				docData, err := io.ReadAll(docResp.Body)
				docResp.Body.Close()
				if err != nil {
					continue
				}
				u, _ := url.Parse(link)
				doc, err := extractMetadataFromBytes(docData, filepath.Base(u.Path))
				if err == nil {
					doc.URL = link
					results = append(results, doc)
				}
			}
		}
	}

	if len(results) == 0 {
		fmt.Printf("%s[!] No se especificó archivo (-f), URL (-u) ni dominio (-d).%s\n\n", colorYellow, colorReset)
		fs.Usage()
		return
	}

	// Output terminal report
	for idx, doc := range results {
		fmt.Println()
		fmt.Printf("%s╔═══════════════════════════════════════════════════════════════════════════════╗%s\n", colorCyan, colorReset)
		fmt.Printf("  %sDocumento #%d:%s %s\n", colorBold, idx+1, colorReset, doc.Filename)
		if doc.URL != "" {
			fmt.Printf("  %sURL:%s %s\n", colorBold, colorReset, doc.URL)
		}
		fmt.Printf("  %sTipo / Tamaño:%s %s (%.2f KB)\n", colorBold, colorReset, strings.ToUpper(doc.FileType), float64(doc.Size)/1024.0)
		fmt.Printf("  %sTítulo:%s %s\n", colorBold, colorReset, doc.Title)
		fmt.Printf("  %sAutor / Creador:%s %s%s%s\n", colorBold, colorReset, colorGreen, doc.Creator, colorReset)
		fmt.Printf("  %sModificado Por:%s %s\n", colorBold, colorReset, doc.LastModifiedBy)
		fmt.Printf("  %sEmpresa:%s %s\n", colorBold, colorReset, doc.Company)
		fmt.Printf("  %sAplicación:%s %s\n", colorBold, colorReset, doc.Application)
		if doc.OfficeVersion != "" {
			fmt.Printf("  %sVersión Office:%s %s%s%s\n", colorBold, colorReset, colorYellow, doc.OfficeVersion, colorReset)
		}

		if len(doc.SecurityRisks) > 0 {
			fmt.Printf("\n  %s[!] RIESGOS OPSEC DETECTADOS:%s\n", colorRed, colorReset)
			for _, risk := range doc.SecurityRisks {
				fmt.Printf("    %s• %s%s\n", colorYellow, risk, colorReset)
			}
		} else {
			fmt.Printf("\n  %s[✓] No se detectaron fugas críticas de usuarios o versiones obsoletas.%s\n", colorGreen, colorReset)
		}
		fmt.Printf("%s╚═══════════════════════════════════════════════════════════════════════════════╝%s\n", colorCyan, colorReset)
	}

	// Export JSON
	if *exportJSON != "" {
		jsonData, err := json.MarshalIndent(results, "", "  ")
		if err == nil {
			err = os.WriteFile(*exportJSON, jsonData, 0644)
			if err == nil {
				fmt.Printf("\n%s[+] Reporte JSON guardado en: %s%s\n", colorGreen, *exportJSON, colorReset)
			}
		}
	}

	// Export CSV
	if *exportCSV != "" {
		f, err := os.Create(*exportCSV)
		if err == nil {
			defer f.Close()
			w := csv.NewWriter(f)
			w.Write([]string{"ID", "Filename", "URL", "FileType", "Title", "Creator", "LastModifiedBy", "Company", "Application", "OfficeVersion", "Size", "SecurityRisks"})
			for i, d := range results {
				w.Write([]string{
					strconv.Itoa(i + 1),
					d.Filename,
					d.URL,
					d.FileType,
					d.Title,
					d.Creator,
					d.LastModifiedBy,
					d.Company,
					d.Application,
					d.OfficeVersion,
					strconv.FormatInt(d.Size, 10),
					strings.Join(d.SecurityRisks, "; "),
				})
			}
			w.Flush()
			fmt.Printf("%s[+] Reporte CSV guardado en: %s%s\n", colorGreen, *exportCSV, colorReset)
		}
	}
}

// ============================================================================
// 5. Embedded Web Server Module (CLI + Web UI)
// ============================================================================

const embeddedHTML = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>ORSO · HTTP Clients Security Toolkit (Go Edition)</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
    body { background-color: #0d1117; color: #c9d1d9; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; }
  </style>
</head>
<body class="p-4 sm:p-8 max-w-6xl mx-auto">
  <header class="border-b border-[#30363d] pb-4 mb-6 flex flex-col sm:flex-row items-center justify-between gap-4">
    <div>
      <h1 class="text-xl font-bold text-[#58a6ff] flex items-center gap-2">
        <span>🛡️ ORSO · HTTP Clients Security Toolkit</span>
      </h1>
      <p class="text-xs text-[#8b949e] mt-1">Implementación en Go Puro basada en Black Hat Go (Capítulo 3)</p>
    </div>
    <span class="text-xs px-2.5 py-1 bg-[#21262d] text-emerald-400 border border-[#30363d] rounded font-semibold">
      Servidor Go Activo
    </span>
  </header>

  <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
    <!-- HTTP Tester -->
    <div class="bg-[#161b22] border border-[#30363d] rounded-lg p-5">
      <h2 class="text-sm font-bold text-[#58a6ff] mb-3">1. Cliente HTTP Genérico</h2>
      <div class="space-y-3 text-xs">
        <div class="flex gap-2">
          <select id="httpMethod" class="bg-[#0d1117] border border-[#30363d] rounded px-2 py-1.5 text-amber-400 font-bold">
            <option>GET</option>
            <option>POST</option>
            <option>PUT</option>
            <option>DELETE</option>
            <option>HEAD</option>
          </select>
          <input id="httpUrl" type="text" value="https://jsonplaceholder.typicode.com/posts/1" class="flex-1 bg-[#0d1117] border border-[#30363d] rounded px-3 py-1.5 text-zinc-200">
        </div>
        <button onclick="sendHttpRequest()" class="w-full bg-[#238636] hover:bg-[#2ea043] text-white py-1.5 rounded font-bold transition">
          Ejecutar Petición
        </button>
        <pre id="httpOutput" class="bg-[#0d1117] border border-[#30363d] p-3 rounded text-[11px] overflow-x-auto max-h-48 text-[#8b949e]">Esperando ejecución...</pre>
      </div>
    </div>

    <!-- Metadata Extractor -->
    <div class="bg-[#161b22] border border-[#30363d] rounded-lg p-5">
      <h2 class="text-sm font-bold text-[#58a6ff] mb-3">2. Extractor Forense de Metadatos</h2>
      <div class="space-y-3 text-xs">
        <input id="docUrl" type="text" placeholder="URL de archivo Word, Excel o PDF..." class="w-full bg-[#0d1117] border border-[#30363d] rounded px-3 py-1.5 text-zinc-200">
        <button onclick="extractMetadata()" class="w-full bg-[#1f6feb] hover:bg-[#388bfd] text-white py-1.5 rounded font-bold transition">
          Descargar y Extraer Metadatos
        </button>
        <pre id="metaOutput" class="bg-[#0d1117] border border-[#30363d] p-3 rounded text-[11px] overflow-x-auto max-h-48 text-[#8b949e]">Ingresa una URL o prueba en la consola CLI...</pre>
      </div>
    </div>
  </div>

  <div class="mt-6 bg-[#161b22] border border-[#30363d] rounded-lg p-5">
    <h3 class="text-sm font-bold text-[#58a6ff] mb-2">Comandos de Consola CLI (main.go)</h3>
    <pre class="bg-[#0d1117] p-3 rounded text-xs text-[#8b949e] overflow-x-auto">
# Cliente HTTP genérico
go run main.go http -X POST -u https://httpbin.org/post -d '{"test":1}' -v

# Reconocimiento con Shodan
export SHODAN_API_KEY="tu-key"
go run main.go shodan info
go run main.go shodan search -q "apache country:ES"

# Monitor Metasploit RPC (msfrpcd)
go run main.go msf -h 127.0.0.1 -p 55553 -demo

# Extractor Forense de Metadatos y Bing Dorking
go run main.go metadata -f documento.docx --export-json reporte.json --export-csv reporte.csv
go run main.go metadata -d ejemplo.com -ext pdf
    </pre>
  </div>

  <script>
    async function sendHttpRequest() {
      const method = document.getElementById('httpMethod').value;
      const url = document.getElementById('httpUrl').value;
      const out = document.getElementById('httpOutput');
      out.textContent = 'Enviando petición...';
      try {
        const res = await fetch('/api/http', {
          method: 'POST',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify({ method, url })
        });
        const json = await res.json();
        out.textContent = JSON.stringify(json, null, 2);
      } catch (e) {
        out.textContent = 'Error: ' + e.message;
      }
    }

    async function extractMetadata() {
      const url = document.getElementById('docUrl').value;
      const out = document.getElementById('metaOutput');
      if (!url) { alert('Ingresa una URL'); return; }
      out.textContent = 'Descargando y analizando binario...';
      try {
        const res = await fetch('/api/metadata', {
          method: 'POST',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify({ url })
        });
        const json = await res.json();
        out.textContent = JSON.stringify(json, null, 2);
      } catch (e) {
        out.textContent = 'Error: ' + e.message;
      }
    }
  </script>
</body>
</html>`

func runWebServer(args []string) {
	fs := flag.NewFlagSet("serve", flag.ExitOnError)
	port := fs.Int("port", 8080, "Puerto del servidor HTTP local")
	fs.Parse(args)

	mux := http.NewServeMux()

	// Web UI
	mux.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "text/html; charset=utf-8")
		w.Write([]byte(embeddedHTML))
	})

	// API HTTP proxy
	mux.HandleFunc("/api/http", func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
			return
		}
		var payload struct {
			Method string `json:"method"`
			URL    string `json:"url"`
			Data   string `json:"data"`
		}
		if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
			http.Error(w, err.Error(), http.StatusBadRequest)
			return
		}
		if payload.Method == "" {
			payload.Method = "GET"
		}

		client := &http.Client{Timeout: 15 * time.Second}
		start := time.Now()
		req, _ := http.NewRequest(payload.Method, payload.URL, strings.NewReader(payload.Data))
		req.Header.Set("User-Agent", "GoHTTP-Client/1.0 (ORSO-Toolkit)")
		resp, err := client.Do(req)
		duration := time.Since(start)

		if err != nil {
			w.Header().Set("Content-Type", "application/json")
			json.NewEncoder(w).Encode(map[string]any{"error": err.Error()})
			return
		}
		defer resp.Body.Close()

		body, _ := io.ReadAll(resp.Body)
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]any{
			"status":   resp.StatusCode,
			"duration": duration.Milliseconds(),
			"size":     len(body),
			"body":     string(body),
		})
	})

	// API Metadata proxy
	mux.HandleFunc("/api/metadata", func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
			return
		}
		var payload struct {
			URL string `json:"url"`
		}
		if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
			http.Error(w, err.Error(), http.StatusBadRequest)
			return
		}

		client := &http.Client{Timeout: 20 * time.Second}
		resp, err := client.Get(payload.URL)
		if err != nil {
			w.Header().Set("Content-Type", "application/json")
			json.NewEncoder(w).Encode(map[string]any{"error": err.Error()})
			return
		}
		defer resp.Body.Close()

		data, err := io.ReadAll(resp.Body)
		if err != nil {
			w.Header().Set("Content-Type", "application/json")
			json.NewEncoder(w).Encode(map[string]any{"error": err.Error()})
			return
		}

		u, _ := url.Parse(payload.URL)
		doc, err := extractMetadataFromBytes(data, filepath.Base(u.Path))
		w.Header().Set("Content-Type", "application/json")
		if err != nil {
			json.NewEncoder(w).Encode(map[string]any{"error": err.Error()})
			return
		}
		doc.URL = payload.URL
		json.NewEncoder(w).Encode(doc)
	})

	addr := fmt.Sprintf(":%d", *port)
	fmt.Printf("\n%s[+] Servidor web ORSO iniciado en http://localhost:%d%s\n", colorGreen, *port, colorReset)
	fmt.Printf("%s[*] Presiona Ctrl+C para detener el servidor.%s\n\n", colorGray, colorReset)

	server := &http.Server{
		Addr:    addr,
		Handler: mux,
	}

	if err := server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
		fmt.Printf("%s[!] Error en servidor web: %v%s\n", colorRed, err, colorReset)
	}
}

// ============================================================================
// Main CLI Router
// ============================================================================

func main() {
	printBanner()

	if len(os.Args) < 2 {
		fmt.Printf("%sUso:%s go run main.go <comando> [opciones]\n\n", colorBold, colorReset)
		fmt.Println("Comandos disponibles:")
		fmt.Printf("  %shttp%s       Cliente HTTP genérico interactivo con métricas de latencia y headers\n", colorCyan, colorReset)
		fmt.Printf("  %sshodan%s     Cliente OSINT de Shodan API (info de cuenta, búsqueda de hosts, IP)\n", colorCyan, colorReset)
		fmt.Printf("  %smsf%s        Monitor de sesiones de Metasploit RPC (msfrpcd vía MessagePack)\n", colorCyan, colorReset)
		fmt.Printf("  %smetadata%s   Extractor forense de metadatos (OpenXML .docx/.xlsx, PDF, Bing Dorking)\n", colorCyan, colorReset)
		fmt.Printf("  %sserve%s      Inicia servidor web local embebido con interfaz gráfica\n\n", colorCyan, colorReset)
		fmt.Printf("Ejemplos rápidos:\n")
		fmt.Println("  go run main.go http -X GET -u https://httpbin.org/get -v")
		fmt.Println("  go run main.go shodan search -key TU_API_KEY -q 'apache country:ES'")
		fmt.Println("  go run main.go msf -demo")
		fmt.Println("  go run main.go metadata -f documento.docx --export-json reporte.json")
		fmt.Println("  go run main.go serve -port 8080")
		return
	}

	command := os.Args[1]
	args := os.Args[2:]

	switch command {
	case "http":
		runHTTPClient(args)
	case "shodan":
		runShodanClient(args)
	case "msf", "metasploit":
		runMetasploitClient(args)
	case "metadata", "meta":
		runMetadataExtractor(args)
	case "serve", "server", "web":
		runWebServer(args)
	case "help", "-h", "--help":
		flag.Usage()
	default:
		fmt.Printf("%s[!] Comando no reconocido: '%s'%s\n", colorRed, command, colorReset)
		fmt.Println("Ejecuta 'go run main.go' para ver los comandos disponibles.")
	}
}
