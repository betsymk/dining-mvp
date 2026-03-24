// 打印统一接口
const EscposPrinter = require('./escpos');
const CupsPrinter = require('./cups');

class PrinterService {
  constructor(config) {
    this.config = config;
    
    if (config.type === 'escpos') {
      this.printer = new EscposPrinter(config);
    } else if (config.type === 'cups') {
      this.printer = new CupsPrinter(config);
    } else {
      throw new Error('Unsupported printer type');
    }
  }

  async connect() {
    return await this.printer.connect();
  }

  async printReceipt(receiptData) {
    return await this.printer.printReceipt(receiptData);
  }

  async getStatus() {
    return await this.printer.getStatus();
  }
}

module.exports = PrinterService;