// 支付统一接口
const WechatPay = require('./wechat');
const AlipayPay = require('./alipay');

class PaymentService {
  constructor(config) {
    this.config = config;
    this.wechatPay = new WechatPay({
      appId: config.WECHAT_APPID,
      mchId: config.WECHAT_MCHID,
      apiV3Key: config.WECHAT_APIV3_KEY,
      certPath: config.WECHAT_CERT_PATH
    });
    
    this.alipayPay = new AlipayPay({
      appId: config.ALIPAY_APPID,
      privateKey: config.ALIPAY_PRIVATE_KEY,
      alipayPublicKey: config.ALIPAY_PUBLIC_KEY
    });
  }

  async createPaymentOrder(orderId, amount, method, description, notifyUrl) {
    if (method === 'wechat') {
      return await this.wechatPay.createOrder(orderId, amount, description, notifyUrl);
    } else if (method === 'alipay') {
      return await this.alipayPay.createOrder(orderId, amount, description, notifyUrl);
    } else {
      throw new Error('Unsupported payment method');
    }
  }

  async verifyPaymentCallback(method, callbackData) {
    if (method === 'wechat') {
      return await this.wechatPay.verifyCallback(callbackData);
    } else if (method === 'alipay') {
      return await this.alipayPay.verifyCallback(callbackData);
    } else {
      throw new Error('Unsupported payment method');
    }
  }
}

module.exports = PaymentService;