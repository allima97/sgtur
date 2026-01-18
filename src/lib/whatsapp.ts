export function construirLinkWhatsApp(numero?: string | null, codigoPais?: string | null) {
  if (!numero) return null;
  const digits = numero.replace(/\D/g, "");
  if (!digits) return null;
  const countryDigits = (codigoPais || "").replace(/\D/g, "");
  const fullNumber =
    countryDigits && !digits.startsWith(countryDigits) ? `${countryDigits}${digits}` : digits;
  return `https://wa.me/${fullNumber}`;
}
