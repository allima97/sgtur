import React, { useEffect, useState, useMemo, useRef } from "react";

export default function DocumentationPortalIsland() {
  const [raw, setRaw] = useState("Carregando documentação...");
  const [search, setSearch] = useState("");

  const contentRef = useRef<HTMLDivElement>(null);
  const [activeId, setActiveId] = useState("");

  // ==========================================================
  // 1) CARREGAR O ARQUIVO MD
  // ==========================================================
  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/SGVTUR_DOCUMENTACAO.md");
        const text = await res.text();
        setRaw(text);
      } catch (e) {
        setRaw("Erro ao carregar documentação.");
      }
    }
    load();
  }, []);

  // ==========================================================
  // 2) PARSE SIMPLES DE MARKDOWN → HTML
  // (com ids automáticos para navegação)
  // ==========================================================
  function mdToHtml(md: string) {
    let html = md;

    // IDs automáticos
    html = html.replace(/^### (.*)$/gim, (_, title) => {
      const id = slug(title);
      return `<h3 id="${id}">${title}</h3>`;
    });

    html = html.replace(/^## (.*)$/gim, (_, title) => {
      const id = slug(title);
      return `<h2 id="${id}">${title}</h2>`;
    });

    html = html.replace(/^# (.*)$/gim, (_, title) => {
      const id = slug(title);
      return `<h1 id="${id}">${title}</h1>`;
    });

    // Negrito
    html = html.replace(/\*\*(.*?)\*\*/gim, "<strong>$1</strong>");

    // Itálico
    html = html.replace(/\*(.*?)\*/gim, "<em>$1</em>");

    // Listas
    html = html.replace(/^- (.*)$/gim, "<li>$1</li>");

    html = html.replace(/\n{2,}/g, "<br/><br/>");

    return html;
  }

  const htmlContent = useMemo(() => mdToHtml(raw), [raw]);

  // ==========================================================
  // 3) GERAR SUMÁRIO AUTOMÁTICO
  // ==========================================================
  const toc = useMemo(() => {
    const lines = raw.split("\n");
    const items: { level: number; title: string; id: string }[] = [];

    for (const line of lines) {
      if (line.startsWith("# ")) {
        const title = line.replace("# ", "").trim();
        items.push({ level: 1, title, id: slug(title) });
      }
      if (line.startsWith("## ")) {
        const title = line.replace("## ", "").trim();
        items.push({ level: 2, title, id: slug(title) });
      }
      if (line.startsWith("### ")) {
        const title = line.replace("### ", "").trim();
        items.push({ level: 3, title, id: slug(title) });
      }
    }

    return items;
  }, [raw]);

  function slug(text: string) {
    return text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
  }

  // ==========================================================
  // 4) SCROLL SPY (destaca sessão ativa)
  // ==========================================================
  useEffect(() => {
    const el = contentRef.current;
    if (!el) return;

    function onScroll() {
      const headers = el.querySelectorAll("h1, h2, h3");
      let current = "";

      headers.forEach((h) => {
        const rect = h.getBoundingClientRect();
        if (rect.top >= 0 && rect.top < 200) {
          current = h.id;
        }
      });

      if (current && current !== activeId) {
        setActiveId(current);
      }
    }

    el.addEventListener("scroll", onScroll);
    return () => el.removeEventListener("scroll", onScroll);
  }, [htmlContent]);

  // ==========================================================
  // 5) FILTRAR DOCUMENTAÇÃO POR PESQUISA
  // ==========================================================
  const filteredHTML = useMemo(() => {
    if (!search.trim()) return htmlContent;

    const regex = new RegExp(search, "gi");
    return htmlContent.replace(regex, (m) => `<mark>${m}</mark>`);
  }, [search, htmlContent]);

  // ==========================================================
  // UI FINAL
  // ==========================================================

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "260px 1fr",
        gap: "20px",
      }}
    >
      {/* PAINEL LATERAL */}
      <aside
        className="card-base card-blue"
        style={{
          height: "calc(100vh - 200px)",
          overflowY: "auto",
          padding: "15px",
          position: "sticky",
          top: "110px",
        }}
      >
        <h3 style={{ marginBottom: "10px" }}>📘 Sumário</h3>

        <input
          type="text"
          className="form-input"
          placeholder="Pesquisar..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ marginBottom: "15px" }}
        />

        {toc.map((item) => (
          <div
            key={item.id}
            style={{
              marginLeft: `${(item.level - 1) * 15}px`,
              marginBottom: "6px",
            }}
          >
            <a
              href={`#${item.id}`}
              style={{
                textDecoration: activeId === item.id ? "underline" : "none",
                fontWeight: activeId === item.id ? "bold" : "normal",
              }}
            >
              {item.title}
            </a>
          </div>
        ))}
      </aside>

      {/* CONTEÚDO PRINCIPAL */}
      <div
        ref={contentRef}
        className="card-base card-blue"
        style={{
          padding: "20px",
          height: "calc(100vh - 200px)",
          overflowY: "auto",
          lineHeight: 1.6,
        }}
        dangerouslySetInnerHTML={{ __html: filteredHTML }}
      />
    </div>
  );
}
