globalThis.process ??= {}; globalThis.process.env ??= {};
import { r as reactExports } from './_@astro-renderers_lNEyfHhP.mjs';
import { i as isBrowser, c as createStorageFromOptions, V as VERSION } from './index_j26q7bMs.mjs';
import { c as createClient } from './wrapper_6q0T_V9b.mjs';

let cachedBrowserClient;
function createBrowserClient(supabaseUrl, supabaseKey, options) {
    // singleton client is created only if isSingleton is set to true, or if isSingleton is not defined and we detect a browser
    const shouldUseSingleton = options?.isSingleton === true ||
        ((!options || !("isSingleton" in options)) && isBrowser());
    if (shouldUseSingleton && cachedBrowserClient) {
        return cachedBrowserClient;
    }
    const { storage } = createStorageFromOptions({
        ...options,
        cookieEncoding: options?.cookieEncoding ?? "base64url",
    }, false);
    const client = createClient(supabaseUrl, supabaseKey, {
        // TODO: resolve type error
        ...options,
        global: {
            ...options?.global,
            headers: {
                ...options?.global?.headers,
                "X-Client-Info": `supabase-ssr/${VERSION} createBrowserClient`,
            },
        },
        auth: {
            ...options?.auth,
            ...(options?.cookieOptions?.name
                ? { storageKey: options.cookieOptions.name }
                : null),
            flowType: "pkce",
            autoRefreshToken: isBrowser(),
            detectSessionInUrl: isBrowser(),
            persistSession: true,
            storage,
            ...(options?.cookies &&
                "encode" in options.cookies &&
                options.cookies.encode === "tokens-only"
                ? {
                    userStorage: options?.auth?.userStorage ?? window.localStorage,
                }
                : null),
        },
    });
    if (shouldUseSingleton) {
        cachedBrowserClient = client;
    }
    return client;
}

var jsxRuntime = {exports: {}};

var reactJsxRuntime_production_min = {};

/**
 * @license React
 * react-jsx-runtime.production.min.js
 *
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
var f=reactExports,k=Symbol.for("react.element"),l=Symbol.for("react.fragment"),m=Object.prototype.hasOwnProperty,n=f.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED.ReactCurrentOwner,p={key:true,ref:true,__self:true,__source:true};
function q(c,a,g){var b,d={},e=null,h=null;void 0!==g&&(e=""+g);void 0!==a.key&&(e=""+a.key);void 0!==a.ref&&(h=a.ref);for(b in a)m.call(a,b)&&!p.hasOwnProperty(b)&&(d[b]=a[b]);if(c&&c.defaultProps)for(b in a=c.defaultProps,a) void 0===d[b]&&(d[b]=a[b]);return {$$typeof:k,type:c,key:e,ref:h,props:d,_owner:n.current}}reactJsxRuntime_production_min.Fragment=l;reactJsxRuntime_production_min.jsx=q;reactJsxRuntime_production_min.jsxs=q;

{
  jsxRuntime.exports = reactJsxRuntime_production_min;
}

var jsxRuntimeExports = jsxRuntime.exports;

const supabaseUrl = "https://ggqmvruerbaqxthhnxrm.supabase.co";
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdncW12cnVlcmJhcXh0aGhueHJtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ3NjM0NzgsImV4cCI6MjA4MDMzOTQ3OH0.W3msgFUJMFSMOmAuvmI4QE3azppGYPdzGRZcfe9c9Bc";
const supabaseProjectRef = supabaseUrl?.match(/https:\/\/([a-z0-9-]+)\.supabase\.co/i)?.[1] ?? "";
const supabaseCookieName = supabaseProjectRef ? `sb-${supabaseProjectRef}-auth-token` : "sb-auth-token";
const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey, {
  cookieOptions: {
    name: supabaseCookieName,
    path: "/",
    sameSite: "lax"
  }
});

const SYSTEM_NAME = "SGVTur";

export { SYSTEM_NAME as S, jsxRuntimeExports as j, supabase as s };
