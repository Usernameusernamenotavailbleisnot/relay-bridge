const CHAIN_CONFIGS = {
    TESTNET: {
      SEPOLIA: {
        id: 11155111,
        rpcs: [
          'https://eth-sepolia.public.blastapi.io',
          'https://ethereum-sepolia.blockpi.network/v1/rpc/public',
          'https://rpc.ankr.com/eth_sepolia',
        ]
      },
      BASE_SEPOLIA: {
        id: 84532,
        rpcs: ['https://sepolia.base.org']
      }
    }
  };
  
  const API_ENDPOINTS = {
    TESTNET: 'https://api.testnets.relay.link',
    MAINNET: 'https://api.relay.link'
  };
  
  const ETH_ADDRESS = '0x0000000000000000000000000000000000000000';
  
  module.exports = {
    CHAIN_CONFIGS,
    API_ENDPOINTS,
    ETH_ADDRESS
  };