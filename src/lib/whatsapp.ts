export function construirLinkWhatsApp(numero?: string | null) {
  if (!numero) return null;
  const digits = numero.replace(/\D/g, "");
  if (!digits) return null;
  return `https://wa.me/${digits}`;
}
