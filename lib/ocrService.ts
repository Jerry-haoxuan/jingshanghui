// 阿里云通用文字识别 OCR 服务：用于"上传名片/扫描件图片，自动识别文字"
// 与短信服务共用同一对 RAM 用户 AccessKey（见 lib/smsService.ts）
import crypto from 'crypto'

const ALIYUN_ACCESS_KEY_ID = process.env.ALIYUN_ACCESS_KEY_ID || ''
const ALIYUN_ACCESS_KEY_SECRET = process.env.ALIYUN_ACCESS_KEY_SECRET || ''

export const isOcrConfigured = Boolean(ALIYUN_ACCESS_KEY_ID && ALIYUN_ACCESS_KEY_SECRET)

const OCR_ENDPOINT = 'https://ocr-api.cn-hangzhou.aliyuncs.com/'

function percentEncode(str: string): string {
  return encodeURIComponent(str)
    .replace(/\+/g, '%20')
    .replace(/\*/g, '%2A')
    .replace(/%7E/g, '~')
}

function buildSignature(params: Record<string, string>): string {
  const sorted = Object.keys(params).sort()
  const canonicalized = sorted
    .map(key => `${percentEncode(key)}=${percentEncode(params[key])}`)
    .join('&')
  const stringToSign = `POST&${percentEncode('/')}&${percentEncode(canonicalized)}`
  const hmac = crypto.createHmac('sha1', `${ALIYUN_ACCESS_KEY_SECRET}&`)
  return hmac.update(stringToSign).digest('base64')
}

export interface OcrResult {
  success: boolean
  text: string
  message?: string
}

// 识别图片中的文字内容（RecognizeGeneral：通用文字识别，保留原文档排版）
// imageBuffer: 图片二进制内容，最大 10MB
export async function recognizeImageText(imageBuffer: Buffer): Promise<OcrResult> {
  if (!isOcrConfigured) {
    return { success: false, text: '', message: 'OCR服务未配置AccessKey' }
  }
  if (imageBuffer.length > 10 * 1024 * 1024) {
    return { success: false, text: '', message: '图片过大，请上传不超过10MB的图片' }
  }

  const params: Record<string, string> = {
    AccessKeyId: ALIYUN_ACCESS_KEY_ID,
    Action: 'RecognizeGeneral',
    Format: 'JSON',
    SignatureMethod: 'HMAC-SHA1',
    SignatureNonce: crypto.randomUUID(),
    SignatureVersion: '1.0',
    Timestamp: new Date().toISOString().replace(/\.\d{3}Z$/, 'Z'),
    Version: '2021-07-07',
  }
  const signature = buildSignature(params)
  const finalParams = { ...params, Signature: signature }
  const query = Object.entries(finalParams)
    .map(([k, v]) => `${percentEncode(k)}=${percentEncode(v)}`)
    .join('&')

  try {
    const res = await fetch(`${OCR_ENDPOINT}?${query}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/octet-stream' },
      body: imageBuffer,
    })
    const data = await res.json()

    if (data.Code) {
      console.error('[OCR] 阿里云OCR识别失败:', data)
      return { success: false, text: '', message: data.Message || 'OCR识别失败' }
    }

    const parsed = JSON.parse(data.Data || '{}')
    const content: string = parsed.content || ''
    return { success: true, text: content }
  } catch (err) {
    console.error('[OCR] OCR请求异常:', err)
    return { success: false, text: '', message: 'OCR服务请求异常，请稍后重试' }
  }
}
