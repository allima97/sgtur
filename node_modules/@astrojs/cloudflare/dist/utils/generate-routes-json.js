import { existsSync } from "node:fs";
import { writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  prependForwardSlash,
  removeLeadingForwardSlash,
  removeTrailingForwardSlash
} from "@astrojs/internal-helpers/path";
import { glob } from "tinyglobby";
const ROUTE_DYNAMIC_SPLIT = /\[(.+?\(.+?\)|.+?)\]/;
const ROUTE_SPREAD = /^\.{3}.+$/;
function getParts(part) {
  const result = [];
  part.split(ROUTE_DYNAMIC_SPLIT).map((str, i) => {
    if (!str) return;
    const dynamic = i % 2 === 1;
    const [, content] = dynamic ? /([^(]+)$/.exec(str) || [null, null] : [null, str];
    if (!content || dynamic && !/^(?:\.\.\.)?[\w$]+$/.test(content)) {
      throw new Error("Parameter name must match /^[a-zA-Z0-9_$]+$/");
    }
    result.push({
      content,
      dynamic,
      spread: dynamic && ROUTE_SPREAD.test(content)
    });
  });
  return result;
}
async function writeRoutesFileToOutDir(_config, logger, include, exclude) {
  try {
    await writeFile(
      new URL("./_routes.json", _config.outDir),
      JSON.stringify(
        {
          version: 1,
          include,
          exclude
        },
        null,
        2
      ),
      "utf-8"
    );
  } catch (_error) {
    logger.error("There was an error writing the '_routes.json' file to the output directory.");
  }
}
function segmentsToCfSyntax(segments, _config) {
  const pathSegments = [];
  if (removeLeadingForwardSlash(removeTrailingForwardSlash(_config.base)).length > 0) {
    pathSegments.push(removeLeadingForwardSlash(removeTrailingForwardSlash(_config.base)));
  }
  for (const segment of segments.flat()) {
    if (segment.dynamic) pathSegments.push("*");
    else pathSegments.push(segment.content);
  }
  return pathSegments;
}
class TrieNode {
  children = /* @__PURE__ */ new Map();
  isEndOfPath = false;
  hasWildcardChild = false;
}
class PathTrie {
  root;
  returnHasWildcard = false;
  constructor() {
    this.root = new TrieNode();
  }
  insert(thisPath) {
    let node = this.root;
    for (const segment of thisPath) {
      if (segment === "*") {
        node.hasWildcardChild = true;
        break;
      }
      if (!node.children.has(segment)) {
        node.children.set(segment, new TrieNode());
      }
      node = node.children.get(segment);
    }
    node.isEndOfPath = true;
  }
  /**
   * Depth-first search (dfs), traverses the "graph"  segment by segment until the end or wildcard (*).
   * It makes sure that all necessary paths are returned, but not paths with an existing wildcard prefix.
   * e.g. if we have a path like /foo/* and /foo/bar, we only want to return /foo/*
   */
  dfs(node, thisPath, allPaths) {
    if (node.hasWildcardChild) {
      this.returnHasWildcard = true;
      allPaths.push([...thisPath, "*"]);
      return;
    }
    if (node.isEndOfPath) {
      allPaths.push([...thisPath]);
    }
    for (const [segment, childNode] of node.children) {
      this.dfs(childNode, [...thisPath, segment], allPaths);
    }
  }
  /**
   * The reduce function is used to remove unnecessary paths from the trie.
   * It receives a trie node to compare with the current node.
   */
  reduce(compNode, node) {
    if (node.hasWildcardChild || compNode.hasWildcardChild) return;
    for (const [segment, childNode] of node.children) {
      if (childNode.children.size === 0) continue;
      const compChildNode = compNode.children.get(segment);
      if (compChildNode === void 0) {
        childNode.hasWildcardChild = true;
        continue;
      }
      this.reduce(compChildNode, childNode);
    }
  }
  reduceAllPaths(compTrie) {
    this.reduce(compTrie.root, this.root);
    return this;
  }
  getAllPaths() {
    const allPaths = [];
    this.dfs(this.root, [], allPaths);
    return [allPaths, this.returnHasWildcard];
  }
}
async function createRoutesFile(_config, logger, routes, pages, redirects, includeExtends, excludeExtends) {
  const includePaths = [];
  const excludePaths = [];
  const assetsPath = segmentsToCfSyntax(
    [
      [{ content: _config.build.assets, dynamic: false, spread: false }],
      [{ content: "", dynamic: true, spread: false }]
    ],
    _config
  );
  excludePaths.push(assetsPath);
  for (const redirect of redirects) {
    excludePaths.push(segmentsToCfSyntax(redirect, _config));
  }
  if (existsSync(fileURLToPath(_config.publicDir))) {
    const staticFiles = await glob(`**/*`, {
      cwd: fileURLToPath(_config.publicDir),
      dot: true
    });
    for (const staticFile of staticFiles) {
      if (["_headers", "_redirects", "_routes.json"].includes(staticFile)) continue;
      const staticPath = staticFile;
      const segments = removeLeadingForwardSlash(staticPath).split(path.sep).filter(Boolean).map((s) => {
        return getParts(s);
      });
      excludePaths.push(segmentsToCfSyntax(segments, _config));
    }
  }
  let hasPrerendered404 = false;
  for (const route of routes) {
    const convertedPath = segmentsToCfSyntax(route.segments, _config);
    if (route.pathname === "/404" && route.isPrerendered === true) hasPrerendered404 = true;
    switch (route.type) {
      case "page":
        if (route.isPrerendered === false) includePaths.push(convertedPath);
        break;
      case "endpoint":
        if (route.isPrerendered === false) includePaths.push(convertedPath);
        else excludePaths.push(convertedPath);
        break;
      case "redirect":
        excludePaths.push(convertedPath);
        break;
      default:
        includePaths.push(convertedPath);
        break;
    }
  }
  for (const page of pages) {
    if (page.pathname === "404") hasPrerendered404 = true;
    const pageSegments = removeLeadingForwardSlash(page.pathname).split(path.posix.sep).filter(Boolean).map((s) => {
      return getParts(s);
    });
    excludePaths.push(segmentsToCfSyntax(pageSegments, _config));
  }
  const includeTrie = new PathTrie();
  for (const includePath of includePaths) {
    includeTrie.insert(includePath);
  }
  const excludeTrie = new PathTrie();
  for (const excludePath of excludePaths) {
    if (excludePath[0] === "*") continue;
    excludeTrie.insert(excludePath);
  }
  const [deduplicatedIncludePaths, includedPathsHaveWildcard] = includeTrie.reduceAllPaths(excludeTrie).getAllPaths();
  const [deduplicatedExcludePaths, _excludedPathsHaveWildcard] = excludeTrie.reduceAllPaths(includeTrie).getAllPaths();
  const CLOUDFLARE_COMBINED_LIMIT = 100;
  const AUTOMATIC_INCLUDE_RULES_COUNT = deduplicatedIncludePaths.length;
  const EXTENDED_INCLUDE_RULES_COUNT = includeExtends?.length ?? 0;
  const INCLUDE_RULES_COUNT = AUTOMATIC_INCLUDE_RULES_COUNT + EXTENDED_INCLUDE_RULES_COUNT;
  const AUTOMATIC_EXCLUDE_RULES_COUNT = deduplicatedExcludePaths.length;
  const EXTENDED_EXCLUDE_RULES_COUNT = excludeExtends?.length ?? 0;
  const EXCLUDE_RULES_COUNT = AUTOMATIC_EXCLUDE_RULES_COUNT + EXTENDED_EXCLUDE_RULES_COUNT;
  const OPTION2_TOTAL_COUNT = INCLUDE_RULES_COUNT + (includedPathsHaveWildcard ? EXCLUDE_RULES_COUNT : 0);
  if (!hasPrerendered404 || OPTION2_TOTAL_COUNT > CLOUDFLARE_COMBINED_LIMIT) {
    await writeRoutesFileToOutDir(
      _config,
      logger,
      ["/*"].concat(includeExtends?.map((entry) => entry.pattern) ?? []),
      deduplicatedExcludePaths.map((thisPath) => `${prependForwardSlash(thisPath.join("/"))}`).slice(
        0,
        CLOUDFLARE_COMBINED_LIMIT - EXTENDED_INCLUDE_RULES_COUNT - EXTENDED_EXCLUDE_RULES_COUNT - 1
      ).concat(excludeExtends?.map((entry) => entry.pattern) ?? [])
    );
  } else {
    await writeRoutesFileToOutDir(
      _config,
      logger,
      deduplicatedIncludePaths.map((thisPath) => `${prependForwardSlash(thisPath.join("/"))}`).concat(includeExtends?.map((entry) => entry.pattern) ?? []),
      includedPathsHaveWildcard ? deduplicatedExcludePaths.map((thisPath) => `${prependForwardSlash(thisPath.join("/"))}`).concat(excludeExtends?.map((entry) => entry.pattern) ?? []) : []
    );
  }
}
export {
  createRoutesFile,
  getParts
};
