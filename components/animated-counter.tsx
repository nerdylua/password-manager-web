"use client"

import { useInView, useMotionValue, useSpring } from "framer-motion"
import { useEffect, useRef } from "react"

interface AnimatedCounterProps {
  value: number
  duration?: number
  suffix?: string
  prefix?: string
  className?: string
}

export function AnimatedCounter({ 
  value, 
  duration = 1.5,
  suffix = "", 
  prefix = "",
  className = ""
}: AnimatedCounterProps) {
  const ref = useRef<HTMLSpanElement>(null)
  const motionValue = useMotionValue(0)
  const springValue = useSpring(motionValue, { 
    duration: duration * 1000,
    bounce: 0.1
  })
  const isInView = useInView(ref, { 
    once: true, 
    margin: "-50px"
  })

  // Set initial value immediately to handle zero case
  useEffect(() => {
    if (ref.current && !isInView) {
      ref.current.textContent = `${prefix}0${suffix}`
    }
  }, [prefix, suffix, isInView])

  useEffect(() => {
    if (isInView) {
      motionValue.set(value)
    }
  }, [motionValue, isInView, value])

  useEffect(() => {
    const unsubscribe = springValue.on("change", (latest) => {
      if (ref.current) {
        const displayValue = Math.floor(Math.max(0, latest)) // Ensure non-negative
        ref.current.textContent = `${prefix}${displayValue.toLocaleString()}${suffix}`
      }
    })

    return () => unsubscribe()
  }, [springValue, prefix, suffix])

  // Fallback: ensure value is always displayed even if animation fails
  useEffect(() => {
    const timer = setTimeout(() => {
      if (ref.current && (!ref.current.textContent || ref.current.textContent === `${prefix}0${suffix}`)) {
        ref.current.textContent = `${prefix}${value.toLocaleString()}${suffix}`
      }
    }, 50)

    return () => clearTimeout(timer)
  }, [value, prefix, suffix])

  return <span ref={ref} className={className} />
} 