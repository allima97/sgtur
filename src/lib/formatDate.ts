export function formatarDataParaExibicao(
  value?: string | Date | null,
  fallback = "-"
) {
  if (!value) return fallback;

  let iso: string | null = null;

  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return fallback;
    iso = value.toISOString().split("T")[0];
  } else {
    const str = value.toString();
    iso = str.split("T")[0];
  }

  const partes = iso.split("-");
  if (partes.length !== 3) return iso;

  const [ano, mes, dia] = partes;
  if (!ano || !mes || !dia) return iso;

  return `${dia}/${mes}/${ano}`;
}
