# Relay.link Bridge CLI Tool

A command-line interface tool for bridging ETH across different networks using the Relay API. This tool supports multiple testnets including Sepolia, Base Sepolia, Zora Sepolia, and more.

## Features

- 🌉 Bridge ETH between different networks
- 💰 Automatic balance checking
- 🔄 Real-time transaction status tracking
- 📝 Detailed logging with timestamps
- 🎲 Support for fixed or random amount bridging
- 🔑 Multi-wallet support through configuration

## Installation

```bash
# Clone the repository
git clone https://github.com/Usernameusernamenotavailbleisnot/relay-bridge.git

# Navigate to project directory
cd relay-bridge

# Install dependencies
npm install
```

## Configuration

1. Create `config/pk.txt` with your private keys (one per line):
```
YOUR_PRIVATE_KEY_1
YOUR_PRIVATE_KEY_2
```

2. Configure RPCs in `config/constants.js` if needed.

## Usage

```bash
# Start the bridge tool
node index.js
```

Follow the interactive prompts to:
1. Select network (Testnet/Mainnet)
2. Choose source chain
3. Choose destination chain
4. Select amount type (Fixed/Random)
5. Enter amount details

## Supported Networks

- Sepolia (ChainId: 11155111)
- Base Sepolia (ChainId: 84532)
- Zora Sepolia
- And more...

## Example Output

```
16/02/2025, 00:52:19 | INFO    | Bridging 0.01 ETH from Sepolia to Unichain Sepolia
16/02/2025, 00:52:19 | INFO    | Processing wallet: 0x0538...
16/02/2025, 00:52:19 | INFO    | Current wallet balance: 18.99873902 ETH
16/02/2025, 00:52:20 | INFO    | Depositing 0.01 ETH | Status: CONFIRMING
16/02/2025, 00:52:25 | INFO    | Depositing 0.01 ETH | Status: VALIDATING | TX: 0xed8c4ed7...
16/02/2025, 00:52:33 | SUCCESS | Bridge completed | Amount: 0.01 ETH | TX: 0xed8c4ed7...
```

## Project Structure

```
eth-bridge-cli/
├── config/
│   ├── constants.js       # Configuration constants
│   ├── logger.js         # Logging utility
│   └── pk.txt           # Private keys (git ignored)
├── services/
│   └── bridgeService.js  # Bridge functionality
├── utils/
│   ├── providerUtils.js  # Provider management
│   ├── walletAdapter.js  # Wallet adapter utility
│   └── helpers.js       # Helper functions
├── index.js             # Entry point
```

## Dependencies

- ethers@5
- @reservoir0x/relay-sdk
- @reservoir0x/relay-ethers-wallet-adapter
- inquirer
- chalk

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT License - feel free to use and modify this code for your own projects.

## Safety Notice

- Never share your private keys
- Always verify transaction details before confirming
- Test with small amounts first
- Keep your private keys secure and never commit them to git

## Disclaimer

This tool is provided as-is. Please use at your own risk and always verify transactions before confirming them.
