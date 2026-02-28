'use client'

import { useState } from 'react'
import { X, Star } from 'lucide-react'

const POSITIVE_TAGS = ['合作愉快', '响应及时', '专业可靠', '信守承诺', '高效执行', '沟通顺畅']
const NEGATIVE_TAGS = ['拖延付款', '不守承诺', '沟通困难', '响应迟缓', '临时变卦', '需改进']

interface ReviewModalProps {
  projectName: string
  revieweeName: string
  onSubmit: (tags: string[], comment: string) => void
  onClose: () => void
  loading?: boolean
}

export default function ReviewModal({
  projectName,
  revieweeName,
  onSubmit,
  onClose,
  loading = false,
}: ReviewModalProps) {
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [comment, setComment] = useState('')

  const toggleTag = (tag: string) => {
    setSelectedTags(prev =>
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    )
  }

  const handleSubmit = () => {
    onSubmit(selectedTags, comment)
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-xl">
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <div>
            <h2 className="font-bold text-gray-900">项目评价</h2>
            <p className="text-sm text-gray-500 mt-0.5">对「{projectName}」中的合作伙伴进行评价</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="p-5 space-y-5">
          <div>
            <p className="text-sm text-gray-600 mb-1">
              您正在评价：<span className="font-semibold text-gray-900">{revieweeName}</span>
            </p>
          </div>

          <div>
            <p className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-1">
              <Star className="w-4 h-4 text-yellow-500" /> 选择评价标签（可多选）
            </p>
            <div className="mb-2">
              <p className="text-xs text-green-600 mb-1.5 font-medium">正面评价</p>
              <div className="flex flex-wrap gap-2">
                {POSITIVE_TAGS.map(tag => (
                  <button
                    key={tag}
                    onClick={() => toggleTag(tag)}
                    className={`text-xs px-3 py-1.5 rounded-full border transition-all ${
                      selectedTags.includes(tag)
                        ? 'bg-green-500 text-white border-green-500'
                        : 'bg-white text-gray-600 border-gray-200 hover:border-green-300'
                    }`}
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className="text-xs text-red-500 mb-1.5 font-medium">待改进</p>
              <div className="flex flex-wrap gap-2">
                {NEGATIVE_TAGS.map(tag => (
                  <button
                    key={tag}
                    onClick={() => toggleTag(tag)}
                    className={`text-xs px-3 py-1.5 rounded-full border transition-all ${
                      selectedTags.includes(tag)
                        ? 'bg-red-500 text-white border-red-500'
                        : 'bg-white text-gray-600 border-gray-200 hover:border-red-200'
                    }`}
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700 mb-1.5 block">补充评语（选填）</label>
            <textarea
              value={comment}
              onChange={e => setComment(e.target.value)}
              placeholder="分享你的合作体验..."
              className="w-full text-sm border border-gray-200 rounded-xl p-3 resize-none h-24 focus:outline-none focus:ring-2 focus:ring-blue-300"
            />
          </div>
        </div>

        <div className="flex gap-3 p-5 border-t border-gray-100">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 border border-gray-200 text-gray-600 rounded-xl text-sm hover:bg-gray-50 transition-colors"
          >
            稍后再说
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading || selectedTags.length === 0}
            className="flex-1 py-2.5 bg-blue-600 text-white rounded-xl text-sm hover:bg-blue-700 transition-colors disabled:opacity-50 font-medium"
          >
            {loading ? '提交中...' : '提交评价'}
          </button>
        </div>
      </div>
    </div>
  )
}
