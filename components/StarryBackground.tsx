'use client'

import React, { useEffect, useRef } from 'react'

export default function StarryBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let w = canvas.width = window.innerWidth
    let h = canvas.height = window.innerHeight
    const hue = 217
    const stars: any[] = []
    let count = 0
    const maxStars = 1500 // 减少星星数量以提高性能

    // 创建缓存画布
    const canvas2 = document.createElement('canvas')
    const ctx2 = canvas2.getContext('2d')
    if (!ctx2) return

    canvas2.width = 100
    canvas2.height = 100
    const half = canvas2.width / 2
    const gradient2 = ctx2.createRadialGradient(half, half, 0, half, half, half)
    gradient2.addColorStop(0.025, '#CCC')
    gradient2.addColorStop(0.1, `hsl(${hue}, 61%, 33%)`)
    gradient2.addColorStop(0.25, `hsl(${hue}, 64%, 6%)`)
    gradient2.addColorStop(1, 'transparent')
    ctx2.fillStyle = gradient2
    ctx2.beginPath()
    ctx2.arc(half, half, half, 0, Math.PI * 2)
    ctx2.fill()

    // 工具函数
    function random(min: number, max?: number) {
      if (typeof max === 'undefined') {
        max = min
        min = 0
      }
      if (min > max) {
        const hold = max
        max = min
        min = hold
      }
      return Math.floor(Math.random() * (max - min + 1)) + min
    }

    function maxOrbit(x: number, y: number) {
      const max = Math.max(x, y)
      const diameter = Math.round(Math.sqrt(max * max + max * max))
      return diameter / 2
    }

    // 星星类
    class Star {
      orbitRadius: number
      radius: number
      orbitX: number
      orbitY: number
      timePassed: number
      speed: number
      alpha: number

      constructor() {
        this.orbitRadius = random(maxOrbit(w, h))
        this.radius = random(60, this.orbitRadius) / 8
        this.orbitX = w / 2
        this.orbitY = h / 2
        this.timePassed = random(0, maxStars)
        this.speed = random(this.orbitRadius) / 150000 // 将速度减慢3倍（从50000改为150000）
        this.alpha = random(2, 10) / 10
        count++
        stars[count] = this
      }

      draw() {
        if (!ctx) return // 确保ctx存在
        
        const x = Math.sin(this.timePassed) * this.orbitRadius + this.orbitX
        const y = Math.cos(this.timePassed) * this.orbitRadius + this.orbitY
        const twinkle = random(10)

        if (twinkle === 1 && this.alpha > 0) {
          this.alpha -= 0.05
        } else if (twinkle === 2 && this.alpha < 1) {
          this.alpha += 0.05
        }

        ctx.globalAlpha = this.alpha
        ctx.drawImage(canvas2, x - this.radius / 2, y - this.radius / 2, this.radius, this.radius)
        this.timePassed += this.speed
      }
    }

    // 创建星星
    for (let i = 0; i < maxStars; i++) {
      new Star()
    }

    // 动画函数
    function animation() {
      if (!ctx) return // 确保ctx存在
      
      ctx.globalCompositeOperation = 'source-over'
      ctx.globalAlpha = 0.5
      ctx.fillStyle = `hsla(${hue}, 64%, 6%, 2)`
      ctx.fillRect(0, 0, w, h)
      ctx.globalCompositeOperation = 'lighter'
      
      for (let i = 1, l = stars.length; i < l; i++) {
        if (stars[i]) {
          stars[i].draw()
        }
      }
      
      requestAnimationFrame(animation)
    }

    // 处理窗口大小变化
    const handleResize = () => {
      w = canvas.width = window.innerWidth
      h = canvas.height = window.innerHeight
      
      // 更新所有星星的轨道中心
      stars.forEach(star => {
        if (star) {
          star.orbitX = w / 2
          star.orbitY = h / 2
        }
      })
    }

    window.addEventListener('resize', handleResize)
    animation()

    // 清理函数
    return () => {
      window.removeEventListener('resize', handleResize)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 z-0"
      style={{ background: 'black' }}
    />
  )
} 