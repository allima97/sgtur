const EXCECOES = new Set([
  "de",
  "da",
  "do",
  "das",
  "dos",
  "e",
  "a",
  "o",
  "as",
  "os",
  "em",
  "para",
  "por",
]);

export function titleCaseWithExceptions(valor: string): string {
  const trimmed = (valor || "").trim();
  if (!trimmed) return "";

  return trimmed
    .split(/\s+/)
    .map((palavra, index) => {
      const lower = palavra.toLowerCase();
      if (index > 0 && EXCECOES.has(lower)) return lower;
      return lower.charAt(0).toUpperCase() + lower.slice(1);
    })
    .join(" ");
}
