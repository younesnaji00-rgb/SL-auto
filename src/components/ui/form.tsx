"use client"

import * as React from "react"
import * as LabelPrimitive from "@radix-ui/react-label"
import { Slot } from "@radix-ui/react-slot"
import {
  Controller,
  FormProvider,
  useFormContext,
  type ControllerProps,
  type FieldPath,
  type FieldValues,
} from "react-hook-form"

import { AlertCircle } from "lucide-react"

import { cn } from "@/lib/utils"
import { Label } from "@/components/ui/label"

const Form = FormProvider

type FormFieldContextValue<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>
> = {
  name: TName
}

const FormFieldContext = React.createContext<FormFieldContextValue>(
  {} as FormFieldContextValue
)

const FormField = <
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>
>({
  ...props
}: ControllerProps<TFieldValues, TName>) => {
  return (
    <FormFieldContext.Provider value={{ name: props.name }}>
      <Controller {...props} />
    </FormFieldContext.Provider>
  )
}

const useFormField = () => {
  const fieldContext = React.useContext(FormFieldContext)
  const itemContext = React.useContext(FormItemContext)
  const { getFieldState, formState } = useFormContext()

  const fieldState = getFieldState(fieldContext.name, formState)

  if (!fieldContext) {
    throw new Error("useFormField should be used within <FormField>")
  }

  const { id } = itemContext

  return {
    id,
    name: fieldContext.name,
    formItemId: `${id}-form-item`,
    formDescriptionId: `${id}-form-item-description`,
    formMessageId: `${id}-form-item-message`,
    ...fieldState,
  }
}

type FormItemContextValue = {
  id: string
}

const FormItemContext = React.createContext<FormItemContextValue>(
  {} as FormItemContextValue
)

const FormItem = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => {
  const id = React.useId()

  return (
    <FormItemContext.Provider value={{ id }}>
      <div ref={ref} className={cn("space-y-2", className)} {...props} />
    </FormItemContext.Provider>
  )
})
FormItem.displayName = "FormItem"

const FormLabel = React.forwardRef<
  React.ElementRef<typeof LabelPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof LabelPrimitive.Root>
>(({ className, ...props }, ref) => {
  const { error, formItemId } = useFormField()

  return (
    <Label
      ref={ref}
      className={cn(error && "text-destructive", className)}
      htmlFor={formItemId}
      {...props}
    />
  )
})
FormLabel.displayName = "FormLabel"

const FormControl = React.forwardRef<
  React.ElementRef<typeof Slot>,
  React.ComponentPropsWithoutRef<typeof Slot>
>(({ ...props }, ref) => {
  const { error, formItemId, formDescriptionId, formMessageId } = useFormField()

  return (
    <Slot
      ref={ref}
      id={formItemId}
      aria-describedby={
        !error
          ? `${formDescriptionId}`
          : `${formDescriptionId} ${formMessageId}`
      }
      aria-invalid={!!error}
      {...props}
    />
  )
})
FormControl.displayName = "FormControl"

const FormDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => {
  const { formDescriptionId } = useFormField()

  return (
    <p
      ref={ref}
      id={formDescriptionId}
      className={cn("text-sm text-muted-foreground", className)}
      {...props}
    />
  )
})
FormDescription.displayName = "FormDescription"

const FormMessage = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, children, ...props }, ref) => {
  const { error, formMessageId } = useFormField()
  const body = error ? String(error?.message ?? "") : children

  if (!body) {
    return null
  }

  return (
    // Error anatomy (docs/research/mobile-forms-inputs.md §2.6): a 16 px icon
    // + 13 px danger text UNDER the field, while the field itself carries
    // `aria-invalid` and the danger border (FormControl already sets it).
    // Icon AND text — never colour alone (element-specs §11).
    <p
      ref={ref}
      id={formMessageId}
      className={cn(
        "flex items-start gap-1.5 text-[13px] font-medium leading-snug text-status-danger-fg",
        className
      )}
      {...props}
    >
      <AlertCircle aria-hidden className="mt-px h-4 w-4 shrink-0" />
      <span className="min-w-0">{body}</span>
    </p>
  )
})
FormMessage.displayName = "FormMessage"

/* ------------------------------------------------------------------ */
/* Validation timing + error summary (research §2.6)                   */
/* ------------------------------------------------------------------ */

/**
 * The timing rule, resolved from four contradicting sources in
 * docs/research/mobile-forms-inputs.md §2.6 / §3.3:
 *
 *   • required-empty errors appear on SUBMIT only (UX Movement: keystroke
 *     validation "forces users to switch from completion to revision mode";
 *     Vitaly Friedman: "Show errors for empty fields only on submit"),
 *   • fixed-FORMAT fields (téléphone, email, date, plaque) additionally
 *     validate on BLUR once the value is long enough to judge — Baymard's own
 *     carve-out ("after reaching correct character length"), which is why
 *     `format: true` exists on a rule,
 *   • after a FAILED submit, a field that is showing an error re-validates on
 *     every keystroke and clears the moment it passes (Baymard: errors "live
 *     update on a keystroke level, disappearing the moment users enter a
 *     valid input"),
 *   • the primary is NEVER disabled (Smashing: "Keep buttons enabled.
 *     Validate on submission. Display errors afterward.").
 */
export interface FieldRule<V> {
  /** DOM id of the control, so the summary can move focus to it. */
  id: string
  /** Human name used in the summary link. */
  label: string
  /** Return an error message, or null when the value passes. */
  validate: (values: V) => string | null
  /**
   * True for fixed-format fields: they also validate on blur, once
   * `plausible` says the value is long enough to be judged.
   */
  format?: boolean
  /** Defaults to "not empty" — i.e. blur-validate as soon as something is typed. */
  plausible?: (values: V) => boolean
}

export interface FormErrorsApi<V> {
  /** Current messages, keyed by rule id. */
  errors: Record<string, string>
  /** Props to spread on the control: `aria-invalid` + the blur validation. */
  fieldProps: (id: string) => { "aria-invalid"?: true; onBlur: () => void }
  /** Run every rule, mark the form as submitted, return true when clean. */
  validateAll: () => boolean
  /** Clear everything (dialog closed / form reset). */
  reset: () => void
  /** Rules that currently fail, in declaration order — feed the summary. */
  summary: { id: string; label: string; message: string }[]
}

export function useFormErrors<V>(values: V, rules: FieldRule<V>[]): FormErrorsApi<V> {
  const [errors, setErrors] = React.useState<Record<string, string>>({})
  const [submitted, setSubmitted] = React.useState(false)
  const rulesRef = React.useRef(rules)
  rulesRef.current = rules
  const valuesRef = React.useRef(values)
  valuesRef.current = values

  // After a failed submit, every erroring field re-validates per keystroke and
  // clears as soon as it passes. Before that, typing never raises an error.
  React.useEffect(() => {
    if (!submitted) return
    setErrors((prev) => {
      let changed = false
      const next: Record<string, string> = {}
      for (const rule of rulesRef.current) {
        const msg = rule.validate(values)
        if (msg) next[rule.id] = msg
        if (prev[rule.id] !== (msg ?? undefined)) changed = true
      }
      return changed ? next : prev
    })
  }, [values, submitted])

  const fieldProps = React.useCallback(
    (id: string) => ({
      ...(errors[id] ? ({ "aria-invalid": true } as const) : {}),
      onBlur: () => {
        const rule = rulesRef.current.find((r) => r.id === id)
        if (!rule?.format) return
        const ok = rule.plausible ? rule.plausible(valuesRef.current) : true
        if (!ok) return
        const msg = rule.validate(valuesRef.current)
        setErrors((prev) => {
          if (msg === (prev[id] ?? null)) return prev
          const next = { ...prev }
          if (msg) next[id] = msg
          else delete next[id]
          return next
        })
      },
    }),
    [errors]
  )

  const validateAll = React.useCallback(() => {
    const next: Record<string, string> = {}
    for (const rule of rulesRef.current) {
      const msg = rule.validate(valuesRef.current)
      if (msg) next[rule.id] = msg
    }
    setErrors(next)
    setSubmitted(true)
    return Object.keys(next).length === 0
  }, [])

  const reset = React.useCallback(() => {
    setErrors({})
    setSubmitted(false)
  }, [])

  const summary = rules
    .filter((r) => errors[r.id])
    .map((r) => ({ id: r.id, label: r.label, message: errors[r.id] }))

  return { errors, fieldProps, validateAll, reset, summary }
}

/**
 * FormErrorSummary — the callout at the top of a sheet / dialog body.
 *
 * GOV.UK error summary: "Always show an error summary when there is a
 * validation error, even if there's only one"; "move keyboard focus to the
 * error summary"; the summary link wording matches the inline message.
 * NN/g adds that a summary "shouldn't be the only indication" — hence the
 * inline message under each field as well.
 */
export function FormErrorSummary({
  errors,
  className,
  title,
}: {
  errors: { id: string; label: string; message: string }[]
  className?: string
  title?: string
}) {
  const ref = React.useRef<HTMLDivElement>(null)
  const count = errors.length

  React.useEffect(() => {
    if (count > 0) ref.current?.focus()
  }, [count])

  if (count === 0) return null

  return (
    <div
      ref={ref}
      role="alert"
      tabIndex={-1}
      className={cn(
        "rounded-md border border-status-danger-fg/30 bg-status-danger-bg p-3 text-status-danger-fg outline-none",
        className
      )}
    >
      <p className="flex items-center gap-2 text-[15px] font-semibold">
        <AlertCircle aria-hidden className="h-4 w-4 shrink-0" />
        {title ?? (count > 1 ? `${count} champs à corriger` : "1 champ à corriger")}
      </p>
      <ul className="mt-1.5 space-y-1">
        {errors.map((e) => (
          <li key={e.id}>
            <a
              href={`#${e.id}`}
              onClick={(ev) => {
                ev.preventDefault()
                const el = document.getElementById(e.id)
                if (!el) return
                // Scroll offset by the sticky header before focusing, or the
                // field lands under the 56 px bar.
                el.scrollIntoView({ block: "center", behavior: "smooth" })
                el.focus({ preventScroll: true })
              }}
              className="inline-flex min-h-11 items-center text-[14px] underline underline-offset-4 md:min-h-0"
            >
              {e.label} — {e.message}
            </a>
          </li>
        ))}
      </ul>
    </div>
  )
}

export {
  useFormField,
  Form,
  FormItem,
  FormLabel,
  FormControl,
  FormDescription,
  FormMessage,
  FormField,
}
