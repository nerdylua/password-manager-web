"use client"

import * as React from "react"
import * as VisuallyHiddenPrimitive from "@radix-ui/react-visually-hidden"

import { cn } from "@/lib/utils"

const VisuallyHidden = React.forwardRef<
  React.ElementRef<typeof VisuallyHiddenPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof VisuallyHiddenPrimitive.Root>
>(({ className, ...props }, ref) => (
  <VisuallyHiddenPrimitive.Root
    ref={ref}
    className={cn("", className)}
    {...props}
  />
))
VisuallyHidden.displayName = VisuallyHiddenPrimitive.Root.displayName

export { VisuallyHidden } 