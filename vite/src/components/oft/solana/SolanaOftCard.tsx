import { useEffect, useState } from "react";
import { PublicKey } from "@solana/web3.js";
import { publicKey } from "@metaplex-foundation/umi";
import { oft } from "@layerzerolabs/oft-v2-solana-sdk";
import { umi } from "../../../config/umi";
import { useSolanaOft } from "../../../hooks/useSolanaOft";
import { FilePathDisplay } from "../../FilePathDisplay";

export default function SolanaOftCard({ storeAddressOverride }: { storeAddressOverride?: string }) {
  const [overrideLoading, setOverrideLoading] = useState(false);
  const [overrideError, setOverrideError] = useState<string | null>(null);
  const [overrideInfo, setOverrideInfo] = useState<{
    tokenMint: string;
    programId: string;
    oftStore: string;
  } | null>(null);

  // When override is provided, fetch OFTStore and derive tokenMint/programId
  useEffect(() => {
    const load = async () => {
      if (!storeAddressOverride || !storeAddressOverride.trim()) {
        setOverrideInfo(null);
        setOverrideError(null);
        setOverrideLoading(false);
        return;
      }
      setOverrideLoading(true);
      setOverrideError(null);
      try {
        const storePk = publicKey(storeAddressOverride.trim());
        const storeInfo = await oft.accounts.fetchOFTStore(umi, storePk);
        const tokenMint = new PublicKey(storeInfo.tokenMint).toBase58();
        const programId = new PublicKey(storeInfo.header.owner).toBase58();
        const oftStore = new PublicKey(storePk).toBase58();
        setOverrideInfo({ tokenMint, programId, oftStore });
      } catch (e) {
        setOverrideError(e instanceof Error ? e.message : 'Failed to load OFT Store');
        setOverrideInfo(null);
      } finally {
        setOverrideLoading(false);
      }
    };
    void load();
  }, [storeAddressOverride]);
  const {
    tokenMint,
    programId,
    oftStore,
  } = useSolanaOft();

  // ------------------------------------------------------------
  // UI
  // ------------------------------------------------------------
  if (!tokenMint || !programId || !oftStore) {
    return (
      <p className="text-sm text-layerzero-gray-400">
        Loading contract configuration...
      </p>
    );
  }

  return (
    <div className="space-y-4">
        <FilePathDisplay text="/vite/src/components/oft/solana/SolanaOftCard.tsx" />
        {storeAddressOverride && (overrideLoading || overrideError) && (
          <div className="p-3 bg-layerzero-gray-800 border border-yellow-400 text-yellow-400 rounded-none">
            <p className="text-xs">{overrideLoading ? 'Loading override configuration...' : overrideError}</p>
          </div>
        )}
        {/* Token Information - Always visible */}
        <div className="p-4 bg-layerzero-gray-800 border border-layerzero-gray-700 rounded-none">
          <h4 className="font-medium text-layerzero-white mb-3">
            Token Information
          </h4>
          <div className="space-y-2">
            <div>
              <p className="text-sm text-layerzero-gray-400">
                <span className="font-medium">OFT Store:</span>
              </p>
              <p className="font-mono text-xs text-layerzero-white break-all">
                {overrideInfo ? overrideInfo.oftStore : oftStore.toString()}
              </p>
            </div>
            <div>
              <p className="text-sm text-layerzero-gray-400">
                <span className="font-medium">Token Mint:</span>
              </p>
              <p className="font-mono text-xs text-layerzero-white break-all">
                {overrideInfo ? overrideInfo.tokenMint : tokenMint.toString()}
              </p>
            </div>
            <div>
              <p className="text-sm text-layerzero-gray-400">
                <span className="font-medium">Program ID:</span>
              </p>
              <p className="font-mono text-xs text-layerzero-white break-all">
                {overrideInfo ? overrideInfo.programId : programId.toString()}
              </p>
            </div>
            <div>
              <p className="text-sm text-layerzero-gray-400">
                <span className="font-medium">Network:</span>
              </p>
              <p className="text-xs text-layerzero-white">
                Solana Devnet
              </p>
            </div>
          </div>
        </div>
      </div>
  );
}
