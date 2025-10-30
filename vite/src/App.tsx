import { SolanaToEvmCard, EvmToSolanaCard } from "./components/send";
import { SolanaOftCard, EvmOftCard } from "./components/oft";
import SolanaMintCard from "./components/mint/solana/SolanaMintCard";
import EvmMintCard from "./components/mint/evm/EvmMintCard";
import { 
  SolanaWalletProvider, 
  SolanaConnect, 
  EthereumConnect, 
  WagmiProviderWrapper 
} from "./components/wallet";
import { ConfigureSection } from "./components/configure";
import { useEvmBase } from "./hooks/utils/useEvmBase";
import { useState, useEffect, useRef } from 'react';
import { fetchMetadata } from './utils';
import { getFirstHttpsRpc } from './utils/metadata';

type MetadataDeployment = { eid?: string | number; version?: number | string };
type MetadataEntry = {
  chainDetails?: {
    chainType?: string;
    environment?: string;
    shortName?: string;
    nativeChainId?: number | string;
  };
  chainName?: string;
  environment?: string;
  deployments?: MetadataDeployment[];
};
type NetworkOption = { eid: number; chainName: string; chainKey: string; environment: string; shortName: string; nativeChainId?: number };

function AppContent() {
  const [showSwitchSuccess, setShowSwitchSuccess] = useState(false);
  const [networkSwitchCount, setNetworkSwitchCount] = useState(0);
  const [chainChangedFlag, setChainChangedFlag] = useState(0);
  
  // Configure section inputs
  const [oftStoreAddress, setOftStoreAddress] = useState('');
  const [evmOftAddress, setEvmOftAddress] = useState('');
  const [metadataNetworks, setMetadataNetworks] = useState<NetworkOption[]>([]);
  const [networkQuery, setNetworkQuery] = useState('');
  const [debouncedNetworkQuery, setDebouncedNetworkQuery] = useState('');
  const [selectedNetwork, setSelectedNetwork] = useState<NetworkOption>();
  const [selectedNetworkRpc, setSelectedNetworkRpc] = useState<string>();
  const [metadataJson, setMetadataJson] = useState<Record<string, unknown>>();
  const initializedFromUrlRef = useRef(false);
  
  // Mode: choose between default OFTs and user-input addresses
  const [mode, setMode] = useState<'DEFAULT_OFTS' | 'USER_INPUT_OFTS'>('USER_INPUT_OFTS');

  // Use useEvmBase for all EVM network logic
  const {
    isWrongNetwork,
    networkName,
    singleSupportedNetwork,
    handleSwitchNetwork,
  } = useEvmBase();

  // Display name prefers selected testnet shortName over detected chain name
  const evmDisplayName = selectedNetwork?.shortName || networkName;

  // Listen for chainChanged event to force re-render
  useEffect(() => {
    if (!window?.ethereum) return;
    const handler = () => setChainChangedFlag(f => f + 1);
    window.ethereum.on('chainChanged', handler);
    return () => {
      window.ethereum.removeListener('chainChanged', handler);
    };
  }, []);

  // Debounce network query to avoid collapsing datalist during fast typing
  useEffect(() => {
    const handle = setTimeout(() => setDebouncedNetworkQuery(networkQuery), 250);
    return () => clearTimeout(handle);
  }, [networkQuery]);

  // Initialize Configure inputs from URL params
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const pStore = params.get('oftStore') || '';
    const pNetwork = params.get('network') || '';
    const pEvmOft = params.get('evmOft') || '';
    if (pStore) setOftStoreAddress(pStore);
    if (pNetwork) setNetworkQuery(pNetwork);
    if (pEvmOft) setEvmOftAddress(pEvmOft);
  }, []);

  // Initialize selected network from URL (eid/network) once after metadata loads
  useEffect(() => {
    if (initializedFromUrlRef.current) return;
    if (metadataNetworks.length === 0) return;

    const params = new URLSearchParams(window.location.search);
    const pEid = params.get('eid');
    const pNetwork = params.get('network');
    let match: NetworkOption | undefined;

    // Prefer selecting by explicit EID if it's provided in the URL
    if (pEid) {
      const eidNum = Number(pEid);
      if (Number.isFinite(eidNum)) {
        match = metadataNetworks.find((n) => n.eid === eidNum);
      }
    }
    // Fallback: if no match from EID (invalid/unknown) OR no EID provided,
    // try selecting by shortName from the URL instead
    if (!match && pNetwork) {
      match = metadataNetworks.find((n) => n.shortName === pNetwork);
    }
    if (match) {
      setSelectedNetwork(match);
      setNetworkQuery(match.shortName);
    }
    initializedFromUrlRef.current = true;
  }, [metadataNetworks]);

  // Persist Configure inputs to URL params (debounced network)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (oftStoreAddress) params.set('oftStore', oftStoreAddress); else params.delete('oftStore');
    if (selectedNetwork?.eid) params.set('eid', String(selectedNetwork.eid)); else params.delete('eid');
    if (debouncedNetworkQuery) params.set('network', debouncedNetworkQuery); else params.delete('network');
    if (evmOftAddress) params.set('evmOft', evmOftAddress); else params.delete('evmOft');
    if (selectedNetworkRpc) params.set('evmRpc', selectedNetworkRpc); else params.delete('evmRpc');
    const qs = params.toString();
    const newUrl = `${window.location.pathname}${qs ? `?${qs}` : ''}${window.location.hash}`;
    window.history.replaceState({}, '', newUrl);
  }, [oftStoreAddress, selectedNetwork, debouncedNetworkQuery, evmOftAddress, selectedNetworkRpc]);

  // Fetch LayerZero metadata and build EVM network options
  useEffect(() => {
    (async () => {
      try {
        const data = await fetchMetadata();
        // Convert the metadata object into [chainKey, entry] tuples for iteration
        const entries = Object.entries(data ?? {}) as Array<[string, MetadataEntry]>;
        const list: NetworkOption[] = [];
        // Walk all chains in metadata and select only EVM testnets with a valid EID
        for (const [chainKey, v] of entries) {
          // Keep only EVM chains on testnet
          const chainType = v?.chainDetails?.chainType;
          const environment = v?.environment ?? v?.chainDetails?.environment ?? '';
          if (chainType !== 'evm') continue;
          if ((environment || '').toLowerCase() !== 'testnet') continue;
          // Prefer a v2 deployment if present; otherwise take the first deployment
          const deployments: MetadataDeployment[] = Array.isArray(v?.deployments) ? v.deployments : [];
          if (!deployments.length) continue;
          const v2 = (deployments.find((d) => Number(d?.version) === 2) || deployments[0]);
          // Parse core identifiers and display names
          const eidNum = Number(v2?.eid);
          const chainName = v?.chainName || chainKey;
          const shortName = v?.chainDetails?.shortName || chainName;
          // Normalize native chain ID to a number if provided as string
          const nativeChainIdRaw = v?.chainDetails?.nativeChainId;
          const nativeChainId = typeof nativeChainIdRaw === 'number' ? nativeChainIdRaw : Number(nativeChainIdRaw);
          if (Number.isFinite(eidNum)) {
            // Include only entries with a valid EID; omit invalid nativeChainId values
            list.push({ eid: eidNum, chainName, chainKey, environment, shortName, nativeChainId: Number.isFinite(nativeChainId) ? nativeChainId : undefined });
          }
        }
        // Sort alphabetically by chain name
        list.sort((a, b) => a.shortName.localeCompare(b.shortName));
        setMetadataNetworks(list);
        setMetadataJson(data as Record<string, unknown>);
      } catch {
        // Fail silently; users can still manually input an EID
      }
    })();
  }, []);

  // Derive selected network RPC when selection or metadata changes
  useEffect(() => {
    if (!selectedNetwork || !metadataJson) {
      setSelectedNetworkRpc(undefined);
      return;
    }
    const entry = metadataJson[selectedNetwork.chainKey];
    const rpc = getFirstHttpsRpc(entry);
    if (!rpc) {
      console.warn('[metadata] No valid RPC found in metadata entry:', entry);
    } else {
      setSelectedNetworkRpc(rpc);
    }
  }, [selectedNetwork, metadataJson]);

  const canMint = mode !== 'USER_INPUT_OFTS';

  return (
    <div className="min-h-screen bg-layerzero-black lz-grid-bg">
      {/* Hidden element to use chainChangedFlag and force re-render */}
      <span style={{ display: 'none' }}>{chainChangedFlag}</span>
      {/* Header */}
      <header className="border-b border-layerzero-gray-900">
        <div className="container mx-auto px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="lz-protocol-text">
              LayerZero OFT Demo
            </div>
            <div className="lz-protocol-text">
              /// One OFT. 130+ Blockchains.
            </div>
          </div>
        </div>
      </header>

      {/* Global Network Warning */}
      {isWrongNetwork && networkSwitchCount < 1 && (
        <div className="fixed top-0 left-0 w-full bg-yellow-900 border-b border-yellow-400 text-yellow-300 py-3 px-4 text-center font-medium z-50" style={{zIndex: 1000}}>
          <span className="mr-2">⚠️</span>
          You are not connected to {singleSupportedNetwork.name}.{' '}
          <button
            onClick={async () => {
              if (window?.ethereum) {
                try {
                  await handleSwitchNetwork();
                  setShowSwitchSuccess(true);
                  setTimeout(() => setShowSwitchSuccess(false), 3000);
                  setNetworkSwitchCount((c) => c + 1);
                } catch {
                  // handle error (e.g., user rejected, not added)
                  // fallback logic can be added here if needed
                }
              }
            }}
            className="underline text-yellow-200 hover:text-yellow-100 cursor-pointer bg-transparent border-none p-0 m-0 font-medium"
            style={{ textDecoration: 'underline' }}
            type="button"
          >
            Switch your EVM wallet to the {singleSupportedNetwork.name} network
          </button>
          {' '}to use all features.
        </div>
      )}
      {/* Toast for successful network switch */}
      {showSwitchSuccess && (
        <div className="fixed top-4 right-4 bg-green-700 text-white px-6 py-3 rounded shadow-lg z-50 font-medium">
          Successfully switched to {singleSupportedNetwork.name}!
        </div>
      )}

      {/* Main Content */}
      <main className="container mx-auto px-8 py-20">
        <div className="max-w-7xl mx-auto">
          {/* Hero Section */}
          <div className="mb-16">
            <div className="max-w-4xl">
              <h2 className="text-4xl font-bold text-layerzero-white mb-4 leading-tight">
                Demo: {" "}
                <span className="text-layerzero-purple-500">
                  Omnichain
                </span>
                {" "}Token Transfers using LayerZero
              </h2>
              <p className="text-layerzero-gray-400 text-lg mb-4 max-w-2xl">
                Demo application showcasing seamless token transfers between <span className="font-semi text-layerzero-white">{evmDisplayName}</span> and <span className="font-semi text-layerzero-white">Solana</span> using LayerZero's <a href="https://docs.layerzero.network/v2/concepts/glossary#oft-omnichain-fungible-token" target="_blank" rel="noopener noreferrer" className="font-semi text-layerzero-white hover:text-layerzero-purple-400 underline">OFT</a> standard.
              </p>
              <div className="lz-protocol-text">
                /// Demo Only. Not for Production Use.
              </div>
            </div>
          </div>

        {/* Section 00: Configure */}
        <ConfigureSection
          mode={mode}
          setMode={setMode}
          oftStoreAddress={oftStoreAddress}
          setOftStoreAddress={setOftStoreAddress}
          evmOftAddress={evmOftAddress}
          setEvmOftAddress={setEvmOftAddress}
          networkQuery={networkQuery}
          setNetworkQuery={setNetworkQuery}
          metadataNetworks={metadataNetworks}
          selectedNetwork={selectedNetwork}
          setSelectedNetwork={(v) => setSelectedNetwork(v)}
        />

          {/* Section 01: Token Information */}
          <div className="lz-section">
            <div className="lz-section-title">
              <div className="lz-section-number">01 /</div>
              <h3>Token Information</h3>
            </div>
            <div className="grid lg:grid-cols-2 gap-8">
              <div className="lz-card">
                <div className="mb-6">
                  <h4 className="text-lg font-medium text-layerzero-white mb-2">
                    Solana OFT
                  </h4>
                  <p className="text-layerzero-gray-500 text-sm">
                    View OFT token details on Solana and your balance
                  </p>
                </div>
                <SolanaOftCard storeAddressOverride={oftStoreAddress} />
              </div>
              
              <div className="lz-card">
                <div className="mb-6">
                  <h4 className="text-lg font-medium text-layerzero-white mb-2">
                    {evmDisplayName} OFT
                  </h4>
                  <p className="text-layerzero-gray-500 text-sm">
                    View OFT token details on {evmDisplayName} and your balance
                  </p>
                </div>
                <EvmOftCard networkName={evmDisplayName} chainId={selectedNetwork?.nativeChainId} oftAddressOverride={evmOftAddress} />
              </div>
            </div>
          </div>

          {/* Section 02: Wallet Connections */}
          <div className="lz-section">
            <div className="lz-section-title">
              <div className="lz-section-number">02 /</div>
              <h3>Wallet Connections</h3>
            </div>
            <div className="grid lg:grid-cols-2 gap-8">
              <div className="lz-card">
                <div className="mb-6">
                  <h4 className="text-lg font-medium text-layerzero-white mb-2">
                    Solana Network
                  </h4>
                  <p className="text-layerzero-gray-500 text-sm">
                    Connect your Solana wallet to interact with SPL tokens
                  </p>
                </div>
                <SolanaConnect />
              </div>
              
              <div className="lz-card">
                <div className="mb-6">
                  <h4 className="text-lg font-medium text-layerzero-white mb-2">
                    {evmDisplayName} Network
                  </h4>
                  <p className="text-layerzero-gray-500 text-sm">
                    Connect your {evmDisplayName} wallet to interact with ERC-20 tokens
                  </p>
                </div>
                <EthereumConnect networkName={evmDisplayName} isWrongNetwork={isWrongNetwork} />
              </div>
            </div>
          </div>

          {/* Section 03: Mint OFT / OFT Balances */}
          <div className="lz-section">
            <div className="lz-section-title">
              <div className="lz-section-number">03 /</div>
              <h3>{mode === 'USER_INPUT_OFTS' ? 'OFT Balances' : 'Mint OFT'}</h3>
            </div>
            <div className="grid lg:grid-cols-2 gap-8">
              <div className="lz-card">
                <div className="mb-6">
                  <h4 className="text-lg font-medium text-layerzero-white mb-2">
                    Solana
                  </h4>
                  <p className="text-layerzero-gray-500 text-sm">
                    View your balance{canMint ? ' and mint OFT tokens' : ''} on Solana
                  </p>
                </div>
                <SolanaMintCard storeAddressOverride={oftStoreAddress} canMint={canMint} />
              </div>
              
              <div className="lz-card">
                <div className="mb-6">
                  <h4 className="text-lg font-medium text-layerzero-white mb-2">
                    {evmDisplayName}
                  </h4>
                  <p className="text-layerzero-gray-500 text-sm">
                    View your balance{canMint ? ' and mint OFT tokens' : ''} on {evmDisplayName}
                  </p>
                </div>
                <EvmMintCard networkName={evmDisplayName} isWrongNetwork={isWrongNetwork} canMint={canMint} oftAddressOverride={evmOftAddress} rpcUrl={selectedNetworkRpc || undefined} />
              </div>
            </div>
          </div>
          
          {/* Section 04: Cross-Chain Transfer */}
          <div className="lz-section">
            <div className="lz-section-title">
              <div className="lz-section-number">04 /</div>
              <h3>Send OFT Cross-Chain</h3>
            </div>
            <div className="grid lg:grid-cols-2 gap-8">
              <div className="lz-card">
                <div className="mb-6">
                  <h4 className="text-lg font-medium text-layerzero-white mb-2">
                    Solana → {evmDisplayName}
                  </h4>
                  <p className="text-layerzero-gray-500 text-sm">
                    Transfer tokens from Solana to {evmDisplayName} network
                  </p>
                </div>
                <SolanaToEvmCard networkName={evmDisplayName} toEidOverride={selectedNetwork?.eid} oftStoreOverride={oftStoreAddress} />
              </div>
              
              <div className="lz-card">
                <div className="mb-6">
                  <h4 className="text-lg font-medium text-layerzero-white mb-2">
                    {evmDisplayName} → Solana
                  </h4>
                  <p className="text-layerzero-gray-500 text-sm">
                    Transfer tokens from {evmDisplayName} to Solana network
                  </p>
                </div>
                <EvmToSolanaCard networkName={evmDisplayName} isWrongNetwork={isWrongNetwork} oftAddressOverride={evmOftAddress} rpcUrl={selectedNetworkRpc || undefined} />
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-layerzero-gray-900 mt-32">
        <div className="container mx-auto px-8 py-12">
          <div className="flex justify-between items-center">
            <div className="lz-protocol-text">
              Demo Application • LayerZero • Powering Crypto
            </div>
            <div className="lz-protocol-text">
              Not for Production Use
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

function App() {
  return (
    <WagmiProviderWrapper>
      <SolanaWalletProvider>
        <AppContent />
      </SolanaWalletProvider>
    </WagmiProviderWrapper>
  );
}

export default App;
