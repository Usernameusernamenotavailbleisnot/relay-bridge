const { ethers } = require('ethers');
const logger = require('../config/logger');

class ProviderManager {
  static async getWorkingProvider(chainId, rpcUrls) {
    if (!rpcUrls || rpcUrls.length === 0) {
      throw new Error(`No RPC configured for chain ${chainId}`);
    }

    for (const rpcUrl of rpcUrls) {
      try {
        logger.debug(`Attempting connection to RPC: ${rpcUrl}`);
        const provider = new ethers.providers.JsonRpcProvider(rpcUrl);
        await provider.getNetwork();
        return provider;
      } catch (error) {
        logger.debug(`RPC ${rpcUrl} failed: ${error.message}`);
      }
    }
    
    throw new Error(`No working RPC found for chain ${chainId}`);
  }

  static async getChainProvider(chainId, chainConfigs) {
    const chain = Object.values(chainConfigs)
      .find(network => Object.values(network)
        .find(chain => chain.id === chainId));
        
    if (!chain) {
      throw new Error(`Unsupported chain ID: ${chainId}`);
    }

    const matchingChain = Object.values(chain)
      .find(c => c.id === chainId);
      
    return this.getWorkingProvider(chainId, matchingChain.rpcs);
  }
}