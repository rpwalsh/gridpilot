/**
 * Load a proof dataset from a local static source snapshot file.
 *
 * The file must exist under the Vite public directory:
 *   public/source_snapshots/weather/<filename>.json
 *
 * To create the file, run:
 *   python scripts/capture_weather_snapshot.py --lat 31.97 --lon -102.08 \
 *     --start 2000-01-01 --end 2024-12-31 \
 *     --out data/source_snapshots/weather/open_meteo_west_texas_monthly_2000_2024.json
 *
 * Then copy to:
 *   apps/dashboard/public/source_snapshots/weather/open_meteo_west_texas_monthly_2000_2024.json
 */

import type { ProofDataset } from './types'

export const PROOF_SNAPSHOT_PATH =
  '/source_snapshots/weather/open_meteo_west_texas_monthly_2000_2024.json'

export async function loadProofDataset(
  path: string = PROOF_SNAPSHOT_PATH,
): Promise<ProofDataset | null> {
  try {
    const resp = await fetch(path)
    if (!resp.ok) return null
    const data: ProofDataset = await resp.json()
    if (!data.dataset_id || !data.series || !Array.isArray(data.series)) return null
    return data
  } catch {
    return null
  }
}
