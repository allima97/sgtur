globalThis.process ??= {}; globalThis.process.env ??= {};
const EXCECOES = /* @__PURE__ */ new Set([
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
  "por"
]);
function titleCaseWithExceptions(valor) {
  const trimmed = (valor || "").trim();
  if (!trimmed) return "";
  return trimmed.split(/\s+/).map((palavra, index) => {
    const lower = palavra.toLowerCase();
    if (index > 0 && EXCECOES.has(lower)) return lower;
    return lower.charAt(0).toUpperCase() + lower.slice(1);
  }).join(" ");
}

export { titleCaseWithExceptions as t };
