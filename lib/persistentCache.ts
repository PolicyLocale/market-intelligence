import fs from "fs";
import path from "path";

const FILE_PATH = path.join(process.cwd(), "scan-cache.json");

let memoryCache: any = {
  data: [],
  lastUpdated: null,
  batch: 0,
  totalBatches: 0,
};

export function loadCache() {
  try {
    if (fs.existsSync(FILE_PATH)) {
      const raw = fs.readFileSync(FILE_PATH, "utf-8");
      memoryCache = JSON.parse(raw);
    }
  } catch (err) {
    console.error("Cache load error:", err);
  }
}

export function saveCache(data: any) {
  try {
    memoryCache = {
      ...memoryCache,
      ...data,
      lastUpdated: new Date().toISOString(),
    };

    fs.writeFileSync(FILE_PATH, JSON.stringify(memoryCache, null, 2));
  } catch (err) {
    console.error("Cache save error:", err);
  }
}

export function getCache() {
  return memoryCache;
}