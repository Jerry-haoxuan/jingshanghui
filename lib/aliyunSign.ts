// 阿里云 RPC 风格签名（短信 / OCR 共用）。AccessKey Secret 由调用方传入，
// 避免这个模块自己读环境变量，方便两处服务各自校验配置是否齐全。
import crypto from 'crypto'

export function percentEncode(str: string): string {
  return encodeURIComponent(str)
    .replace(/\+/g, '%20')
    .replace(/\*/g, '%2A')
    .replace(/%7E/g, '~')
}

export function buildAliyunRpcSignature(params: Record<string, string>, accessKeySecret: string): string {
  const sorted = Object.keys(params).sort()
  const canonicalized = sorted
    .map(key => `${percentEncode(key)}=${percentEncode(params[key])}`)
    .join('&')
  const stringToSign = `POST&${percentEncode('/')}&${percentEncode(canonicalized)}`
  const hmac = crypto.createHmac('sha1', `${accessKeySecret}&`)
  return hmac.update(stringToSign).digest('base64')
}
