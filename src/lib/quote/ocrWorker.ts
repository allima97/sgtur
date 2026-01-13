import type { Worker } from "tesseract.js";

let workerPromise: Promise<Worker> | null = null;

function ensureBrowser() {
  if (typeof window === "undefined") {
    throw new Error("OCR worker can only run in the browser.");
  }
}

export async function getOcrWorker(options?: { debug?: boolean }) {
  ensureBrowser();

  if (!workerPromise) {
    workerPromise = (async () => {
      const { createWorker } = await import("tesseract.js");

      // Assets corretos para Vite/Astro (NÃO use tesseract.js-core)
      const workerPath = (await import("tesseract.js/dist/worker.min.js?url")).default;
      const corePath = "https://cdn.jsdelivr.net/npm/tesseract.js-core@v7.0.0";

      const worker = await createWorker("por", 1, {
        langPath: "/tessdata", // precisa existir em /public/tessdata/
        workerPath,
        corePath,
        gzip: false,
        logger: options?.debug ? (m) => console.log("[tesseract]", m) : () => {},
      });

      if (worker.setParameters) {
        await worker.setParameters({
          preserve_interword_spaces: "1",
          tessedit_pageseg_mode: "6",
        });
      }

      return worker;
    })();
  }

  return workerPromise;
}

export async function terminateOcrWorker() {
  if (!workerPromise) return;
  const w = await workerPromise;
  await w.terminate();
  workerPromise = null;
}
