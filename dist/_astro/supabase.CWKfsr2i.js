import{r as m}from"./index.DVhKKaGN.js";var l={exports:{}},t={};/**
 * @license React
 * react-jsx-runtime.production.min.js
 *
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */var f=m,_=Symbol.for("react.element"),h=Symbol.for("react.fragment"),b=Object.prototype.hasOwnProperty,g=f.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED.ReactCurrentOwner,v={key:!0,ref:!0,__self:!0,__source:!0};function d(s,e,o){var r,a={},n=null,i=null;o!==void 0&&(n=""+o),e.key!==void 0&&(n=""+e.key),e.ref!==void 0&&(i=e.ref);for(r in e)b.call(e,r)&&!v.hasOwnProperty(r)&&(a[r]=e[r]);if(s&&s.defaultProps)for(r in e=s.defaultProps,e)a[r]===void 0&&(a[r]=e[r]);return{$$typeof:_,type:s,key:n,ref:i,props:a,_owner:g.current}}t.Fragment=h;t.jsx=d;t.jsxs=d;l.exports=t;var y=l.exports;const p="ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_".split(""),u=` 	
\r=`.split("");(()=>{const s=new Array(128);for(let e=0;e<s.length;e+=1)s[e]=-1;for(let e=0;e<u.length;e+=1)s[u[e].charCodeAt(0)]=-2;for(let e=0;e<p.length;e+=1)s[p[e].charCodeAt(0)]=e;return s})();function k(s,e,o){throw new Error(`@supabase/ssr: Your project's URL and API key are required to create a Supabase client!

Check your Supabase project's API settings to find these values

https://supabase.com/dashboard/project/_/settings/api`)}var c={};if(typeof process<"u"&&c?.npm_package_name){const s=c.npm_package_name;["@supabase/auth-helpers-nextjs","@supabase/auth-helpers-react","@supabase/auth-helpers-remix","@supabase/auth-helpers-sveltekit"].includes(s)&&console.warn(`
╔════════════════════════════════════════════════════════════════════════════╗
║ ⚠️  IMPORTANT: Package Consolidation Notice                                ║
║                                                                            ║
║ The ${s.padEnd(35)} package name is deprecated.  ║
║                                                                            ║
║ You are now using @supabase/ssr - a unified solution for all frameworks.  ║
║                                                                            ║
║ The auth-helpers packages have been consolidated into @supabase/ssr       ║
║ to provide better maintenance and consistent APIs across frameworks.      ║
║                                                                            ║
║ Please update your package.json to use @supabase/ssr directly:            ║
║   npm uninstall ${s.padEnd(42)} ║
║   npm install @supabase/ssr                                               ║
║                                                                            ║
║ For more information, visit:                                              ║
║ https://supabase.com/docs/guides/auth/server-side                         ║
╚════════════════════════════════════════════════════════════════════════════╝
    `)}{const e=`Faltam variáveis de ambiente: ${["PUBLIC_SUPABASE_URL","PUBLIC_SUPABASE_ANON_KEY"].filter(Boolean).join(", ")}. Configure-as no Cloudflare Pages (Settings → Environment Variables) ou crie um .env.local com esses nomes. Consulte /test-env para validar.`;throw new Error(e)}const P=k();export{y as j,P as s};
