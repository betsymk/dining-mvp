// CUPS打印机实现 (Linux/Mac)
const { exec } = require('child_process');

class CupsPrinter {
  constructor(config) {
    this.type = 'cups';
    this.printerName = config.printerName || 'default';
  }

  async connect() {
    // 连接CUPS打印机的逻辑
    console.log(`Connecting to CUPS printer: ${this.printerName}`);
    return true;
  }

  async printReceipt(receiptData) {
    // 打印小票的逻辑
    const receiptText = this.formatReceipt(receiptData);
    
    return new Promise((resolve, reject) => {
      const printCommand = `echo '${receiptText}' | lp -d ${this.printerName}`;
      
      exec(printCommand, (error, stdout, stderr) => {
        if (error) {
          reject({ success: false, message: `Print failed: ${error.message}` });
        } else {
          resolve({ success: true, message: 'Receipt printed successfully' });
        }
      });
    });
  }

  formatReceipt(data) {
    let receipt = '';
    receipt += '========================\n';
    receipt += `      ${data.restaurantName}\n`;
    receipt += '========================\n';
    receipt += `Table: ${data.tableNumber}\n`;
    receipt += `Order: ${data.orderId}\n`;
    receipt += `Time: ${new Date().toLocaleString()}\n`;
    receipt += '------------------------\n';
    
    data.items.forEach(item => {
      receipt += `${item.name} x${item.quantity}  ¥${item.price}\n`;
    });
    
    receipt += '------------------------\n';
    receipt += `Total: ¥${data.total}\n`;
    receipt += '========================\n';
    receipt += 'Thank you for dining!\n';
    
    return receipt;
  }

  async getStatus() {
    // 获取CUPS打印机状态的逻辑
    return new Promise((resolve, reject) => {
      const statusCommand = `lpstat -p ${this.printerName}`;
      
      exec(statusCommand, (error, stdout, stderr) => {
        if (error) {
          resolve({ connected: false, status: 'offline' });
        } else {
          const isIdle = stdout.includes('idle');
          resolve({ 
            connected: true, 
            status: isIdle ? 'ready' : 'busy',
            details: stdout.trim()
          });
        }
      });
    });
  }
}

module.exports = CupsPrinter;