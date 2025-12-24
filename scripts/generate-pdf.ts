import { chromium } from "playwright";
import fs from "fs";
import path from "path";

async function gerarPdf(url: string, outputPath: string) {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  await page.goto(url, { waitUntil: "networkidle" });

  const pdfBuffer = await page.pdf({
    format: "A4",
    printBackground: true,
    margin: {
      top: "20mm",
      bottom: "20mm",
      left: "15mm",
      right: "15mm",
    },
  });

  await browser.close();

  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, pdfBuffer);

  console.log(`PDF gerado em: ${outputPath}`);
}

const [, , route, filename] = process.argv;

if (!route || !filename) {
  console.error(
    "Uso: ts-node scripts/generate-pdf.ts <url> <arquivo.pdf>"
  );
  process.exit(1);
}

gerarPdf(route, filename).catch(console.error);
