import * as fs from "node:fs/promises";
import * as path from "node:path";
import * as url from "node:url";
function cloudflareModuleLoader(enabled) {
  const adaptersByExtension = enabled ? { ...defaultAdapters } : {};
  const extensions = Object.keys(adaptersByExtension);
  let isDev = false;
  const MAGIC_STRING = "__CLOUDFLARE_ASSET__";
  const replacements = [];
  return {
    name: "vite:cf-module-loader",
    enforce: "pre",
    configResolved(config) {
      isDev = config.command === "serve";
    },
    config(_, __) {
      return {
        assetsInclude: extensions.map((x) => `**/*${x}`),
        build: {
          rollupOptions: {
            // mark the wasm files as external so that they are not bundled and instead are loaded from the files
            external: extensions.map(
              (x) => new RegExp(`^${MAGIC_STRING}.+${escapeRegExp(x)}.mjs$`, "i")
            )
          }
        }
      };
    },
    async load(id, _) {
      const maybeExtension = extensions.find((x) => id.endsWith(x));
      const moduleType = maybeExtension && adaptersByExtension[maybeExtension] || void 0;
      if (!moduleType || !maybeExtension) {
        return;
      }
      if (!enabled) {
        throw new Error(
          `Cloudflare module loading is experimental. The ${maybeExtension} module cannot be loaded unless you add \`cloudflareModules: true\` to your astro config.`
        );
      }
      const moduleLoader = renderers[moduleType];
      const filePath = id.replace(/\?\w+$/, "");
      const extension = maybeExtension.replace(/\?\w+$/, "");
      const data = await fs.readFile(filePath);
      const base64 = data.toString("base64");
      const inlineModule = moduleLoader(data);
      if (isDev) {
        return inlineModule;
      }
      const hash = hashString(base64);
      const assetName = `${path.basename(filePath).split(".")[0]}.${hash}${extension}`;
      this.emitFile({
        type: "asset",
        // emit the data explicitly as an esset with `fileName` rather than `name` so that
        // vite doesn't give it a random hash-id in its name--We need to be able to easily rewrite from
        // the .mjs loader and the actual wasm asset later in the ESbuild for the worker
        fileName: assetName,
        source: data
      });
      const chunkId = this.emitFile({
        type: "prebuilt-chunk",
        fileName: `${assetName}.mjs`,
        code: inlineModule
      });
      return `import module from "${MAGIC_STRING}${chunkId}${extension}.mjs";export default module;`;
    },
    // output original wasm file relative to the chunk now that chunking has been achieved
    renderChunk(code, chunk, _) {
      if (isDev) return;
      if (!code.includes(MAGIC_STRING)) return;
      let replaced = code;
      for (const ext of extensions) {
        const extension = ext.replace(/\?\w+$/, "");
        replaced = replaced.replaceAll(
          new RegExp(`${MAGIC_STRING}([^\\s]+?)${escapeRegExp(extension)}\\.mjs`, "g"),
          (_s, assetId) => {
            const fileName = this.getFileName(assetId);
            const relativePath = path.relative(path.dirname(chunk.fileName), fileName).replaceAll("\\", "/");
            replacements.push({
              chunkName: chunk.name,
              cloudflareImport: relativePath.replace(/\.mjs$/, ""),
              nodejsImport: relativePath
            });
            return `./${relativePath}`;
          }
        );
      }
      return { code: replaced };
    },
    generateBundle(_, bundle) {
      const replacementsByChunkName = /* @__PURE__ */ new Map();
      for (const replacement of replacements) {
        const repls = replacementsByChunkName.get(replacement.chunkName) || [];
        if (!repls.length) {
          replacementsByChunkName.set(replacement.chunkName, repls);
        }
        repls.push(replacement);
      }
      for (const chunk of Object.values(bundle)) {
        const repls = chunk.name && replacementsByChunkName.get(chunk.name);
        for (const replacement of repls || []) {
          if (!replacement.fileName) {
            replacement.fileName = [];
          }
          replacement.fileName.push(chunk.fileName);
        }
      }
    },
    /**
     * Once prerendering is complete, restore the imports in the _worker.js to cloudflare compatible ones, removing the .mjs suffix.
     */
    async afterBuildCompleted(config) {
      const baseDir = url.fileURLToPath(config.outDir);
      const replacementsByFileName = /* @__PURE__ */ new Map();
      for (const replacement of replacements) {
        if (!replacement.fileName) {
          continue;
        }
        for (const fileName of replacement.fileName) {
          const repls = replacementsByFileName.get(fileName) || [];
          if (!repls.length) {
            replacementsByFileName.set(fileName, repls);
          }
          repls.push(replacement);
        }
      }
      for (const [fileName, repls] of replacementsByFileName.entries()) {
        const filepath = path.join(baseDir, "_worker.js", fileName);
        const contents = await fs.readFile(filepath, "utf-8");
        let updated = contents;
        for (const replacement of repls) {
          updated = updated.replaceAll(replacement.nodejsImport, replacement.cloudflareImport);
        }
        await fs.writeFile(filepath, updated, "utf-8");
      }
    }
  };
}
const renderers = {
  CompiledWasm(fileContents) {
    const base64 = fileContents.toString("base64");
    return `const wasmModule = new WebAssembly.Module(Uint8Array.from(atob("${base64}"), c => c.charCodeAt(0)));export default wasmModule;`;
  },
  Data(fileContents) {
    const base64 = fileContents.toString("base64");
    return `const binModule = Uint8Array.from(atob("${base64}"), c => c.charCodeAt(0)).buffer;export default binModule;`;
  },
  Text(fileContents) {
    const escaped = JSON.stringify(fileContents.toString("utf-8"));
    return `const stringModule = ${escaped};export default stringModule;`;
  }
};
const defaultAdapters = {
  // Loads '*.wasm?module' imports as WebAssembly modules, which is the only way to load WASM in cloudflare workers.
  // Current proposal for WASM modules: https://github.com/WebAssembly/esm-integration/tree/main/proposals/esm-integration
  ".wasm?module": "CompiledWasm",
  // treats the module as a WASM module
  ".wasm": "CompiledWasm",
  ".bin": "Data",
  ".txt": "Text"
};
function hashString(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash &= hash;
  }
  return new Uint32Array([hash])[0].toString(36);
}
function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
export {
  cloudflareModuleLoader
};
