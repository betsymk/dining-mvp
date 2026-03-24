// 小票模板
class ReceiptTemplate {
  static kitchenReceipt(orderData) {
    return {
      type: 'kitchen',
      content: [
        { type: 'text', text: '========================', align: 'center' },
        { type: 'text', text: 'KITCHEN ORDER', align: 'center', bold: true },
        { type: 'text', text: '========================', align: 'center' },
        { type: 'text', text: `Table: ${orderData.tableNumber}`, align: 'left' },
        { type: 'text', text: `Order: ${orderData.orderId}`, align: 'left' },
        { type: 'text', text: `Time: ${new Date().toLocaleTimeString()}`, align: 'left' },
        { type: 'text', text: '------------------------', align: 'center' },
        ...orderData.items.map(item => ({
          type: 'text',
          text: `${item.name} x${item.quantity}`,
          align: 'left'
        })),
        { type: 'text', text: '========================', align: 'center' }
      ]
    };
  }

  static cashierReceipt(orderData) {
    return {
      type: 'cashier',
      content: [
        { type: 'text', text: '========================', align: 'center' },
        { type: 'text', text: orderData.restaurantName, align: 'center', bold: true },
        { type: 'text', text: '========================', align: 'center' },
        { type: 'text', text: `Table: ${orderData.tableNumber}`, align: 'left' },
        { type: 'text', text: `Order: ${orderData.orderId}`, align: 'left' },
        { type: 'text', text: `Date: ${new Date().toLocaleDateString()}`, align: 'left' },
        { type: 'text', text: `Time: ${new Date().toLocaleTimeString()}`, align: 'left' },
        { type: 'text', text: '------------------------', align: 'center' },
        ...orderData.items.map(item => ({
          type: 'text',
          text: `${item.name} x${item.quantity}  ¥${item.price}`,
          align: 'left'
        })),
        { type: 'text', text: '------------------------', align: 'center' },
        { type: 'text', text: `Total: ¥${orderData.total}`, align: 'right', bold: true },
        { type: 'text', text: '========================', align: 'center' },
        { type: 'text', text: 'Thank you for dining!', align: 'center' },
        { type: 'text', text: 'Please visit again!', align: 'center' }
      ]
    };
  }
}

module.exports = ReceiptTemplate;