/**
 * Minimal YAML-like parser for exercise/quiz config files.
 * Handles: simple key-value, lists, nested maps (one level deep).
 * For MVP: we use a simple line-based parser. Production should use a proper YAML library.
 */
export function parse(content: string): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  const lines = content.split("\n");

  let currentKey: string | null = null;
  let currentList: unknown[] | null = null;
  let currentMap: Record<string, string> | null = null;

  function flushCurrent() {
    if (currentKey && currentList !== null) {
      result[currentKey] = currentList;
    } else if (currentKey && currentMap !== null) {
      result[currentKey] = currentMap;
    }
    currentKey = null;
    currentList = null;
    currentMap = null;
  }

  for (const line of lines) {
    if (line.trim() === "" || line.trim().startsWith("#")) continue;

    const indent = line.length - line.trimStart().length;
    const trimmed = line.trim(); // fully trimmed for content checks

    if (indent === 0) {
      if (!trimmed.includes(":")) continue;
      flushCurrent();
      const colonIdx = trimmed.indexOf(":");
      const key = trimmed.substring(0, colonIdx).trim();
      const value = trimmed.substring(colonIdx + 1).trim();
      currentKey = key;
      if (value === "") {
        // Could be a list or nested map — determine from first child
        currentList = null;
        currentMap = null;
      } else {
        result[currentKey] = value.replace(/^["']|["']$/g, "");
        currentKey = null;
      }
    } else if (indent > 0 && currentKey !== null) {
      if (trimmed.startsWith("- ")) {
        // List item
        if (currentMap !== null) {
          // switching from map to list — save map and start list
          result[currentKey] = currentMap;
          currentMap = null;
        }
        if (currentList === null) currentList = [];
        const item = trimmed.substring(2).trim().replace(/^["']|["']$/g, "");
        // Check if this item has sub-keys (object in list)
        if (item.includes(":")) {
          const colonIdx = item.indexOf(":");
          const k = item.substring(0, colonIdx).trim();
          const v = item.substring(colonIdx + 1).trim().replace(/^["']|["']$/g, "");
          currentList.push({ [k]: v });
        } else {
          currentList.push(item);
        }
      } else if (trimmed.includes(":") && !trimmed.startsWith("-")) {
        // Could be a nested map key or a sub-key of a list item
        const colonIdx = trimmed.indexOf(":");
        const k = trimmed.substring(0, colonIdx).trim();
        const v = trimmed.substring(colonIdx + 1).trim().replace(/^["']|["']$/g, "");

        if (currentList !== null) {
          // Sub-key of the last list item
          const lastItem = currentList[currentList.length - 1];
          if (typeof lastItem === "object" && lastItem !== null) {
            (lastItem as Record<string, string>)[k] = v;
          }
        } else {
          // Nested map key
          if (currentMap === null) currentMap = {};
          currentMap[k] = v;
        }
      }
    }
  }

  flushCurrent();

  return result;
}
