"use client"

import { AlertCircle, AlertTriangle, CheckCircle2, Info } from "lucide-react"

import { useToast } from "@/hooks/use-toast"
import {
  Toast,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
} from "@/components/ui/toast"

/**
 * Status icon per variant (Carbon notification: every status ships with its
 * icon; element-specs §14: "status pair + icon, 5 s, close button"). The
 * neutral `default` toast has no icon — it is a passive confirmation.
 */
const STATUS_ICON = {
  destructive: AlertCircle,
  success: CheckCircle2,
  warning: AlertTriangle,
  info: Info,
} as const

/** Auto-dismiss after ~5 s (Carbon: "short, time-based, auto-dismiss ~5 s"). */
const TOAST_DURATION_MS = 5000

export function Toaster() {
  const { toasts } = useToast()

  return (
    <ToastProvider duration={TOAST_DURATION_MS}>
      {toasts.map(function ({ id, title, description, action, ...props }) {
        const Icon = props.variant ? STATUS_ICON[props.variant as keyof typeof STATUS_ICON] : undefined
        return (
          <Toast key={id} {...props}>
            <div className="flex min-w-0 items-start gap-3">
              {Icon ? <Icon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" /> : null}
              <div className="grid min-w-0 gap-1">
                {title && <ToastTitle>{title}</ToastTitle>}
                {description && (
                  <ToastDescription>{description}</ToastDescription>
                )}
              </div>
            </div>
            {action}
            <ToastClose />
          </Toast>
        )
      })}
      <ToastViewport />
    </ToastProvider>
  )
}
