"use client"

import { motion } from "framer-motion"
import { ReactNode } from "react"
import { cn } from "@/lib/utils"

interface FloatingCardProps {
  children: ReactNode
  className?: string
  delay?: number
  hover?: boolean
}

export function FloatingCard({ 
  children, 
  className = "", 
  delay = 0,
  hover = true 
}: FloatingCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay }}
      whileHover={hover ? { 
        y: -8, 
        scale: 1.02,
        transition: { duration: 0.2 }
      } : undefined}
      className={cn(
        "relative overflow-hidden rounded-2xl bg-gradient-to-br from-white/80 to-white/40 dark:from-slate-800/80 dark:to-slate-900/40 backdrop-blur-xl border border-white/20 dark:border-slate-700/50 shadow-xl",
        className
      )}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 via-purple-500/5 to-pink-500/5" />
      <div className="relative z-10">
        {children}
      </div>
    </motion.div>
  )
} 