import React, { useRef, useState } from "react";

export default function ImportarVendasIsland() {
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault();
    if (!file) {
      setStatus("Selecione um arquivo Excel (.xlsx)");
      return;
    }
    setStatus("Enviando arquivo...");
    const formData = new FormData();
    formData.append("file", file);
    try {
      const resp = await fetch("/api/importar-vendas", {
        method: "POST",
        body: formData,
      });
      const data = await resp.json();
      if (resp.ok) {
        setStatus(`Importação concluída: ${data.importados} vendas importadas.`);
      } else {
        setStatus(data.error || "Erro ao importar arquivo.");
      }
    } catch (err) {
      setStatus("Erro ao enviar arquivo.");
    }
  }

  return (
    <div className="card-base card-config" style={{ maxWidth: 500, margin: "0 auto" }}>
      <h2>Importar Vendas (Excel)</h2>
      <form onSubmit={handleUpload}>
        <input
          type="file"
          accept=".xlsx"
          ref={inputRef}
          onChange={e => setFile(e.target.files?.[0] || null)}
          style={{ marginBottom: 12 }}
        />
        <button className="btn btn-primary" type="submit">Importar</button>
      </form>
      {status && <div style={{ marginTop: 12 }}>{status}</div>}
    </div>
  );
}
