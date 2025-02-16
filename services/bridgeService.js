const { getClient, createClient } = require('@reservoir0x/relay-sdk');
const { ethers } = require('ethers');
const { createAdaptedWallet } = require('../utils/walletAdapter');
const logger = require('../config/logger');
const { CHAIN_CONFIGS, API_ENDPOINTS, ETH_ADDRESS } = require('../config/constants');

class BridgeService {
  constructor() {
    this.provider = null;
    this.wallet = null;
  }

  async initialize(chainId, privateKey) {
    this.provider = await this.getChainProvider(chainId);
    this.wallet = new ethers.Wallet(privateKey, this.provider);
  }

  async getChainProvider(chainId) {
    try {
      // For now, we'll use Sepolia's first RPC as default
      const provider = new ethers.providers.JsonRpcProvider(CHAIN_CONFIGS.TESTNET.SEPOLIA.rpcs[0]);
      await provider.getNetwork();
      return provider;
    } catch (error) {
      throw new Error(`Failed to connect to provider: ${error.message}`);
    }
  }

  async validateBalance(amount) {
    const balance = await this.wallet.getBalance();
    const amountWei = ethers.utils.parseEther(amount);
    
    if (balance.lt(amountWei)) {
      throw new Error(`Insufficient balance. Required: ${amount} ETH, Available: ${ethers.utils.formatEther(balance)} ETH`);
    }
    
    return balance;
  }

  async getQuote(sourceChainId, destChainId, amount) {
    const amountWei = ethers.utils.parseEther(amount);
    const adaptedWallet = createAdaptedWallet(this.wallet.privateKey, this.provider.connection.url);

    // Configure relay client
    createClient({
      baseApiUrl: sourceChainId === 11155111 ? API_ENDPOINTS.TESTNET : API_ENDPOINTS.MAINNET,
      source: 'eth-bridge'
    });

    return getClient().actions.getQuote({
      chainId: sourceChainId,
      toChainId: destChainId,
      currency: ETH_ADDRESS,
      toCurrency: ETH_ADDRESS,
      amount: amountWei.toString(),
      tradeType: 'EXACT_INPUT',
      wallet: adaptedWallet
    });
  }

  async executeBridge(quote, adaptedWallet, sourceChain, destChain, explorer) {
    let requestId = null;
    let txProcessed = false;

    await getClient().actions.execute({
      quote,
      wallet: adaptedWallet,
      onProgress: async (progress) => {
        // Extract requestId if not already done
        if (!requestId) {
          const checkItem = progress.steps
            ?.flatMap(step => step.items || [])
            .find(item => item.check?.requestId);
          if (checkItem) {
            requestId = checkItem.check.requestId;
          }
        }

        const step = progress.steps?.[0];
        const item = step?.items?.[0];
        
        if (!item) return;

        // Get main transaction details
        const ethAmount = item.data?.value ? ethers.utils.formatEther(item.data.value) : '';
        const status = item.progressState ? item.progressState.toUpperCase() : 'PENDING';
        const txHash = item.internalTxHashes?.[0]?.txHash;
        const destTxHash = item.txHashes?.[0]?.txHash;

        // Format progress log
        logger.info(
          `Depositing ${ethAmount} ETH | Status: ${status}` + 
          (txHash ? ` | TX: ${txHash.slice(0, 10)}...` : '') +
          (destTxHash ? ` | Dest: ${destTxHash.slice(0, 10)}...` : '')
        );

        // Log completion
        if (item.status === 'complete' && !txProcessed) {
          logger.success(
            `Bridge completed | Amount: ${ethAmount} ETH | ` +
            `From: ${sourceChain} to ${destChain} | ` +
            `TX: ${txHash.slice(0, 10)}...`
          );
          txProcessed = true;
        }
      }
    });

    return requestId;
  }

  async trackBridgeStatus(requestId, isTestnet) {
    const baseUrl = isTestnet ? API_ENDPOINTS.TESTNET : API_ENDPOINTS.MAINNET;
    let lastStatus = '';
    let retryCount = 0;
    const MAX_RETRIES = 100; // Maximum number of retries (5 minutes with 3-second intervals)
    
    while (retryCount < MAX_RETRIES) {
      try {
        const response = await fetch(`${baseUrl}/intents/status/v2?requestId=${requestId}`);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        // Only log if status changes
        const status = data.status.toUpperCase();
        const txHash = data.txHashes?.[0];
        
        if (status !== lastStatus) {
          logger.info(
            `Bridge status: ${status}` +
            (txHash ? ` | Dest TX: ${txHash.slice(0, 10)}...` : '')
          );
          lastStatus = status;
        }
        
        // Check if we're done
        if (['SUCCESS', 'FAILURE', 'REFUND'].includes(status)) {
          if (status === 'SUCCESS') {
            logger.success(
              `Bridge transfer successful | ` +
              `Destination TX: ${data.txHashes[0].slice(0, 10)}...`
            );
          } else {
            logger.error(
              `Bridge ${status.toLowerCase()} | ` +
              `Details: ${data.details || 'No details available'}`
            );
          }
          return data;
        }
        
        await new Promise(resolve => setTimeout(resolve, 3000));
        retryCount++;
      } catch (error) {
        logger.debug(`Status check error: ${error.message}`);
        await new Promise(resolve => setTimeout(resolve, 3000));
        retryCount++;
      }
    }
    
    throw new Error('Bridge status check timed out after 5 minutes');
  }

  async processBridgeTransaction(sourceChainId, destChainId, amount, privateKey, explorer) {
    try {
      await this.initialize(sourceChainId, privateKey);
      
      // Validate balance
      await this.validateBalance(amount);
      logger.info(`Current wallet balance: ${ethers.utils.formatEther(await this.wallet.getBalance())} ETH`);
      
      // Get quote
      const quote = await this.getQuote(sourceChainId, destChainId, amount);
      
      // Execute bridge
      const adaptedWallet = createAdaptedWallet(privateKey, this.provider.connection.url);
      const requestId = await this.executeBridge(quote, adaptedWallet, sourceChainId, destChainId, explorer);
      
      if (requestId) {
        return await this.trackBridgeStatus(requestId, sourceChainId === 11155111);
      }
      
      throw new Error('No requestId received from bridge execution');
    } catch (error) {
      logger.error(`Bridge transaction failed: ${error.message}`);
      throw error;
    }
  }
}

module.exports = { BridgeService };