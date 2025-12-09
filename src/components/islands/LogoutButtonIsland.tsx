import React, { useState } from "react";
import { logoutUsuario } from "../../lib/logout";

export default function LogoutButtonIsland() {
  const [loading, setLoading] = useState(false);

  async function handleLogout() {
    setLoading(true);
    await logoutUsuario();
    setLoading(false);
  }

  return (
    <button
      type="button"
      className="menu-logout"
      onClick={handleLogout}
      style={{
        width: "100%",
        textAlign: "left",
        background: "transparent",
        border: "none",
        color: "#f43f5e",
        fontWeight: "bold",
        padding: "8px 12px",
        cursor: "pointer",
      }}
      disabled={loading}
    >
      {loading ? "Saindo..." : "Sair"}
    </button>
  );
}
