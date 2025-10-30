export {};

declare global {
  interface Window {
    solana?: {
      // Add only what we need now; extend as needed later
      isMetaMask?: boolean;
    };
  }
}


