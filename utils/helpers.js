const fs = require('fs');
const logger = require('../config/logger');

/**
 * Load private keys from configuration file
 * @returns {string[]} Array of private keys
 */
function loadPrivateKeys() {
  try {
    const content = fs.readFileSync('./config/pk.txt', 'utf8');
    return content.split('\n').map(key => key.trim()).filter(key => key);
  } catch (error) {
    logger.error('Failed to load private keys: ' + error.message);
    process.exit(1);
  }
}

/**
 * Generate random amount between min and max with specific decimals
 * @param {string} min Minimum amount
 * @param {string} max Maximum amount
 * @param {number} decimals Number of decimal places
 * @returns {string} Random amount as string
 */
function getRandomAmount(min, max, decimals) {
  const multiplier = Math.pow(10, decimals);
  const minAmount = Math.floor(parseFloat(min) * multiplier);
  const maxAmount = Math.floor(parseFloat(max) * multiplier);
  const randomValue = Math.floor(Math.random() * (maxAmount - minAmount + 1)) + minAmount;
  return (randomValue / multiplier).toFixed(decimals);
}

module.exports = {
  loadPrivateKeys,
  getRandomAmount
};