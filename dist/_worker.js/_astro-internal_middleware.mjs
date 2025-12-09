globalThis.process ??= {}; globalThis.process.env ??= {};
import { d as defineMiddleware, s as sequence } from './chunks/index_lxR3KK-8.mjs';
import './chunks/index_B7ziYZkD.mjs';
import './chunks/astro-designed-error-pages_rzdOsq_2.mjs';

const onRequest$2 = defineMiddleware(async (context, next) => {
  const { url, cookies } = context;
  const pathname = url.pathname;
  const rotasPublicas = [
    "/auth/login",
    "/auth/register",
    "/auth/recover",
    "/auth/update-password",
    "/test-env",
    "/favicon",
    "/assets",
    "/public"
  ];
  rotasPublicas.some((r) => pathname.startsWith(r));
  {
    console.error(
      "PUBLIC_SUPABASE_URL ou PUBLIC_SUPABASE_ANON_KEY ausentes. Configure as variáveis de ambiente (Pages → Settings → Environment Variables)."
    );
    return new Response(
      "Faltam PUBLIC_SUPABASE_URL/PUBLIC_SUPABASE_ANON_KEY. Configure no Cloudflare Pages ou no .env local.",
      { status: 500 }
    );
  }
});

const When = {
                	Client: 'client',
                	Server: 'server',
                	Prerender: 'prerender',
                	StaticBuild: 'staticBuild',
                	DevServer: 'devServer',
              	};
            	
              const isBuildContext = Symbol.for('astro:when/buildContext');
              const whenAmI = globalThis[isBuildContext] ? When.Prerender : When.Server;

const middlewares = {
  [When.Client]: () => {
    throw new Error("Client should not run a middleware!");
  },
  [When.DevServer]: (_, next) => next(),
  [When.Server]: (_, next) => next(),
  [When.Prerender]: (ctx, next) => {
    if (ctx.locals.runtime === void 0) {
      ctx.locals.runtime = {
        env: process.env
      };
    }
    return next();
  },
  [When.StaticBuild]: (_, next) => next()
};
const onRequest$1 = middlewares[whenAmI];

const onRequest = sequence(
	onRequest$1,
	onRequest$2
	
);

export { onRequest };
