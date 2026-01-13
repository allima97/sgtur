import type { Worker } from "tesseract.js";

let workerPromise: Promise<Worker> | null = null;
let healthcheckDone = false;

function ensureBrowser() {
  if (typeof window === "undefined") {
    throw new Error("OCR worker can only run in the browser.");
  }
}

async function runHealthcheck(worker: Worker) {
  if (healthcheckDone) return;
  healthcheckDone = true;
  try {
    const canvas = document.createElement("canvas");
    canvas.width = 160;
    canvas.height = 50;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#111";
    ctx.font = "28px Arial";
    ctx.fillText("TESTE 123", 10, 35);
    const { data } = await worker.recognize(canvas);
    const text = (data?.text || "").trim();
    if (!text) {
      console.warn("OCR healthcheck returned empty text.");
    } else {
      console.info("OCR healthcheck ok:", text);
    }
  } catch (err) {
    console.warn("OCR healthcheck failed:", err);
  }
}

export async function getOcrWorker(options?: { debug?: boolean }) {
  ensureBrowser();
  if (!workerPromise) {
    workerPromise = (async () => {
      const { createWorker } = await import("tesseract.js");
      const workerPath = (await import("tesseract.js/dist/worker.min.js?url")).default;
      const worker = await createWorker("por", 1, {
        langPath: "/tessdata",
        workerPath,
        gzip: false,
        logger: options?.debug ? (m) => console.log("[tesseract]", m) : () => {},
      });
      await runHealthcheck(worker);
      return worker;
    })();
  }
  return workerPromise;
}

export async function terminateOcrWorker() {
  if (!workerPromise) return;
  const worker = await workerPromise;
  await worker.terminate();
  workerPromise = null;
  healthcheckDone = false;
}
