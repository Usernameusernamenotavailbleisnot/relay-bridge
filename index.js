const inquirer = require('inquirer');
const { ethers } = require('ethers');
const logger = require('./config/logger');
const { loadPrivateKeys, getRandomAmount } = require('./utils/helpers');
const { createAdaptedWallet } = require('./utils/walletAdapter');
const { CHAIN_CONFIGS } = require('./config/constants');
const { BridgeService } = require('./services/bridgeService');

// API Endpoints
const API_ENDPOINTS = {
  TESTNET: 'https://api.testnets.relay.link',
  MAINNET: 'https://api.relay.link'
};

async function getChains(isTestnet = false) {
  const baseUrl = isTestnet ? API_ENDPOINTS.TESTNET : API_ENDPOINTS.MAINNET;
  try {
    const response = await fetch(`${baseUrl}/chains`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    return data.chains;
  } catch (error) {
    throw new Error(`Failed to fetch chain data: ${error.message}`);
  }
}

async function processSingleWallet(bridgeService, privateKey, config) {
  logger.info(`Processing wallet: ${privateKey.slice(0, 6)}...`);
  
  await bridgeService.initialize(config.sourceChain.id, privateKey);
  const balance = await bridgeService.validateBalance(config.amount);
  logger.info(`Current wallet balance: ${ethers.utils.formatEther(balance)} ETH`);
  
  const quote = await bridgeService.getQuote(
    config.sourceChain.id,
    config.destinationChain.id,
    config.amount
  );
  
  const adaptedWallet = createAdaptedWallet(privateKey, bridgeService.provider.connection.url);
  const requestId = await bridgeService.executeBridge(
    quote,
    adaptedWallet,
    config.sourceChain.displayName,
    config.destinationChain.displayName,
    config.explorerUrl
  );
  
  if (requestId) {
    const finalStatus = await bridgeService.trackBridgeStatus(
      requestId,
      config.stage === 'testnet'
    );
    
    if (finalStatus.status === 'success') {
      logger.success(
        `Bridge completed successfully!\n` +
        `Source Transaction: ${finalStatus.inTxHashes[0]}\n` +
        `Destination Transaction: ${finalStatus.txHashes[0]}`
      );
    } else {
      logger.error(
        `Bridge ${finalStatus.status}\n` +
        `Details: ${finalStatus.details || 'No details available'}`
      );
    }
  }
}

async function getBridgeConfiguration() {
  const { stage } = await inquirer.prompt([{
    type: 'list',
    name: 'stage',
    message: 'Select network:',
    choices: [
      { name: 'Testnet', value: 'testnet' },
      { name: 'Mainnet', value: 'mainnet' }
    ]
  }]);

  const chains = await getChains(stage === 'testnet');
  
  const { sourceChain, destinationChain, amountType } = await inquirer.prompt([
    {
      type: 'list',
      name: 'sourceChain',
      message: 'Select source chain:',
      choices: chains.map(chain => ({
        name: `▫️ ${chain.displayName}`,
        value: chain
      }))
    },
    {
      type: 'list',
      name: 'destinationChain',
      message: 'Select destination chain:',
      choices: chains.map(chain => ({
        name: `▫️ ${chain.displayName}`,
        value: chain
      }))
    },
    {
      type: 'list',
      name: 'amountType',
      message: 'Select amount type:',
      choices: [
        { name: 'Fixed Amount', value: 'fixed' },
        { name: 'Random Range', value: 'range' }
      ]
    }
  ]);

  const amount = await getAmount(amountType);

  return {
    stage,
    sourceChain,
    destinationChain,
    amount,
    explorerUrl: sourceChain.explorerUrl + '/tx/'
  };
}

async function getAmount(amountType) {
  if (amountType === 'fixed') {
    const { amount } = await inquirer.prompt([{
      type: 'input',
      name: 'amount',
      message: 'Enter ETH amount to bridge (e.g., 0.00005):',
      validate: value => {
        if (isNaN(value) || parseFloat(value) <= 0) {
          return 'Please enter a valid positive number.';
        }
        return true;
      }
    }]);
    return amount;
  }

  const range = await inquirer.prompt([
    {
      type: 'input',
      name: 'min',
      message: 'Enter minimum ETH amount:',
      validate: value => {
        if (isNaN(value) || parseFloat(value) <= 0) {
          return 'Please enter a valid positive number.';
        }
        return true;
      }
    },
    {
      type: 'input',
      name: 'max',
      message: 'Enter maximum ETH amount:',
      validate: (value, answers) => {
        if (isNaN(value) || parseFloat(value) <= 0) {
          return 'Please enter a valid positive number.';
        }
        if (parseFloat(value) <= parseFloat(answers.min)) {
          return 'Maximum amount must be greater than minimum amount.';
        }
        return true;
      }
    },
    {
      type: 'input',
      name: 'decimals',
      message: 'Enter number of decimals (1-18):',
      default: '5',
      validate: value => {
        const decimals = parseInt(value);
        if (isNaN(decimals) || decimals < 1 || decimals > 18) {
          return 'Please enter a number between 1 and 18.';
        }
        return true;
      }
    }
  ]);

  const amount = getRandomAmount(range.min, range.max, parseInt(range.decimals));
  logger.info(`Generated random amount: ${amount} ETH`);
  return amount;
}

async function main() {
  try {
    const privateKeys = loadPrivateKeys();
    logger.info(`Loaded ${privateKeys.length} private keys`);

    const bridgeConfig = await getBridgeConfiguration();
    
    logger.info(
      `Bridging ${bridgeConfig.amount} ETH from ` +
      `${bridgeConfig.sourceChain.displayName} (ChainId: ${bridgeConfig.sourceChain.id}) to ` +
      `${bridgeConfig.destinationChain.displayName} (ChainId: ${bridgeConfig.destinationChain.id})`
    );

    const bridgeService = new BridgeService();
    
    for (const privateKey of privateKeys) {
      try {
        await processSingleWallet(bridgeService, privateKey, bridgeConfig);
      } catch (error) {
        logger.error(`Error processing wallet ${privateKey.slice(0, 6)}: ${error.message}`);
        continue;
      }
    }
  } catch (error) {
    logger.error('Operation failed: ' + error.message);
    process.exit(1);
  }
}

main().catch(error => {
  logger.error('Unhandled error: ' + error.message);
  process.exit(1);
});