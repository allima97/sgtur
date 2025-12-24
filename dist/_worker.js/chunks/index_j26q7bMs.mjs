globalThis.process ??= {}; globalThis.process.env ??= {};
const VERSION = '0.8.0';

var dist = {};

Object.defineProperty(dist, "__esModule", { value: true });
dist.parseCookie = parseCookie;
var parse = dist.parse = parseCookie;
dist.stringifyCookie = stringifyCookie;
dist.stringifySetCookie = stringifySetCookie;
var serialize = dist.serialize = stringifySetCookie;
dist.parseSetCookie = parseSetCookie;
dist.stringifySetCookie = stringifySetCookie;
serialize = dist.serialize = stringifySetCookie;
/**
 * RegExp to match cookie-name in RFC 6265 sec 4.1.1
 * This refers out to the obsoleted definition of token in RFC 2616 sec 2.2
 * which has been replaced by the token definition in RFC 7230 appendix B.
 *
 * cookie-name       = token
 * token             = 1*tchar
 * tchar             = "!" / "#" / "$" / "%" / "&" / "'" /
 *                     "*" / "+" / "-" / "." / "^" / "_" /
 *                     "`" / "|" / "~" / DIGIT / ALPHA
 *
 * Note: Allowing more characters - https://github.com/jshttp/cookie/issues/191
 * Allow same range as cookie value, except `=`, which delimits end of name.
 */
const cookieNameRegExp = /^[\u0021-\u003A\u003C\u003E-\u007E]+$/;
/**
 * RegExp to match cookie-value in RFC 6265 sec 4.1.1
 *
 * cookie-value      = *cookie-octet / ( DQUOTE *cookie-octet DQUOTE )
 * cookie-octet      = %x21 / %x23-2B / %x2D-3A / %x3C-5B / %x5D-7E
 *                     ; US-ASCII characters excluding CTLs,
 *                     ; whitespace DQUOTE, comma, semicolon,
 *                     ; and backslash
 *
 * Allowing more characters: https://github.com/jshttp/cookie/issues/191
 * Comma, backslash, and DQUOTE are not part of the parsing algorithm.
 */
const cookieValueRegExp = /^[\u0021-\u003A\u003C-\u007E]*$/;
/**
 * RegExp to match domain-value in RFC 6265 sec 4.1.1
 *
 * domain-value      = <subdomain>
 *                     ; defined in [RFC1034], Section 3.5, as
 *                     ; enhanced by [RFC1123], Section 2.1
 * <subdomain>       = <label> | <subdomain> "." <label>
 * <label>           = <let-dig> [ [ <ldh-str> ] <let-dig> ]
 *                     Labels must be 63 characters or less.
 *                     'let-dig' not 'letter' in the first char, per RFC1123
 * <ldh-str>         = <let-dig-hyp> | <let-dig-hyp> <ldh-str>
 * <let-dig-hyp>     = <let-dig> | "-"
 * <let-dig>         = <letter> | <digit>
 * <letter>          = any one of the 52 alphabetic characters A through Z in
 *                     upper case and a through z in lower case
 * <digit>           = any one of the ten digits 0 through 9
 *
 * Keep support for leading dot: https://github.com/jshttp/cookie/issues/173
 *
 * > (Note that a leading %x2E ("."), if present, is ignored even though that
 * character is not permitted, but a trailing %x2E ("."), if present, will
 * cause the user agent to ignore the attribute.)
 */
const domainValueRegExp = /^([.]?[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)([.][a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)*$/i;
/**
 * RegExp to match path-value in RFC 6265 sec 4.1.1
 *
 * path-value        = <any CHAR except CTLs or ";">
 * CHAR              = %x01-7F
 *                     ; defined in RFC 5234 appendix B.1
 */
const pathValueRegExp = /^[\u0020-\u003A\u003D-\u007E]*$/;
/**
 * RegExp to match max-age-value in RFC 6265 sec 5.6.2
 */
const maxAgeRegExp = /^-?\d+$/;
const __toString = Object.prototype.toString;
const NullObject = /* @__PURE__ */ (() => {
    const C = function () { };
    C.prototype = Object.create(null);
    return C;
})();
/**
 * Parse a `Cookie` header.
 *
 * Parse the given cookie header string into an object
 * The object has the various cookies as keys(names) => values
 */
function parseCookie(str, options) {
    const obj = new NullObject();
    const len = str.length;
    // RFC 6265 sec 4.1.1, RFC 2616 2.2 defines a cookie name consists of one char minimum, plus '='.
    if (len < 2)
        return obj;
    const dec = options?.decode || decode;
    let index = 0;
    do {
        const eqIdx = eqIndex(str, index, len);
        if (eqIdx === -1)
            break; // No more cookie pairs.
        const endIdx = endIndex(str, index, len);
        if (eqIdx > endIdx) {
            // backtrack on prior semicolon
            index = str.lastIndexOf(";", eqIdx - 1) + 1;
            continue;
        }
        const key = valueSlice(str, index, eqIdx);
        // only assign once
        if (obj[key] === undefined) {
            obj[key] = dec(valueSlice(str, eqIdx + 1, endIdx));
        }
        index = endIdx + 1;
    } while (index < len);
    return obj;
}
/**
 * Stringifies an object into an HTTP `Cookie` header.
 */
function stringifyCookie(cookie, options) {
    const enc = options?.encode || encodeURIComponent;
    const cookieStrings = [];
    for (const name of Object.keys(cookie)) {
        const val = cookie[name];
        if (val === undefined)
            continue;
        if (!cookieNameRegExp.test(name)) {
            throw new TypeError(`cookie name is invalid: ${name}`);
        }
        const value = enc(val);
        if (!cookieValueRegExp.test(value)) {
            throw new TypeError(`cookie val is invalid: ${val}`);
        }
        cookieStrings.push(`${name}=${value}`);
    }
    return cookieStrings.join("; ");
}
function stringifySetCookie(_name, _val, _opts) {
    const cookie = typeof _name === "object"
        ? _name
        : { ..._opts, name: _name, value: String(_val) };
    const options = typeof _val === "object" ? _val : _opts;
    const enc = options?.encode || encodeURIComponent;
    if (!cookieNameRegExp.test(cookie.name)) {
        throw new TypeError(`argument name is invalid: ${cookie.name}`);
    }
    const value = cookie.value ? enc(cookie.value) : "";
    if (!cookieValueRegExp.test(value)) {
        throw new TypeError(`argument val is invalid: ${cookie.value}`);
    }
    let str = cookie.name + "=" + value;
    if (cookie.maxAge !== undefined) {
        if (!Number.isInteger(cookie.maxAge)) {
            throw new TypeError(`option maxAge is invalid: ${cookie.maxAge}`);
        }
        str += "; Max-Age=" + cookie.maxAge;
    }
    if (cookie.domain) {
        if (!domainValueRegExp.test(cookie.domain)) {
            throw new TypeError(`option domain is invalid: ${cookie.domain}`);
        }
        str += "; Domain=" + cookie.domain;
    }
    if (cookie.path) {
        if (!pathValueRegExp.test(cookie.path)) {
            throw new TypeError(`option path is invalid: ${cookie.path}`);
        }
        str += "; Path=" + cookie.path;
    }
    if (cookie.expires) {
        if (!isDate(cookie.expires) || !Number.isFinite(cookie.expires.valueOf())) {
            throw new TypeError(`option expires is invalid: ${cookie.expires}`);
        }
        str += "; Expires=" + cookie.expires.toUTCString();
    }
    if (cookie.httpOnly) {
        str += "; HttpOnly";
    }
    if (cookie.secure) {
        str += "; Secure";
    }
    if (cookie.partitioned) {
        str += "; Partitioned";
    }
    if (cookie.priority) {
        const priority = typeof cookie.priority === "string"
            ? cookie.priority.toLowerCase()
            : undefined;
        switch (priority) {
            case "low":
                str += "; Priority=Low";
                break;
            case "medium":
                str += "; Priority=Medium";
                break;
            case "high":
                str += "; Priority=High";
                break;
            default:
                throw new TypeError(`option priority is invalid: ${cookie.priority}`);
        }
    }
    if (cookie.sameSite) {
        const sameSite = typeof cookie.sameSite === "string"
            ? cookie.sameSite.toLowerCase()
            : cookie.sameSite;
        switch (sameSite) {
            case true:
            case "strict":
                str += "; SameSite=Strict";
                break;
            case "lax":
                str += "; SameSite=Lax";
                break;
            case "none":
                str += "; SameSite=None";
                break;
            default:
                throw new TypeError(`option sameSite is invalid: ${cookie.sameSite}`);
        }
    }
    return str;
}
/**
 * Deserialize a `Set-Cookie` header into an object.
 *
 * deserialize('foo=bar; httpOnly')
 *   => { name: 'foo', value: 'bar', httpOnly: true }
 */
function parseSetCookie(str, options) {
    const dec = options?.decode || decode;
    const len = str.length;
    const endIdx = endIndex(str, 0, len);
    const eqIdx = eqIndex(str, 0, endIdx);
    const setCookie = eqIdx === -1
        ? { name: "", value: dec(valueSlice(str, 0, endIdx)) }
        : {
            name: valueSlice(str, 0, eqIdx),
            value: dec(valueSlice(str, eqIdx + 1, endIdx)),
        };
    let index = endIdx + 1;
    while (index < len) {
        const endIdx = endIndex(str, index, len);
        const eqIdx = eqIndex(str, index, endIdx);
        const attr = eqIdx === -1
            ? valueSlice(str, index, endIdx)
            : valueSlice(str, index, eqIdx);
        const val = eqIdx === -1 ? undefined : valueSlice(str, eqIdx + 1, endIdx);
        switch (attr.toLowerCase()) {
            case "httponly":
                setCookie.httpOnly = true;
                break;
            case "secure":
                setCookie.secure = true;
                break;
            case "partitioned":
                setCookie.partitioned = true;
                break;
            case "domain":
                setCookie.domain = val;
                break;
            case "path":
                setCookie.path = val;
                break;
            case "max-age":
                if (val && maxAgeRegExp.test(val))
                    setCookie.maxAge = Number(val);
                break;
            case "expires":
                if (!val)
                    break;
                const date = new Date(val);
                if (Number.isFinite(date.valueOf()))
                    setCookie.expires = date;
                break;
            case "priority":
                if (!val)
                    break;
                const priority = val.toLowerCase();
                if (priority === "low" ||
                    priority === "medium" ||
                    priority === "high") {
                    setCookie.priority = priority;
                }
                break;
            case "samesite":
                if (!val)
                    break;
                const sameSite = val.toLowerCase();
                if (sameSite === "lax" ||
                    sameSite === "strict" ||
                    sameSite === "none") {
                    setCookie.sameSite = sameSite;
                }
                break;
        }
        index = endIdx + 1;
    }
    return setCookie;
}
/**
 * Find the `;` character between `min` and `len` in str.
 */
function endIndex(str, min, len) {
    const index = str.indexOf(";", min);
    return index === -1 ? len : index;
}
/**
 * Find the `=` character between `min` and `max` in str.
 */
function eqIndex(str, min, max) {
    const index = str.indexOf("=", min);
    return index < max ? index : -1;
}
/**
 * Slice out a value between startPod to max.
 */
function valueSlice(str, min, max) {
    let start = min;
    let end = max;
    do {
        const code = str.charCodeAt(start);
        if (code !== 0x20 /*   */ && code !== 0x09 /* \t */)
            break;
    } while (++start < end);
    while (end > start) {
        const code = str.charCodeAt(end - 1);
        if (code !== 0x20 /*   */ && code !== 0x09 /* \t */)
            break;
        end--;
    }
    return str.slice(start, end);
}
/**
 * URL-decode string value. Optimized to skip native call when no %.
 */
function decode(str) {
    if (str.indexOf("%") === -1)
        return str;
    try {
        return decodeURIComponent(str);
    }
    catch (e) {
        return str;
    }
}
/**
 * Determine if value is a Date.
 */
function isDate(val) {
    return __toString.call(val) === "[object Date]";
}

function isBrowser() {
    return (typeof window !== "undefined" && typeof window.document !== "undefined");
}
/**
 * Returns a localStorage-like object that stores the key-value pairs in
 * memory.
 */
function memoryLocalStorageAdapter(store = {}) {
    return {
        getItem: (key) => {
            return store[key] || null;
        },
        setItem: (key, value) => {
            store[key] = value;
        },
        removeItem: (key) => {
            delete store[key];
        },
    };
}

const DEFAULT_COOKIE_OPTIONS = {
    path: "/",
    sameSite: "lax",
    httpOnly: false,
    // https://developer.chrome.com/blog/cookie-max-age-expires
    // https://httpwg.org/http-extensions/draft-ietf-httpbis-rfc6265bis.html#name-cookie-lifetime-limits
    maxAge: 400 * 24 * 60 * 60,
};

const MAX_CHUNK_SIZE = 3180;
const CHUNK_LIKE_REGEX = /^(.*)[.](0|[1-9][0-9]*)$/;
function isChunkLike(cookieName, key) {
    if (cookieName === key) {
        return true;
    }
    const chunkLike = cookieName.match(CHUNK_LIKE_REGEX);
    if (chunkLike && chunkLike[1] === key) {
        return true;
    }
    return false;
}
/**
 * create chunks from a string and return an array of object
 */
function createChunks(key, value, chunkSize) {
    const resolvedChunkSize = MAX_CHUNK_SIZE;
    let encodedValue = encodeURIComponent(value);
    if (encodedValue.length <= resolvedChunkSize) {
        return [{ name: key, value }];
    }
    const chunks = [];
    while (encodedValue.length > 0) {
        let encodedChunkHead = encodedValue.slice(0, resolvedChunkSize);
        const lastEscapePos = encodedChunkHead.lastIndexOf("%");
        // Check if the last escaped character is truncated.
        if (lastEscapePos > resolvedChunkSize - 3) {
            // If so, reslice the string to exclude the whole escape sequence.
            // We only reduce the size of the string as the chunk must
            // be smaller than the chunk size.
            encodedChunkHead = encodedChunkHead.slice(0, lastEscapePos);
        }
        let valueHead = "";
        // Check if the chunk was split along a valid unicode boundary.
        while (encodedChunkHead.length > 0) {
            try {
                // Try to decode the chunk back and see if it is valid.
                // Stop when the chunk is valid.
                valueHead = decodeURIComponent(encodedChunkHead);
                break;
            }
            catch (error) {
                if (error instanceof URIError &&
                    encodedChunkHead.at(-3) === "%" &&
                    encodedChunkHead.length > 3) {
                    encodedChunkHead = encodedChunkHead.slice(0, encodedChunkHead.length - 3);
                }
                else {
                    throw error;
                }
            }
        }
        chunks.push(valueHead);
        encodedValue = encodedValue.slice(encodedChunkHead.length);
    }
    return chunks.map((value, i) => ({ name: `${key}.${i}`, value }));
}
// Get fully constructed chunks
async function combineChunks(key, retrieveChunk) {
    const value = await retrieveChunk(key);
    if (value) {
        return value;
    }
    let values = [];
    for (let i = 0;; i++) {
        const chunkName = `${key}.${i}`;
        const chunk = await retrieveChunk(chunkName);
        if (!chunk) {
            break;
        }
        values.push(chunk);
    }
    if (values.length > 0) {
        return values.join("");
    }
    return null;
}

/**
 * Avoid modifying this file. It's part of
 * https://github.com/supabase-community/base64url-js.  Submit all fixes on
 * that repo!
 */
/**
 * An array of characters that encode 6 bits into a Base64-URL alphabet
 * character.
 */
const TO_BASE64URL = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_".split("");
/**
 * An array of characters that can appear in a Base64-URL encoded string but
 * should be ignored.
 */
const IGNORE_BASE64URL = " \t\n\r=".split("");
/**
 * An array of 128 numbers that map a Base64-URL character to 6 bits, or if -2
 * used to skip the character, or if -1 used to error out.
 */
const FROM_BASE64URL = (() => {
    const charMap = new Array(128);
    for (let i = 0; i < charMap.length; i += 1) {
        charMap[i] = -1;
    }
    for (let i = 0; i < IGNORE_BASE64URL.length; i += 1) {
        charMap[IGNORE_BASE64URL[i].charCodeAt(0)] = -2;
    }
    for (let i = 0; i < TO_BASE64URL.length; i += 1) {
        charMap[TO_BASE64URL[i].charCodeAt(0)] = i;
    }
    return charMap;
})();
/**
 * Converts a JavaScript string (which may include any valid character) into a
 * Base64-URL encoded string. The string is first encoded in UTF-8 which is
 * then encoded as Base64-URL.
 *
 * @param str The string to convert.
 */
function stringToBase64URL(str) {
    const base64 = [];
    let queue = 0;
    let queuedBits = 0;
    const emitter = (byte) => {
        queue = (queue << 8) | byte;
        queuedBits += 8;
        while (queuedBits >= 6) {
            const pos = (queue >> (queuedBits - 6)) & 63;
            base64.push(TO_BASE64URL[pos]);
            queuedBits -= 6;
        }
    };
    stringToUTF8(str, emitter);
    if (queuedBits > 0) {
        queue = queue << (6 - queuedBits);
        queuedBits = 6;
        while (queuedBits >= 6) {
            const pos = (queue >> (queuedBits - 6)) & 63;
            base64.push(TO_BASE64URL[pos]);
            queuedBits -= 6;
        }
    }
    return base64.join("");
}
/**
 * Converts a Base64-URL encoded string into a JavaScript string. It is assumed
 * that the underlying string has been encoded as UTF-8.
 *
 * @param str The Base64-URL encoded string.
 */
function stringFromBase64URL(str) {
    const conv = [];
    const emit = (codepoint) => {
        conv.push(String.fromCodePoint(codepoint));
    };
    const state = {
        utf8seq: 0,
        codepoint: 0,
    };
    let queue = 0;
    let queuedBits = 0;
    for (let i = 0; i < str.length; i += 1) {
        const codepoint = str.charCodeAt(i);
        const bits = FROM_BASE64URL[codepoint];
        if (bits > -1) {
            // valid Base64-URL character
            queue = (queue << 6) | bits;
            queuedBits += 6;
            while (queuedBits >= 8) {
                stringFromUTF8((queue >> (queuedBits - 8)) & 0xff, state, emit);
                queuedBits -= 8;
            }
        }
        else if (bits === -2) {
            // ignore spaces, tabs, newlines, =
            continue;
        }
        else {
            throw new Error(`Invalid Base64-URL character "${str.at(i)}" at position ${i}`);
        }
    }
    return conv.join("");
}
/**
 * Converts a Unicode codepoint to a multi-byte UTF-8 sequence.
 *
 * @param codepoint The Unicode codepoint.
 * @param emit      Function which will be called for each UTF-8 byte that represents the codepoint.
 */
function codepointToUTF8(codepoint, emit) {
    if (codepoint <= 0x7f) {
        emit(codepoint);
        return;
    }
    else if (codepoint <= 0x7ff) {
        emit(0xc0 | (codepoint >> 6));
        emit(0x80 | (codepoint & 0x3f));
        return;
    }
    else if (codepoint <= 0xffff) {
        emit(0xe0 | (codepoint >> 12));
        emit(0x80 | ((codepoint >> 6) & 0x3f));
        emit(0x80 | (codepoint & 0x3f));
        return;
    }
    else if (codepoint <= 0x10ffff) {
        emit(0xf0 | (codepoint >> 18));
        emit(0x80 | ((codepoint >> 12) & 0x3f));
        emit(0x80 | ((codepoint >> 6) & 0x3f));
        emit(0x80 | (codepoint & 0x3f));
        return;
    }
    throw new Error(`Unrecognized Unicode codepoint: ${codepoint.toString(16)}`);
}
/**
 * Converts a JavaScript string to a sequence of UTF-8 bytes.
 *
 * @param str  The string to convert to UTF-8.
 * @param emit Function which will be called for each UTF-8 byte of the string.
 */
function stringToUTF8(str, emit) {
    for (let i = 0; i < str.length; i += 1) {
        let codepoint = str.charCodeAt(i);
        if (codepoint > 0xd7ff && codepoint <= 0xdbff) {
            // most UTF-16 codepoints are Unicode codepoints, except values in this
            // range where the next UTF-16 codepoint needs to be combined with the
            // current one to get the Unicode codepoint
            const highSurrogate = ((codepoint - 0xd800) * 0x400) & 0xffff;
            const lowSurrogate = (str.charCodeAt(i + 1) - 0xdc00) & 0xffff;
            codepoint = (lowSurrogate | highSurrogate) + 0x10000;
            i += 1;
        }
        codepointToUTF8(codepoint, emit);
    }
}
/**
 * Converts a UTF-8 byte to a Unicode codepoint.
 *
 * @param byte  The UTF-8 byte next in the sequence.
 * @param state The shared state between consecutive UTF-8 bytes in the
 *              sequence, an object with the shape `{ utf8seq: 0, codepoint: 0 }`.
 * @param emit  Function which will be called for each codepoint.
 */
function stringFromUTF8(byte, state, emit) {
    if (state.utf8seq === 0) {
        if (byte <= 0x7f) {
            emit(byte);
            return;
        }
        // count the number of 1 leading bits until you reach 0
        for (let leadingBit = 1; leadingBit < 6; leadingBit += 1) {
            if (((byte >> (7 - leadingBit)) & 1) === 0) {
                state.utf8seq = leadingBit;
                break;
            }
        }
        if (state.utf8seq === 2) {
            state.codepoint = byte & 31;
        }
        else if (state.utf8seq === 3) {
            state.codepoint = byte & 15;
        }
        else if (state.utf8seq === 4) {
            state.codepoint = byte & 7;
        }
        else {
            throw new Error("Invalid UTF-8 sequence");
        }
        state.utf8seq -= 1;
    }
    else if (state.utf8seq > 0) {
        if (byte <= 0x7f) {
            throw new Error("Invalid UTF-8 sequence");
        }
        state.codepoint = (state.codepoint << 6) | (byte & 63);
        state.utf8seq -= 1;
        if (state.utf8seq === 0) {
            emit(state.codepoint);
        }
    }
}

const BASE64_PREFIX = "base64-";
/**
 * Creates a storage client that handles cookies correctly for browser and
 * server clients with or without properly provided cookie methods.
 *
 * @param options The options passed to createBrowserClient or createServer client.
 *
 * @param isServerClient Whether it's called from createServerClient.
 */
function createStorageFromOptions(options, isServerClient) {
    const cookies = options.cookies ?? null;
    const cookieEncoding = options.cookieEncoding;
    const setItems = {};
    const removedItems = {};
    let getAll;
    let setAll;
    if (cookies) {
        if ("get" in cookies) {
            // Just get is not enough, because the client needs to see what cookies
            // are already set and unset them if necessary. To attempt to fix this
            // behavior for most use cases, we pass "hints" which is the keys of the
            // storage items. They are then converted to their corresponding cookie
            // chunk names and are fetched with get. Only 5 chunks are fetched, which
            // should be enough for the majority of use cases, but does not solve
            // those with very large sessions.
            const getWithHints = async (keyHints) => {
                // optimistically find the first 5 potential chunks for the specified key
                const chunkNames = keyHints.flatMap((keyHint) => [
                    keyHint,
                    ...Array.from({ length: 5 }).map((_, i) => `${keyHint}.${i}`),
                ]);
                const chunks = [];
                for (let i = 0; i < chunkNames.length; i += 1) {
                    const value = await cookies.get(chunkNames[i]);
                    if (!value && typeof value !== "string") {
                        continue;
                    }
                    chunks.push({ name: chunkNames[i], value });
                }
                // TODO: detect and log stale chunks error
                return chunks;
            };
            getAll = async (keyHints) => await getWithHints(keyHints);
            if ("set" in cookies && "remove" in cookies) {
                setAll = async (setCookies) => {
                    for (let i = 0; i < setCookies.length; i += 1) {
                        const { name, value, options } = setCookies[i];
                        if (value) {
                            await cookies.set(name, value, options);
                        }
                        else {
                            await cookies.remove(name, options);
                        }
                    }
                };
            }
            else if (isServerClient) {
                setAll = async () => {
                    console.warn("@supabase/ssr: createServerClient was configured without set and remove cookie methods, but the client needs to set cookies. This can lead to issues such as random logouts, early session termination or increased token refresh requests. If in NextJS, check your middleware.ts file, route handlers and server actions for correctness. Consider switching to the getAll and setAll cookie methods instead of get, set and remove which are deprecated and can be difficult to use correctly.");
                };
            }
            else {
                throw new Error("@supabase/ssr: createBrowserClient requires configuring a getAll and setAll cookie method (deprecated: alternatively both get, set and remove can be used)");
            }
        }
        else if ("getAll" in cookies) {
            getAll = async () => await cookies.getAll();
            if ("setAll" in cookies) {
                setAll = cookies.setAll;
            }
            else if (isServerClient) {
                setAll = async () => {
                    console.warn("@supabase/ssr: createServerClient was configured without the setAll cookie method, but the client needs to set cookies. This can lead to issues such as random logouts, early session termination or increased token refresh requests. If in NextJS, check your middleware.ts file, route handlers and server actions for correctness.");
                };
            }
            else {
                throw new Error("@supabase/ssr: createBrowserClient requires configuring both getAll and setAll cookie methods (deprecated: alternatively both get, set and remove can be used)");
            }
        }
        else {
            // neither get nor getAll is present on cookies, only will occur if pure JavaScript is used, but cookies is an object
            throw new Error(`@supabase/ssr: ${isServerClient ? "createServerClient" : "createBrowserClient"} requires configuring getAll and setAll cookie methods (deprecated: alternatively use get, set and remove).${isBrowser() ? " As this is called in a browser runtime, consider removing the cookies option object to use the document.cookie API automatically." : ""}`);
        }
    }
    else if (!isServerClient && isBrowser()) {
        // The environment is browser, so use the document.cookie API to implement getAll and setAll.
        const noHintGetAll = () => {
            const parsed = parse(document.cookie);
            return Object.keys(parsed).map((name) => ({
                name,
                value: parsed[name] ?? "",
            }));
        };
        getAll = () => noHintGetAll();
        setAll = (setCookies) => {
            setCookies.forEach(({ name, value, options }) => {
                document.cookie = serialize(name, value, options);
            });
        };
    }
    else if (isServerClient) {
        throw new Error("@supabase/ssr: createServerClient must be initialized with cookie options that specify getAll and setAll functions (deprecated, not recommended: alternatively use get, set and remove)");
    }
    else {
        // getting cookies when there's no window but we're in browser mode can be OK, because the developer probably is not using auth functions
        getAll = () => {
            return [];
        };
        // this is NOT OK because the developer is using auth functions that require setting some state, so that must error out
        setAll = () => {
            throw new Error("@supabase/ssr: createBrowserClient in non-browser runtimes (including Next.js pre-rendering mode) was not initialized cookie options that specify getAll and setAll functions (deprecated: alternatively use get, set and remove), but they were needed");
        };
    }
    if (!isServerClient) {
        // This is the storage client to be used in browsers. It only
        // works on the cookies abstraction, unlike the server client
        // which only uses cookies to read the initial state. When an
        // item is set, cookies are both cleared and set to values so
        // that stale chunks are not left remaining.
        return {
            getAll, // for type consistency
            setAll, // for type consistency
            setItems, // for type consistency
            removedItems, // for type consistency
            storage: {
                isServer: false,
                getItem: async (key) => {
                    const allCookies = await getAll([key]);
                    const chunkedCookie = await combineChunks(key, async (chunkName) => {
                        const cookie = allCookies?.find(({ name }) => name === chunkName) || null;
                        if (!cookie) {
                            return null;
                        }
                        return cookie.value;
                    });
                    if (!chunkedCookie) {
                        return null;
                    }
                    let decoded = chunkedCookie;
                    if (chunkedCookie.startsWith(BASE64_PREFIX)) {
                        decoded = stringFromBase64URL(chunkedCookie.substring(BASE64_PREFIX.length));
                    }
                    return decoded;
                },
                setItem: async (key, value) => {
                    const allCookies = await getAll([key]);
                    const cookieNames = allCookies?.map(({ name }) => name) || [];
                    const removeCookies = new Set(cookieNames.filter((name) => isChunkLike(name, key)));
                    let encoded = value;
                    if (cookieEncoding === "base64url") {
                        encoded = BASE64_PREFIX + stringToBase64URL(value);
                    }
                    const setCookies = createChunks(key, encoded);
                    setCookies.forEach(({ name }) => {
                        removeCookies.delete(name);
                    });
                    const removeCookieOptions = {
                        ...DEFAULT_COOKIE_OPTIONS,
                        ...options?.cookieOptions,
                        maxAge: 0,
                    };
                    const setCookieOptions = {
                        ...DEFAULT_COOKIE_OPTIONS,
                        ...options?.cookieOptions,
                        maxAge: DEFAULT_COOKIE_OPTIONS.maxAge,
                    };
                    // the NextJS cookieStore API can get confused if the `name` from
                    // options.cookieOptions leaks
                    delete removeCookieOptions.name;
                    delete setCookieOptions.name;
                    const allToSet = [
                        ...[...removeCookies].map((name) => ({
                            name,
                            value: "",
                            options: removeCookieOptions,
                        })),
                        ...setCookies.map(({ name, value }) => ({
                            name,
                            value,
                            options: setCookieOptions,
                        })),
                    ];
                    if (allToSet.length > 0) {
                        await setAll(allToSet);
                    }
                },
                removeItem: async (key) => {
                    const allCookies = await getAll([key]);
                    const cookieNames = allCookies?.map(({ name }) => name) || [];
                    const removeCookies = cookieNames.filter((name) => isChunkLike(name, key));
                    const removeCookieOptions = {
                        ...DEFAULT_COOKIE_OPTIONS,
                        ...options?.cookieOptions,
                        maxAge: 0,
                    };
                    // the NextJS cookieStore API can get confused if the `name` from
                    // options.cookieOptions leaks
                    delete removeCookieOptions.name;
                    if (removeCookies.length > 0) {
                        await setAll(removeCookies.map((name) => ({
                            name,
                            value: "",
                            options: removeCookieOptions,
                        })));
                    }
                },
            },
        };
    }
    // This is the server client. It only uses getAll to read the initial
    // state. Any subsequent changes to the items is persisted in the
    // setItems and removedItems objects. createServerClient *must* use
    // getAll, setAll and the values in setItems and removedItems to
    // persist the changes *at once* when appropriate (usually only when
    // the TOKEN_REFRESHED, USER_UPDATED or SIGNED_OUT events are fired by
    // the Supabase Auth client).
    return {
        getAll,
        setAll,
        setItems,
        removedItems,
        storage: {
            // to signal to the libraries that these cookies are
            // coming from a server environment and their value
            // should not be trusted
            isServer: true,
            getItem: async (key) => {
                if (typeof setItems[key] === "string") {
                    return setItems[key];
                }
                if (removedItems[key]) {
                    return null;
                }
                const allCookies = await getAll([key]);
                const chunkedCookie = await combineChunks(key, async (chunkName) => {
                    const cookie = allCookies?.find(({ name }) => name === chunkName) || null;
                    if (!cookie) {
                        return null;
                    }
                    return cookie.value;
                });
                if (!chunkedCookie) {
                    return null;
                }
                let decoded = chunkedCookie;
                if (typeof chunkedCookie === "string" &&
                    chunkedCookie.startsWith(BASE64_PREFIX)) {
                    decoded = stringFromBase64URL(chunkedCookie.substring(BASE64_PREFIX.length));
                }
                return decoded;
            },
            setItem: async (key, value) => {
                // We don't have an `onAuthStateChange` event that can let us know that
                // the PKCE code verifier is being set. Therefore, if we see it being
                // set, we need to apply the storage (call `setAll` so the cookie is
                // set properly).
                if (key.endsWith("-code-verifier")) {
                    await applyServerStorage({
                        getAll,
                        setAll,
                        // pretend only that the code verifier was set
                        setItems: { [key]: value },
                        // pretend that nothing was removed
                        removedItems: {},
                    }, {
                        cookieOptions: options?.cookieOptions ?? null,
                        cookieEncoding,
                    });
                }
                setItems[key] = value;
                delete removedItems[key];
            },
            removeItem: async (key) => {
                // Intentionally not applying the storage when the key is the PKCE code
                // verifier, as usually right after it's removed other items are set,
                // so application of the storage will be handled by the
                // `onAuthStateChange` callback that follows removal -- usually as part
                // of the `exchangeCodeForSession` call.
                delete setItems[key];
                removedItems[key] = true;
            },
        },
    };
}
/**
 * When createServerClient needs to apply the created storage to cookies, it
 * should call this function which handles correcly setting cookies for stored
 * and removed items in the storage.
 */
async function applyServerStorage({ getAll, setAll, setItems, removedItems, }, options) {
    const cookieEncoding = options.cookieEncoding;
    const cookieOptions = options.cookieOptions ?? null;
    const allCookies = await getAll([
        ...(setItems ? Object.keys(setItems) : []),
        ...(removedItems ? Object.keys(removedItems) : []),
    ]);
    const cookieNames = allCookies?.map(({ name }) => name) || [];
    const removeCookies = Object.keys(removedItems).flatMap((itemName) => {
        return cookieNames.filter((name) => isChunkLike(name, itemName));
    });
    const setCookies = Object.keys(setItems).flatMap((itemName) => {
        const removeExistingCookiesForItem = new Set(cookieNames.filter((name) => isChunkLike(name, itemName)));
        let encoded = setItems[itemName];
        if (cookieEncoding === "base64url") {
            encoded = BASE64_PREFIX + stringToBase64URL(encoded);
        }
        const chunks = createChunks(itemName, encoded);
        chunks.forEach((chunk) => {
            removeExistingCookiesForItem.delete(chunk.name);
        });
        removeCookies.push(...removeExistingCookiesForItem);
        return chunks;
    });
    const removeCookieOptions = {
        ...DEFAULT_COOKIE_OPTIONS,
        ...cookieOptions,
        maxAge: 0,
    };
    const setCookieOptions = {
        ...DEFAULT_COOKIE_OPTIONS,
        ...cookieOptions,
        maxAge: DEFAULT_COOKIE_OPTIONS.maxAge,
    };
    // the NextJS cookieStore API can get confused if the `name` from
    // options.cookieOptions leaks
    delete removeCookieOptions.name;
    delete setCookieOptions.name;
    await setAll([
        ...removeCookies.map((name) => ({
            name,
            value: "",
            options: removeCookieOptions,
        })),
        ...setCookies.map(({ name, value }) => ({
            name,
            value,
            options: setCookieOptions,
        })),
    ]);
}

if (typeof process !== "undefined" && process.env?.npm_package_name) {
  const packageName = process.env.npm_package_name;
  const deprecatedPackages = [
    "@supabase/auth-helpers-nextjs",
    "@supabase/auth-helpers-react",
    "@supabase/auth-helpers-remix",
    "@supabase/auth-helpers-sveltekit"
  ];
  if (deprecatedPackages.includes(packageName)) {
    console.warn(`
╔════════════════════════════════════════════════════════════════════════════╗
║ ⚠️  IMPORTANT: Package Consolidation Notice                                ║
║                                                                            ║
║ The ${packageName.padEnd(35)} package name is deprecated.  ║
║                                                                            ║
║ You are now using @supabase/ssr - a unified solution for all frameworks.  ║
║                                                                            ║
║ The auth-helpers packages have been consolidated into @supabase/ssr       ║
║ to provide better maintenance and consistent APIs across frameworks.      ║
║                                                                            ║
║ Please update your package.json to use @supabase/ssr directly:            ║
║   npm uninstall ${packageName.padEnd(42)} ║
║   npm install @supabase/ssr                                               ║
║                                                                            ║
║ For more information, visit:                                              ║
║ https://supabase.com/docs/guides/auth/server-side                         ║
╚════════════════════════════════════════════════════════════════════════════╝
    `);
  }
}

export { VERSION as V, applyServerStorage as a, createStorageFromOptions as c, isBrowser as i, memoryLocalStorageAdapter as m };
