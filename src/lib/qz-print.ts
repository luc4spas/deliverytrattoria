// Cliente QZ Tray — carrega a lib via CDN sob demanda, configura assinatura
// digital (certificado + chave privada) para evitar pop-ups de autorização,
// e conecta via WebSocket no QZ Tray local (porta 8181/8182).

declare global {
  interface Window {
    qz?: any;
  }
}

const QZ_CDN = "https://cdn.jsdelivr.net/npm/qz-tray@2.2.4/qz-tray.js";
let loadingPromise: Promise<any> | null = null;
let securityConfigured = false;

const QZ_CERTIFICATE = `-----BEGIN CERTIFICATE-----
MIIECzCCAvOgAwIBAgIGAZ5GwQuzMA0GCSqGSIb3DQEBCwUAMIGiMQswCQYDVQQG
EwJVUzELMAkGA1UECAwCTlkxEjAQBgNVBAcMCUNhbmFzdG90YTEbMBkGA1UECgwS
UVogSW5kdXN0cmllcywgTExDMRswGQYDVQQLDBJRWiBJbmR1c3RyaWVzLCBMTEMx
HDAaBgkqhkiG9w0BCQEWDXN1cHBvcnRAcXouaW8xGjAYBgNVBAMMEVFaIFRyYXkg
RGVtbyBDZXJ0MB4XDTI2MDUxOTE4NTgzN1oXDTQ2MDUxOTE4NTgzN1owgaIxCzAJ
BgNVBAYTAlVTMQswCQYDVQQIDAJOWTESMBAGA1UEBwwJQ2FuYXN0b3RhMRswGQYD
VQQKDBJRWiBJbmR1c3RyaWVzLCBMTEMxGzAZBgNVBAsMElFaIEluZHVzdHJpZXMs
IExMQzEcMBoGCSqGSIb3DQEJARYNc3VwcG9ydEBxei5pbzEaMBgGA1UEAwwRUVog
VHJheSBEZW1vIENlcnQwggEiMA0GCSqGSIb3DQEBAQUAA4IBDwAwggEKAoIBAQCo
k/uM8vEKRdiNBfyKdVubJRH9JBC5KmVr1wh2eeFu+ipvnSUzC+UlUXh11QsWj8PZ
H3gPNMB8artRDOX9k+37GAuJ7qymj4tQENaOj0v4VXxJuVdwAOmQ8G3u/+bHi3H6
kAgyoMIxYBbywHiy21WKfANk7JQtqGcG6GHfZCkUDXtABoZhKt8VDoskKcctYMSe
OovLFGzEeF/jHt8RuUBCDw1/4V+ReyJ/fQGBzgeT/K8qHsUI2wW/QaiLV2bbNJEE
1YNSPz7top3+QLSEqjrmDDq8QcABDlbB1SulRt4TI5Z05HLbOwM3rQa7WqxEuEY+
GMu2/55WKP6cX1VBE6/LAgMBAAGjRTBDMBIGA1UdEwEB/wQIMAYBAf8CAQEwDgYD
VR0PAQH/BAQDAgEGMB0GA1UdDgQWBBRr3NL3ks+UCQuKAr1ZhD3gn0rpSjANBgkq
hkiG9w0BAQsFAAOCAQEAEo2rOoBnJDHWexk5WdS9uFSAaoipsBeQ7dsDtzvOKLUs
ncc897QJ61Yrpv/GldH1W/XaXHuGBwnlytTA5QVjBjeyI03qhe4l15zrCIjqWWUE
i5lmQQz7mU4A8M5JmWRobbYE0z5MD6nSMDg80wGVYZXKQxgg86nLfi5G2G799dJk
jd2Ou3Iqeb51i9rmLeLnSZXYTEygqHvwrRHO8wlG8b5fUEgqOioXVnkGTOcZweDp
V9vLjNADQLjcUTI2dZE9+feu5TmSM6EhMhOQEl7lhSTvGYVij1Ih2W7lP8A7TMwj
GmyPCuoNMrt8MnuDdnkRElZwraGjy6tWHzKpc0WUaQ==
-----END CERTIFICATE-----`;

const QZ_PRIVATE_KEY = `-----BEGIN PRIVATE KEY-----
MIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQCok/uM8vEKRdiN
BfyKdVubJRH9JBC5KmVr1wh2eeFu+ipvnSUzC+UlUXh11QsWj8PZH3gPNMB8artR
DOX9k+37GAuJ7qymj4tQENaOj0v4VXxJuVdwAOmQ8G3u/+bHi3H6kAgyoMIxYBby
wHiy21WKfANk7JQtqGcG6GHfZCkUDXtABoZhKt8VDoskKcctYMSeOovLFGzEeF/j
Ht8RuUBCDw1/4V+ReyJ/fQGBzgeT/K8qHsUI2wW/QaiLV2bbNJEE1YNSPz7top3+
QLSEqjrmDDq8QcABDlbB1SulRt4TI5Z05HLbOwM3rQa7WqxEuEY+GMu2/55WKP6c
X1VBE6/LAgMBAAECggEACqjhqrEZnqGTbTnYLsJeBD3AJfNeXvJFDu0ktI0sPQUm
CTNbWbkViJpFIjpSMawhYVZ7YO0s6l3umCDwxOvSP0lVc9rhevf8gksWR7x2ItVd
y+TW5RboFG/hNVAw/fEEFSjl0JtYVdPyj4lHki1Xx69Kbaee23lyTlfQ1iKyWd/b
NAiwH4Cg8KpNk6C/IneQtNk8tcSS80sgu6QRs+r7Dhdxf1ANendEYkBB/OAbPKU0
DA+AcZkF/coXp2g5RaMrj+7JDPoDid2mQUQ96AT8yv04kpKrOAUaR3ajTX3oudXK
AjPfNsTkmMhx3TsS2oEu/4aavz1s3mSqZTHod+A8fQKBgQDhPlyB3IQVsEJ2w/LC
NRWQu6rB0lU0hJU594LluPgsf0gD0LFelmqEqgUdoQZHcMAGveqnlh8e6Jj/DMoI
CdSiA+3Ib8XoOq3Yo07/5KfzPjEdQx6wY8DGtCip851ulvp/6PUFnaNo95eF+xLk
rT/5JegX9lL77U5e4cCkUReDnwKBgQC/mNCPu+MbYAmyd6gsmPHY7vab7kbzHqEU
HmzGibSU9TkDObUtkYbDdapuhERch3UgYouRq79uAbRQ9xm6y+L1HnlHMhKc4E/Q
ILQLOqydyIJUMxzopD6/zRM70BEK7oqXIYLgG52iQ5PvHOWL9LKkEPsiB6SHcArd
Si8MWjmEVQKBgQCtazAaI8fmUvC5NCCB+hECgBr2Y5SKfNHP8Yrsh787szulBFar
dq/IOIb7yvBkrKCMEEjMgr6vM3IoXJZoHfmCS/gVbEk5hYQ32XSHfGr60pVJ7FWC
hSr1UdxFDXXWoZN4S8nqavZXaNlWpHplaiZpExBg8pvtr0W5s6J4YJ70DQKBgC/s
wJaDb95kGmjax2VIaI5Tz7nXU0Xy7mXC6oCK53GvGTC2WZxpX2U65IO6cAMZGvIb
1D9+z2Zr5Lev526zGzUnBz0IyGEXNr+fvolkhtL82aTIGD4U/2Eoodv/QpQScPY2
uq7mGXsCHlncR4rHjXu+h6LOeJgsLXuG19fmJab1AoGAZKwiI/DPkfloCO2VtYx3
qyrloX0yD8v2FY1KxU/hyKa+wYCe+V5HkXdEGwpXkKwgkG7y7WsIy+hKF9tvgZLl
sR387suh6V/bGbqKJQf8KwWq49qb6eqAJhPZ9QhQGNM8SkkqialhYiU0ZlZfcXJr
GGysp9lnNt0A/XnHxh6xcl4=
-----END PRIVATE KEY-----`;

function loadQz(): Promise<any> {
  if (typeof window === "undefined") return Promise.reject(new Error("SSR"));
  if (window.qz) return Promise.resolve(window.qz);
  if (loadingPromise) return loadingPromise;
  loadingPromise = new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = QZ_CDN;
    s.async = true;
    s.onload = () => {
      if (window.qz) resolve(window.qz);
      else reject(new Error("qz-tray não carregou"));
    };
    s.onerror = () => reject(new Error("Falha ao carregar qz-tray do CDN"));
    document.head.appendChild(s);
  });
  return loadingPromise;
}

async function configureSecurity(qz: any) {
  if (securityConfigured) return;
  if (qz.api && typeof qz.api.setPromiseType === "function") {
    qz.api.setPromiseType((resolver: any) => new Promise(resolver));
  }

  // Fornecer função de hash SHA-256 nativa (qz.tools.hash)
  // qz-tray 2.2 exige hash function configurada via setSha256Type(fn)
  const sha256Hex = async (data: string) => {
    const buf = await window.crypto.subtle.digest(
      "SHA-256",
      new TextEncoder().encode(data)
    );
    return Array.from(new Uint8Array(buf))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  };
  if (qz.api && typeof qz.api.setSha256Type === "function") {
    qz.api.setSha256Type((data: string) => sha256Hex(data));
  }
  // Fallback direto caso a versão exponha qz.tools
  if (qz.tools) {
    qz.tools.hash = (data: string) => sha256Hex(data);
  }
  if (qz.api && typeof qz.api.setSignatureAlgorithm === "function") {
    qz.api.setSignatureAlgorithm("SHA256");
  }
  if (qz.security && typeof qz.security.setSignatureAlgorithm === "function") {
    qz.security.setSignatureAlgorithm("SHA256");
  }

  qz.security.setCertificatePromise((resolve: any) => resolve(QZ_CERTIFICATE));

  // Chave privada em base64 puro (sem cabeçalhos/quebras de linha) para WebCrypto
  const privateKeyB64 = QZ_PRIVATE_KEY
    .replace(/-----BEGIN PRIVATE KEY-----/g, "")
    .replace(/-----END PRIVATE KEY-----/g, "")
    .replace(/\s+/g, "");

  // Importa a chave uma única vez e reutiliza em cada assinatura
  let importedKeyPromise: Promise<CryptoKey> | null = null;
  const getKey = () => {
    if (importedKeyPromise) return importedKeyPromise;
    const binaryDer = window.atob(privateKeyB64);
    const bytes = new Uint8Array(binaryDer.length);
    for (let i = 0; i < binaryDer.length; i++) bytes[i] = binaryDer.charCodeAt(i);
    importedKeyPromise = window.crypto.subtle.importKey(
      "pkcs8",
      bytes.buffer,
      { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
      false,
      ["sign"]
    );
    return importedKeyPromise;
  };

  qz.security.setSignaturePromise((toSign: string) => {
    return (resolve: any, reject: any) => {
      getKey()
        .then((key) =>
          window.crypto.subtle.sign(
            "RSASSA-PKCS1-v1_5",
            key,
            new TextEncoder().encode(toSign)
          )
        )
        .then((signature) => {
          const bytes = new Uint8Array(signature);
          let bin = "";
          for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
          resolve(window.btoa(bin));
        })
        .catch((err) => reject(err));
    };
  });

  securityConfigured = true;
}


export async function ensureQzConnected(): Promise<any> {
  const qz = await loadQz();
  await configureSecurity(qz);
  if (qz.websocket.isActive()) return qz;
  await qz.websocket.connect({ retries: 1, delay: 1 });
  return qz;
}

// ============ Formatação dos cupons ============

const LINE_WIDTH = 42; // bobina 80mm em fonte monoespaçada padrão

function pad(s: string, n: number) {
  if (s.length >= n) return s.slice(0, n);
  return s + " ".repeat(n - s.length);
}
function center(s: string) {
  const t = s.slice(0, LINE_WIDTH);
  const left = Math.max(0, Math.floor((LINE_WIDTH - t.length) / 2));
  return " ".repeat(left) + t;
}
function divider(char = "-") {
  return char.repeat(LINE_WIDTH);
}
function twoCols(left: string, right: string) {
  const r = right.slice(0, LINE_WIDTH);
  const maxLeft = LINE_WIDTH - r.length - 1;
  const l = left.length > maxLeft ? left.slice(0, maxLeft) : left;
  return l + " ".repeat(LINE_WIDTH - l.length - r.length) + r;
}
function brl(n: number) {
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export type PrintOrder = {
  id: string;
  customer_name: string;
  customer_phone: string;
  type: string;
  address: { street?: string; number?: string; complement?: string; neighborhood?: string; city?: string } | null;
  items: Array<{ name: string; quantity: number; price: number; notes?: string }>;
  subtotal: number | string;
  delivery_fee: number | string;
  total: number | string;
  payment_method: string;
  change_for?: number | string | null;
  notes?: string | null;
  created_at: string;
};

export function buildCashierReceipt(order: PrintOrder, storeName: string): string {
  const lines: string[] = [];
  lines.push(center(storeName.toUpperCase()));
  lines.push(center("VIA CAIXA"));
  lines.push(divider("="));
  lines.push(`Pedido: #${order.id.slice(0, 8).toUpperCase()}`);
  lines.push(`Data:   ${new Date(order.created_at).toLocaleString("pt-BR")}`);
  lines.push(`Tipo:   ${order.type === "delivery" ? "Entrega" : "Retirada"}`);
  lines.push(divider());
  lines.push(`Cliente: ${order.customer_name}`);
  lines.push(`Tel:     ${order.customer_phone}`);
  if (order.address) {
    const a = order.address;
    const l1 = `${a.street ?? ""}, ${a.number ?? ""}${a.complement ? " - " + a.complement : ""}`;
    const l2 = `${a.neighborhood ?? ""}${a.city ? " - " + a.city : ""}`;
    lines.push(`End: ${l1}`);
    if (l2.trim()) lines.push(`     ${l2}`);
  }
  lines.push(divider());
  lines.push(pad("ITEM", 28) + pad("QTD", 5) + pad("TOTAL", 9));
  lines.push(divider());
  for (const it of order.items) {
    const total = Number(it.price) * Number(it.quantity);
    const name = it.name.length > 27 ? it.name.slice(0, 27) : it.name;
    lines.push(pad(name, 28) + pad(String(it.quantity), 5) + pad(brl(total), 9));
    if (it.notes) lines.push(`  Obs: ${it.notes}`);
  }
  lines.push(divider());
  lines.push(twoCols("Subtotal", brl(Number(order.subtotal))));
  lines.push(twoCols("Taxa de entrega", brl(Number(order.delivery_fee))));
  lines.push(twoCols("TOTAL", brl(Number(order.total))));
  lines.push(divider());
  lines.push(`Pagamento: ${order.payment_method}`);
  if (order.change_for) lines.push(`Troco para: ${brl(Number(order.change_for))}`);
  if (order.notes) {
    lines.push(divider());
    lines.push(`Obs: ${order.notes}`);
  }
  lines.push(divider("="));
  lines.push(center("Obrigado pela preferência!"));
  lines.push("\n\n\n");
  return lines.join("\n");
}

export function buildKitchenReceipt(order: PrintOrder): string {
  const lines: string[] = [];
  lines.push(center("*** COZINHA ***"));
  lines.push(divider("="));
  lines.push(`Pedido: #${order.id.slice(0, 8).toUpperCase()}`);
  lines.push(`Cliente: ${order.customer_name}`);
  lines.push(`Hora: ${new Date(order.created_at).toLocaleTimeString("pt-BR")}`);
  lines.push(`Tipo: ${order.type === "delivery" ? "ENTREGA" : "RETIRADA"}`);
  lines.push(divider("="));
  for (const it of order.items) {
    lines.push("");
    lines.push(`>> ${it.quantity}x  ${it.name.toUpperCase()}`);
    if (it.notes) {
      lines.push(`   ** ${it.notes.toUpperCase()} **`);
    }
  }
  if (order.notes) {
    lines.push("");
    lines.push(divider());
    lines.push(`OBS GERAL: ${order.notes.toUpperCase()}`);
  }
  lines.push("");
  lines.push(divider("="));
  lines.push("\n\n\n");
  return lines.join("\n");
}

// ============ Impressão ============

async function printText(printerName: string, text: string) {
  const qz = await ensureQzConnected();
  // CP850 cobre acentos do português; usamos ESC/POS para inicializar a impressora,
  // selecionar a página de código e enviar comando de corte total ao final.
  const config = qz.configs.create(printerName, { encoding: "CP850" });
  const data = [
    // ESC @  -> inicializa impressora
    { type: "raw", format: "hex", data: "1B40" },
    // ESC t 2 -> seleciona codepage 2 (CP850 / Multilingual Latin 1)
    { type: "raw", format: "hex", data: "1B7402" },
    // Texto codificado em CP850
    { type: "raw", format: "plain", data: text },
    // Avanço de linhas antes do corte
    { type: "raw", format: "hex", data: "1B6404" },
    // GS V 0 -> corte total do papel
    { type: "raw", format: "hex", data: "1D5600" },
  ];
  await qz.print(config, data);
}

export async function printOrderReceipts(
  order: PrintOrder,
  opts: { storeName: string; cashierPrinter?: string | null; kitchenPrinter?: string | null }
): Promise<{ cashier: boolean; kitchen: boolean; errors: string[] }> {
  const result = { cashier: false, kitchen: false, errors: [] as string[] };
  try {
    await ensureQzConnected();
  } catch (e: any) {
    throw new Error(
      "QZ Tray não detectado. Certifique-se de que o programa de impressão está aberto no computador."
    );
  }

  if (opts.cashierPrinter) {
    try {
      await printText(opts.cashierPrinter, buildCashierReceipt(order, opts.storeName));
      result.cashier = true;
    } catch (e: any) {
      result.errors.push(`Caixa: ${e?.message ?? e}`);
    }
  } else {
    result.errors.push("Impressora do Caixa não configurada.");
  }

  if (opts.kitchenPrinter) {
    try {
      await printText(opts.kitchenPrinter, buildKitchenReceipt(order));
      result.kitchen = true;
    } catch (e: any) {
      result.errors.push(`Cozinha: ${e?.message ?? e}`);
    }
  } else {
    result.errors.push("Impressora da Cozinha não configurada.");
  }

  return result;
}
