import axios from "axios";
import { saveCache, loadCache } from "./persistentCache";

let running = false;

export function startScanWorker() {
  if (running) return;
  running = true;

  // Load previous cache on startup
  loadCache();

  console.log("🚀 Scan Worker Started");

  setInterval(async () => {
    try {
      const res = await axios.post(
        "http://localhost:3000/api/scan?background=1"
      );

      const data = res.data;

      saveCache({
        data: data.data,
        batch: data.batch,
        totalBatches: data.totalBatches,
      });

      console.log("✅ Cache updated - batch:", data.batch);
    } catch (err) {
      console.error("❌ Worker error:", err);
    }
  }, 10000);
}