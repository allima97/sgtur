import { chromium } from "playwright";
import fs from "fs";

async function saveAuthState() {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();

  // Abra a rota de login da sua aplicação
  await page.goto("http://localhost:4322/admin/login", { waitUntil: "networkidle" });

  console.log("Faça login manualmente no navegador…");
  await page.waitForTimeout(120000); // espera 2 minutos para login

  const state = await page.context().storageState();
  fs.writeFileSync("auth-state.json", JSON.stringify(state));

  console.log("Estado de autenticação salvo em auth-state.json");
  await browser.close();
}

saveAuthState().catch(console.error);
