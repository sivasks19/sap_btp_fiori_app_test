(function(factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
    return;
  }

  sap.ui.define([], factory);
}(function() {
  "use strict";

  function normalizeServicePath(servicePath) {
    const trimmedPath = (servicePath || "").trim();

    if (!trimmedPath) {
      return "";
    }

    const prefixedPath = trimmedPath.startsWith("/") ? trimmedPath : `/${trimmedPath}`;

    return prefixedPath.replace(/\/+$/, "");
  }

  function isSapProxyPath(servicePath) {
    return /^\/sap(?:\/|$)/.test(normalizeServicePath(servicePath));
  }

  function encodeODataPath(path) {
    let encodedPath = "";
    let inQuotedLiteral = false;
    let parenthesisDepth = 0;

    for (let index = 0; index < path.length; index += 1) {
      const character = path[index];

      if (character === "'") {
        if (inQuotedLiteral && path[index + 1] === "'") {
          encodedPath += "''";
          index += 1;
          continue;
        }

        inQuotedLiteral = !inQuotedLiteral;
        encodedPath += character;
        continue;
      }

      if (character === "(") {
        parenthesisDepth += 1;
        encodedPath += character;
        continue;
      }

      if (character === ")") {
        parenthesisDepth = Math.max(0, parenthesisDepth - 1);
        encodedPath += character;
        continue;
      }

      if (character === "/") {
        encodedPath += inQuotedLiteral || parenthesisDepth > 0 ? "%2F" : "/";
        continue;
      }

      if (character === " ") {
        encodedPath += "%20";
        continue;
      }

      if (/^[A-Za-z0-9\-._~$*,=;:@+]$/.test(character)) {
        encodedPath += character;
        continue;
      }

      encodedPath += encodeURIComponent(character);
    }

    return encodedPath.replace(/^\/+/, "");
  }

  function findUnquotedCharacter(value, targetCharacter) {
    let inQuotedLiteral = false;

    for (let index = 0; index < value.length; index += 1) {
      const character = value[index];

      if (character === "'") {
        if (inQuotedLiteral && value[index + 1] === "'") {
          index += 1;
          continue;
        }

        inQuotedLiteral = !inQuotedLiteral;
        continue;
      }

      if (!inQuotedLiteral && character === targetCharacter) {
        return index;
      }
    }

    return -1;
  }

  function normalizeResourcePath(resourcePath) {
    const trimmedPath = (resourcePath || "").trim();

    if (!trimmedPath) {
      return "";
    }

    if (/^\/+$/.test(trimmedPath)) {
      return "/";
    }

    return trimmedPath.replace(/^\/+/, "");
  }

  function buildRequestUrl(servicePath, resourcePath) {
    const normalizedServicePath = normalizeServicePath(servicePath);
    const normalizedResourcePath = normalizeResourcePath(resourcePath);

    if (!normalizedResourcePath) {
      return normalizedServicePath;
    }

    if (normalizedResourcePath === "/") {
      return `${normalizedServicePath}/`;
    }

    const hashIndex = findUnquotedCharacter(normalizedResourcePath, "#");
    const resourcePathWithoutHash = hashIndex >= 0
      ? normalizedResourcePath.slice(0, hashIndex)
      : normalizedResourcePath;
    const queryIndex = findUnquotedCharacter(resourcePathWithoutHash, "?");
    const resourcePathPart = queryIndex >= 0
      ? resourcePathWithoutHash.slice(0, queryIndex)
      : resourcePathWithoutHash;
    const queryString = queryIndex >= 0
      ? resourcePathWithoutHash.slice(queryIndex + 1)
      : "";
    const encodedPath = encodeODataPath(resourcePathPart);

    if (!encodedPath) {
      return queryString
        ? `${normalizedServicePath}?${queryString}`
        : normalizedServicePath;
    }

    return queryString
      ? `${normalizedServicePath}/${encodedPath}?${queryString}`
      : `${normalizedServicePath}/${encodedPath}`;
  }

  return {
    buildRequestUrl: buildRequestUrl,
    encodeODataPath: encodeODataPath,
    findUnquotedCharacter: findUnquotedCharacter,
    isSapProxyPath: isSapProxyPath,
    normalizeResourcePath: normalizeResourcePath,
    normalizeServicePath: normalizeServicePath
  };
}));
