// Si alguien mete el sitio dentro de un iframe, lo saca a pantalla completa.
// Cloudflare ya manda X-Frame-Options y frame-ancestors; esto queda de
// respaldo por si el proxy se apaga. Va en un archivo y no inline para que la
// CSP no necesite 'unsafe-inline'.
if (top !== self) { top.location = self.location; }
