import { imageConfig } from "astro:assets";
import { isRemotePath } from "@astrojs/internal-helpers/path";
import { isRemoteAllowed } from "@astrojs/internal-helpers/remote";
const prerender = false;
const GET = (ctx) => {
  const href = ctx.url.searchParams.get("href");
  if (!href) {
    return new Response("Missing 'href' query parameter", {
      status: 400,
      statusText: "Missing 'href' query parameter"
    });
  }
  if (isRemotePath(href)) {
    if (isRemoteAllowed(href, imageConfig) === false) {
      return new Response("Forbidden", { status: 403 });
    } else {
      return Response.redirect(href, 302);
    }
  }
  const proxied = new URL(href, ctx.url.origin);
  if (proxied.origin !== ctx.url.origin) {
    return new Response("Forbidden", { status: 403 });
  }
  return fetch(proxied);
};
export {
  GET,
  prerender
};
