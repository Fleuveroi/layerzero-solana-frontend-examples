import { Dispatch, SetStateAction } from 'react';
import { NetworkSelector } from './NetworkSelector';

type ConfigureNetworkOption = {
  eid: number;
  chainKey: string;
  shortName: string;
  chainName: string;
  environment: string;
  nativeChainId?: number;
};

type ConfigureSectionProps = {
  mode: 'DEFAULT_OFTS' | 'USER_INPUT_OFTS';
  setMode: Dispatch<SetStateAction<'DEFAULT_OFTS' | 'USER_INPUT_OFTS'>>;
  oftStoreAddress: string;
  setOftStoreAddress: Dispatch<SetStateAction<string>>;
  evmOftAddress: string;
  setEvmOftAddress: Dispatch<SetStateAction<string>>;
  networkQuery: string;
  setNetworkQuery: Dispatch<SetStateAction<string>>;
  metadataNetworks: ConfigureNetworkOption[];
  selectedNetwork?: ConfigureNetworkOption;
  setSelectedNetwork: (value: ConfigureNetworkOption | undefined) => void;
};

export function ConfigureSection(props: ConfigureSectionProps) {
  const {
    mode,
    setMode,
    oftStoreAddress,
    setOftStoreAddress,
    evmOftAddress,
    setEvmOftAddress,
    networkQuery,
    setNetworkQuery,
    metadataNetworks,
    selectedNetwork,
    setSelectedNetwork,
  } = props;

  return (
    <div className="lz-section">
      <div className="lz-section-title">
        <div className="lz-section-number">00 /</div>
        <h3>Configure</h3>
      </div>
      <div className="my-8">
        <label className="block text-sm font-medium text-layerzero-white mb-2">
          Mode
        </label>
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setMode('USER_INPUT_OFTS')}
              className={`lz-button text-xs py-2 px-3 ${mode === 'USER_INPUT_OFTS' ? '' : 'opacity-60'}`}
            >
              USER_INPUT_OFTS
            </button>
            <span className="text-xs text-layerzero-gray-500">
              Use OFTs that you deployed (Bring your own OFTs). Input their details above. You need to send the OFT manually to the wallet addresses that will be used to test this page.
            </span>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setMode('DEFAULT_OFTS')}
              className={`lz-button text-xs py-2 px-3 ${mode === 'DEFAULT_OFTS' ? '' : 'opacity-60'}`}
            >
              DEFAULT_OFTS
            </button>
            <span className="text-xs text-layerzero-gray-500">
              use pre-deployed OFTs. You will be able to mint below.
            </span>
          </div>
        </div>
      </div>
      {mode === 'DEFAULT_OFTS' && (
        <div className="mb-6 py-20 px-3 bg-layerzero-gray-800 border border-layerzero-gray-700 text-sm text-layerzero-gray-300">
          Using default OFTs, no inputs needed
        </div>
      )}
      {mode !== 'DEFAULT_OFTS' && (
      <div className="grid lg:grid-cols-2 gap-8">
        {/* Solana column */}
        <div className="lz-card">
          <div className="mb-6">
            <h4 className="text-lg font-medium text-layerzero-white mb-2">
              Solana
            </h4>
            <p className="text-layerzero-gray-500 text-sm">
              Set the OFT Store address
            </p>
          </div>
          <label className="block text-sm font-medium text-layerzero-white mb-2">
            OFT Store Address
          </label>
          <input
            type="text"
            value={oftStoreAddress}
            onChange={(e) => setOftStoreAddress(e.target.value)}
            className="lz-input w-full border-white"
            placeholder="Enter Solana OFT Store address"
          />
          <p className="text-sm text-layerzero-gray-500 mt-6">
            Note: this must be the OFT Store address, and not the OFT Program address.
          </p>
        </div>

        {/* EVM column */}
        <div className="lz-card">
          <div className="mb-6">
            <h4 className="text-lg font-medium text-layerzero-white mb-2">
              EVM
            </h4>
            <p className="text-layerzero-gray-500 text-sm">
              Set the Endpoint ID
            </p>
          </div>
          <label className="block text-sm font-medium text-layerzero-white mb-2">
            Endpoint / Network
          </label>
          <NetworkSelector
            networkQuery={networkQuery}
            setNetworkQuery={setNetworkQuery}
            metadataNetworks={metadataNetworks}
            selectedNetwork={selectedNetwork}
            setSelectedNetwork={setSelectedNetwork}
          />
          {selectedNetwork && (
            <div className="text-xs text-layerzero-gray-500 mt-2">
              <div>EID: <span className="text-layerzero-white">{selectedNetwork.eid}</span></div>
              {selectedNetwork.nativeChainId && (
                <div>Chain ID: <span className="text-layerzero-white">{selectedNetwork.nativeChainId}</span></div>
              )}
            </div>
          )}
          <div className="mt-6">
            <label className="block text-sm font-medium text-layerzero-white mb-2">
              OFT Contract Address (EVM)
            </label>
            <input
              type="text"
              value={evmOftAddress}
              onChange={(e) => setEvmOftAddress(e.target.value)}
              className="lz-input w-full border-white"
              placeholder="Enter EVM OFT contract address (0x...)"
            />
          </div>
          <div className="mt-3">
            <a
              href="https://docs.layerzero.network/v2/deployments/deployed-contracts"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-blue-400 underline hover:no-underline"
            >
              View Deployed Endpoints List
            </a>
          </div>
        </div>
      </div>
      )}

    </div>
  );
}


