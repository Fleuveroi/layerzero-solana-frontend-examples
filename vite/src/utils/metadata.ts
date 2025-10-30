/**
 * Lightweight client for fetching LayerZero metadata.
 * The response is a large JSON object keyed by chain keys (see metadata.json example).
 */

export const LAYERZERO_METADATA_ENDPOINT = "https://metadata.layerzero-api.com/v1/metadata";

export type LayerZeroMetadata = Record<string, unknown>;

/**
 * Fetch the LayerZero chain metadata from the public endpoint.
 *
 * @param init Optional RequestInit to pass headers, signal, etc.
 * @returns Parsed JSON object containing metadata keyed by chain key.
 */
export async function fetchMetadata(init?: RequestInit): Promise<LayerZeroMetadata> {
  const response = await fetch(LAYERZERO_METADATA_ENDPOINT, {
    method: "GET",
    ...init,
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch LayerZero metadata: ${response.status} ${response.statusText}`);
  }

  return (await response.json()) as LayerZeroMetadata;
}

/**
 * Attempt to find the first HTTPS RPC URL from a metadata entry.
 * This scans typical locations and any string arrays for http(s) URLs.
 */
export function getFirstHttpsRpc(entry: unknown): string | null {
  const isHttp = (v: unknown) => typeof v === 'string' && /^https?:\/\//i.test(v);
  const isExplorer = (url: string) => /explorer|scan|blockscout|etherscan|arbiscan|basescan|polygonscan|bscscan/i.test(url);
  const looksLikeRpc = (url: string) => /rpc|alchemy|infura|ankr|blastapi|chainstack|publicnode|cloudflare|quicknode|llamarpc|p2p|1rpc|tenderly/i.test(url);
  const isTenderly = (url: string) => /tenderly/i.test(url);

  // 1) Prefer explicit 'rpcs' key if present
  try {
    const maybeObj = entry as Record<string, unknown> | undefined;
    const rpcs = maybeObj && (maybeObj as Record<string, unknown>)['rpcs'];
    if (rpcs && Array.isArray(rpcs)) {
      const candidates: string[] = [];
      for (const it of rpcs) {
        if (isHttp(it) && !isExplorer(it as string)) candidates.push(it as string);
        if (it && typeof it === 'object') {
          const val = Object.values(it as Record<string, unknown>).find(isHttp) as string | undefined;
          if (val && !isExplorer(val)) candidates.push(val);
        }
      }
      if (candidates.length) {
        // Prefer Tenderly first
        candidates.sort((a, b) => (isTenderly(b) ? 1 : 0) - (isTenderly(a) ? 1 : 0));
        return candidates[0];
      }
    }
  } catch {
    // ignore malformed entries
  }

  const urls: string[] = [];
  const scan = (obj: unknown): void => {
    if (!obj) return;
    if (Array.isArray(obj)) {
      for (const v of obj) scan(v);
      return;
    }
    if (typeof obj === 'object') {
      for (const v of Object.values(obj as Record<string, unknown>)) scan(v);
      return;
    }
    if (isHttp(obj)) urls.push(obj as string);
  };

  scan(entry);

  // Filter out obvious explorer URLs
  const rpcCandidates = urls.filter((u) => !isExplorer(u));
  if (rpcCandidates.length === 0) return null;

  // Prefer URLs that look like RPC endpoints
  rpcCandidates.sort((a, b) => {
    const aScore = (looksLikeRpc(a) ? 1 : 0) + (isTenderly(a) ? 2 : 0);
    const bScore = (looksLikeRpc(b) ? 1 : 0) + (isTenderly(b) ? 2 : 0);
    return bScore - aScore; // higher score first (Tenderly preferred)
  });

  return rpcCandidates[0] || null;
}


