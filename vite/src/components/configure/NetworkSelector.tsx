import { Dispatch, SetStateAction, useMemo, useState } from 'react';

type NetworkOption = {
  eid: number;
  chainKey: string;
  shortName: string;
  chainName: string;
  environment: string;
  nativeChainId?: number;
};

export function NetworkSelector({
  networkQuery,
  setNetworkQuery,
  metadataNetworks,
  setSelectedNetwork,
}: {
  networkQuery: string;
  setNetworkQuery: Dispatch<SetStateAction<string>>;
  metadataNetworks: NetworkOption[];
  selectedNetwork?: NetworkOption;
  setSelectedNetwork: (value: NetworkOption | undefined) => void;
}) {
  const [isNetworkInputFocused, setIsNetworkInputFocused] = useState(false);
  const filteredNetworks = useMemo(() => {
    const q = (networkQuery || '').trim().toLowerCase();
    if (!q) return metadataNetworks.slice(0, 12);
    return metadataNetworks
      .filter((n) =>
        n.shortName.toLowerCase().includes(q) || String(n.eid).includes(q)
      )
      .slice(0, 12);
  }, [metadataNetworks, networkQuery]);

  return (
    <div className="relative">
      <input
        type="text"
        inputMode="text"
        value={networkQuery}
        onFocus={() => setIsNetworkInputFocused(true)}
        onBlur={() => {
          // Delay blur to allow mousedown selection on suggestions
          setTimeout(() => setIsNetworkInputFocused(false), 100);
        }}
        onChange={(e) => {
          const val = e.target.value;
          setNetworkQuery(val);
          const exact = metadataNetworks.find((n) => n.shortName === val || String(n.eid) === val);
          if (exact) setSelectedNetwork(exact);
        }}
        className="lz-input w-full border-white"
        placeholder="Search network by name or enter EID"
        autoComplete="off"
      />
      {isNetworkInputFocused && filteredNetworks.length > 0 && (
        <div className="absolute z-50 mt-1 w-full bg-layerzero-black border border-layerzero-gray-700 max-h-60 overflow-auto">
          {filteredNetworks.map((n) => (
            <button
              key={`${n.chainKey}-${n.eid}`}
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                setNetworkQuery(n.shortName);
                setSelectedNetwork(n);
              }}
              className="w-full text-left px-3 py-2 hover:bg-layerzero-gray-800 text-sm text-layerzero-white"
            >
              <span className="font-medium">{n.shortName}</span>
              <span className="text-layerzero-gray-500 ml-2">(EID {n.eid})</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}


