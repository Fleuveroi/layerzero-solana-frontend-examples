import { useReadContract } from 'wagmi'
import { useState, useEffect, useMemo, useCallback } from 'react'
import { createPublicClient, http } from 'viem'
import { readContract as viemReadContract } from 'viem/actions'
import { myOftMockAbi } from '../vm-artifacts/evm/MyOFTMock'
import { 
  formatEvmTokenBalance, 
  getEvmOftContracts, 
  getEvmMintParameters 
} from '../utils/oft'
import { useEvmBase } from './utils'

// Network-agnostic OFT address export
export const oftAddress = getEvmOftContracts().sepoliaOft;

export function useEvmOft(overrideOftAddress?: `0x${string}` | string, rpcUrl?: string) {
  const evmBase = useEvmBase()
  const { address, isConnected, isCorrectNetwork, chainId, hash, isPending, isConfirming, isConfirmed, error, writeContract, handleSwitchNetwork, handleError } = evmBase

  const contracts = getEvmOftContracts()
  const selectedOftAddress = (typeof overrideOftAddress === 'string' && overrideOftAddress.startsWith('0x') && overrideOftAddress.length === 42
    ? (overrideOftAddress as `0x${string}`)
    : contracts.sepoliaOft)

  // Read user's token balance
  const { data: balance, refetch: refetchBalance } = useReadContract({
    address: selectedOftAddress,
    abi: myOftMockAbi,
    functionName: 'balanceOf',
    args: [address as `0x${string}`],
    query: { enabled: !!address }
  })

  // Optional dynamic balance via RPC
  const [externalBalance, setExternalBalance] = useState<bigint | undefined>(undefined)

  useEffect(() => {
    let cancelled = false
    const fetchExternal = async () => {
      if (!rpcUrl || !address) {
        setExternalBalance(undefined)
        return
      }
      try {
        const client = createPublicClient({ transport: http(rpcUrl) })
        const result = await viemReadContract(client, {
          address: selectedOftAddress,
          abi: myOftMockAbi,
          functionName: 'balanceOf',
          args: [address as `0x${string}`],
        }) as bigint
        if (!cancelled) setExternalBalance(result)
      } catch {
        if (!cancelled) setExternalBalance(undefined)
      }
    }
    fetchExternal()
    return () => { cancelled = true }
  }, [rpcUrl, address, selectedOftAddress])

  const displayedBalance = useMemo(() => (rpcUrl ? externalBalance : (balance as bigint | undefined)), [rpcUrl, externalBalance, balance])

  // Format balance for display
  const formattedBalance = formatEvmTokenBalance(displayedBalance as bigint | undefined)

  // Debug: log which RPC path is used for balances
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      if (rpcUrl) {
        console.log('[OFT Balances] Using RPC:', rpcUrl)
      } else {
        console.log('[OFT Balances] Using wallet provider (wagmi)')
      }
    }
  }, [rpcUrl])

  // Handle mint operation
  const handleMint = useCallback(async () => {
    if (!address || !isCorrectNetwork) return

    evmBase.clearError()
    try {
      writeContract({
        address: selectedOftAddress,
        abi: myOftMockAbi,
        functionName: 'mint',
        args: [address as `0x${string}`, getEvmMintParameters(address, '1').args[1]],
      })
    } catch (error) {
      handleError(error, 'Error minting')
    }
  }, [address, isCorrectNetwork, writeContract, evmBase, handleError, selectedOftAddress])

  // Refetch balance when transaction is confirmed
  useEffect(() => {
    if (isConfirmed) {
      const timer = setTimeout(() => {
        refetchBalance()
      }, 1000)
      return () => clearTimeout(timer)
    }
  }, [isConfirmed, refetchBalance])

  return {
    // Wallet state
    address,
    isConnected,
    
    // Network state
    isCorrectNetwork,
    chainId,
    
    // Token state
    balance,
    formattedBalance,
    
    // Transaction state
    isPending,
    isConfirming,
    isConfirmed,
    hash,
    
    // Error state
    error,
    
    // Actions
    handleMint,
    handleSwitchNetwork,
    refetchBalance,
  }
} 