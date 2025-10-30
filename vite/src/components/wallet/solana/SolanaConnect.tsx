import { FC } from "react";
import { useWallet, useConnection } from "@solana/wallet-adapter-react";
import {
  WalletDisconnectButton,
  WalletModalProvider,
  WalletMultiButton,
} from "@solana/wallet-adapter-react-ui";
// TODO: migrate to using @solana/wallet-standard which "has a simpler API and allows for exclusion of wallets" (to exclude MetaMask for Solana Devnet)
import "@solana/wallet-adapter-react-ui/styles.css";
import { FilePathDisplay } from "../../FilePathDisplay";

export const SolanaConnect: FC = () => {
  const { connected, publicKey, wallet } = useWallet();
  const { connection } = useConnection();

  // Get cluster info from the connection endpoint
  const getClusterName = (endpoint: string) => {
    if (endpoint.includes('devnet')) return 'Devnet';
    if (endpoint.includes('testnet')) return 'Testnet';
    if (endpoint.includes('mainnet')) return 'Mainnet';
    return 'Custom';
  };

  const clusterName = getClusterName(connection.rpcEndpoint);

  const isMetaMaskSolana = (() => {
    const adapterName = wallet?.adapter?.name ?? '';
    const injectedMetaMask = typeof window !== 'undefined' && window.solana?.isMetaMask === true;
    return /metamask/i.test(adapterName) || injectedMetaMask;
  })();

  return (
    <WalletModalProvider>
      <div>
        <FilePathDisplay text="/vite/src/components/wallet/solana/SolanaConnect.tsx" />

        <style>
          {`
            .wallet-buttons-container {
              margin-top: 1rem;
              display: flex !important;
              align-items: center !important;
              gap: 1rem !important;
              flex-wrap: wrap !important;
            }
            .wallet-buttons-container > * {
              display: inline-flex !important;
              margin: 0 !important;
            }
            .wallet-adapter-button {
              display: inline-flex !important;
              width: 100% !important;
              justify-content: center !important;
              margin: 0 !important;
              background-color: #000000 !important;
              border: 1px solid #FFFFFF !important;
              color: #FFFFFF !important;
              border-radius: 0 !important;
              padding: 0.75rem 1.5rem !important;
              font-size: 0.875rem !important;
              font-weight: 500 !important;
              text-transform: uppercase !important;
              letter-spacing: 0.05em !important;
              transition: all 0.2s ease !important;
            }
            .wallet-adapter-button:hover {
              background-color: #FFFFFF !important;
              color: #000000 !important;
            }
            .wallet-adapter-button:disabled {
              opacity: 0.5 !important;
              cursor: not-allowed !important;
            }
          `}
        </style>
        
        {connected ? (
          <div className="space-y-3">
            <div className="text-sm">
              <span className="font-medium text-layerzero-gray-400">Cluster:</span>{' '}
              <span className="font-medium text-blue-400">
                {clusterName}
              </span>
            </div>
            <div className="text-sm text-white">
              <span className="font-medium text-layerzero-gray-400">Address:</span> {publicKey?.toString()}
            </div>
            {clusterName === 'Devnet' && isMetaMaskSolana && (
              <div className="rounded border border-yellow-500 bg-yellow-50 p-3 text-yellow-800">
                MetaMask does not support Solana Devnet. Please disconnect and connect using a different wallet.
              </div>
            )}
            {clusterName === 'Testnet' && (
              <div className="rounded border border-yellow-500 bg-yellow-50 p-3 text-yellow-800">
                Solana Testnet is not supported. Please use Devnet or Mainnet.
              </div>
            )}
            <div className="wallet-buttons-container">
              <WalletDisconnectButton />
            </div>
          </div>
        ) : (
          <div className="wallet-buttons-container flex items-center gap-4 flex-wrap">
            <WalletMultiButton />
          </div>
        )}
      </div>
    </WalletModalProvider>
  );
};
