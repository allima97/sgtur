import { App } from "astro/app";
import { handle } from "../utils/handler.js";
function createExports(manifest) {
  const app = new App(manifest);
  const fetch = async (request, env, context) => {
    return await handle(manifest, app, request, env, context);
  };
  return { default: { fetch } };
}
export {
  createExports
};
