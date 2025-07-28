'use client'

import React from 'react'
import { Building2, GraduationCap, MapPin, Users } from 'lucide-react'
import { deterministicAliasName } from '@/lib/deterministicNameAlias'

interface GraphNode {
  id: string
  name: string
  type: 'person' | 'company' | 'school' | 'location'
  group: number
  info?: {
    position?: string
    phone?: string
    email?: string
    currentCity?: string
    industry?: string
  }
}

interface GraphLink {
  source: string
  target: string
  relationship: string
  strength: number
}

interface StaticRelationshipGraphProps {
  nodes: GraphNode[]
  links: GraphLink[]
  centerNodeId: string
  onNodeClick?: (node: GraphNode) => void
  isModal?: boolean
}

export default function StaticRelationshipGraph({ 
  nodes, 
  links, 
  centerNodeId, 
  onNodeClick,
  isModal = false
}: StaticRelationshipGraphProps) {
  // 找到中心节点
  const centerNode = nodes.find(node => node.id === centerNodeId)
  const otherNodes = nodes.filter(node => node.id !== centerNodeId)
  
  if (!centerNode) return null

  // 计算节点位置 - 围绕中心节点的圆形布局
  const centerX = isModal ? 200 : 400
  const centerY = isModal ? 192 : 300
  const radius = isModal ? 120 : 160
  const nodePositions = new Map<string, { x: number; y: number }>()

  // 中心节点位置
  nodePositions.set(centerNodeId, { x: centerX, y: centerY })

  // 其他节点围绕中心节点的圆形布局
  otherNodes.forEach((node, index) => {
    const angle = (index * 2 * Math.PI) / otherNodes.length
    const x = centerX + radius * Math.cos(angle)
    const y = centerY + radius * Math.sin(angle)
    nodePositions.set(node.id, { x, y })
  })

  // 获取节点图标
  const getNodeIcon = (type: string) => {
    switch (type) {
      case 'company':
        return <Building2 className="w-4 h-4" />
      case 'school':
        return <GraduationCap className="w-4 h-4" />
      case 'location':
        return <MapPin className="w-4 h-4" />
      default:
        return <Users className="w-4 h-4" />
    }
  }

  // 获取节点颜色
  const getNodeColor = (node: GraphNode) => {
    if (node.id === centerNodeId) {
      return '#7C3AED' // 中心节点使用紫色
    }
    switch (node.type) {
      case 'company':
        return '#6366F1' // 企业用蓝色
      case 'school':
        return '#10B981' // 学校用绿色
      case 'location':
        return '#F59E0B' // 地点用橙色
      default:
        return '#EF4444' // 人物用红色
    }
  }

  return (
    <div className={`w-full ${isModal ? 'h-[384px]' : 'h-[600px]'} bg-gray-50 rounded-lg relative overflow-hidden`}>
      <svg width={isModal ? "400" : "800"} height={isModal ? "384" : "600"} className="absolute inset-0">
        {/* 绘制连接线 */}
        {links.map((link, index) => {
          const sourcePos = nodePositions.get(link.source)
          const targetPos = nodePositions.get(link.target)
          
          if (!sourcePos || !targetPos) return null
          
          return (
            <g key={index}>
              <line
                x1={sourcePos.x}
                y1={sourcePos.y}
                x2={targetPos.x}
                y2={targetPos.y}
                stroke="#E5E7EB"
                strokeWidth="2"
                className="transition-all duration-300"
              />
              {/* 关系标签 */}
              <text
                x={(sourcePos.x + targetPos.x) / 2}
                y={(sourcePos.y + targetPos.y) / 2 - 8}
                textAnchor="middle"
                className="text-xs fill-gray-500 font-medium"
                style={{ fontSize: '11px' }}
              >
                {link.relationship}
              </text>
            </g>
          )
        })}
        
        {/* 绘制节点 */}
        {nodes.map((node) => {
          const position = nodePositions.get(node.id)
          if (!position) return null
          
          const isCenterNode = node.id === centerNodeId
          const nodeSize = isCenterNode ? 50 : 40
          
          return (
            <g key={node.id}>
              {/* 节点背景圆圈 */}
              <circle
                cx={position.x}
                cy={position.y}
                r={nodeSize / 2}
                fill={getNodeColor(node)}
                className={`transition-opacity duration-200 ${
                  node.type === 'company' || node.type === 'person' 
                    ? 'cursor-pointer hover:opacity-70' 
                    : 'cursor-default'
                }`}
                onClick={() => onNodeClick && onNodeClick(node)}
              />
              
              {/* 节点图标 */}
              <foreignObject
                x={position.x - 8}
                y={position.y - 8}
                width="16"
                height="16"
                className="pointer-events-none"
              >
                <div className="text-white flex items-center justify-center">
                  {getNodeIcon(node.type)}
                </div>
              </foreignObject>
              
              {/* 节点名称 */}
              <text
                x={position.x}
                y={position.y + nodeSize / 2 + 20}
                textAnchor="middle"
                className="text-sm font-medium fill-gray-700"
                style={{ fontSize: isCenterNode ? '14px' : '12px' }}
              >
                {node.type === 'person' 
                  ? (deterministicAliasName(node.name).length > 8 
                      ? deterministicAliasName(node.name).substring(0, 8) + '...' 
                      : deterministicAliasName(node.name))
                  : (node.name.length > 8 ? node.name.substring(0, 8) + '...' : node.name)
                }
              </text>
              
              {/* 中心节点额外信息 */}
              {isCenterNode && node.info?.position && (
                <text
                  x={position.x}
                  y={position.y + nodeSize / 2 + 35}
                  textAnchor="middle"
                  className="text-xs fill-gray-500"
                  style={{ fontSize: '10px' }}
                >
                  {node.info.position}
                </text>
              )}
            </g>
          )
        })}
      </svg>
      
      {/* 图例 */}
      {!isModal && (
        <div className="absolute bottom-4 left-4 bg-white p-3 rounded-lg shadow-sm border">
          <div className="text-xs font-medium text-gray-700 mb-2">图例</div>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
              <span className="text-xs text-gray-600">中心人物</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
              <span className="text-xs text-gray-600">企业</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              <span className="text-xs text-gray-600">学校</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-red-500 rounded-full"></div>
              <span className="text-xs text-gray-600">人物</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
} 