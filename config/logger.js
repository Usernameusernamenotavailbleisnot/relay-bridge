const chalk = require('chalk');
const fs = require('fs');
const path = require('path');

class Logger {
  constructor() {
    this.logDir = path.join(process.cwd(), 'logs');
    this.ensureLogDirectory();
  }

  ensureLogDirectory() {
    if (!fs.existsSync(this.logDir)) {
      fs.mkdirSync(this.logDir);
    }
  }

  getTimestamp() {
    const options = { 
      year: 'numeric', 
      month: '2-digit', 
      day: '2-digit',
      hour: '2-digit', 
      minute: '2-digit', 
      second: '2-digit',
      hour12: false 
    };
    return new Intl.DateTimeFormat('en-GB', options).format(new Date());
  }

  formatMessage(status, message) {
    const timestamp = this.getTimestamp();
    return `${timestamp} | ${status.padEnd(7)} | ${message}`;
  }

  writeToFile(message) {
    const date = new Date().toISOString().split('T')[0];
    const logFile = path.join(this.logDir, `${date}.log`);
    fs.appendFileSync(logFile, message + '\n');
  }

  success(message) {
    const formattedMsg = this.formatMessage('SUCCESS', message);
    console.log(chalk.green(formattedMsg));
    this.writeToFile(formattedMsg);
  }

  error(message) {
    const formattedMsg = this.formatMessage('ERROR', message);
    console.log(chalk.red(formattedMsg));
    this.writeToFile(formattedMsg);
  }

  info(message) {
    const formattedMsg = this.formatMessage('INFO', message);
    console.log(chalk.blue(formattedMsg));
    this.writeToFile(formattedMsg);
  }

  debug(message) {
    const formattedMsg = this.formatMessage('DEBUG', message);
    console.log(chalk.yellow(formattedMsg));
    this.writeToFile(formattedMsg);
  }

  warn(message) {
    const formattedMsg = this.formatMessage('WARN', message);
    console.log(chalk.yellow(formattedMsg));
    this.writeToFile(formattedMsg);
  }
}

module.exports = new Logger();