"use client"

/**
 * Select — Radix popover on a mouse, `PhoneSelect` on a coarse pointer.
 *
 * The API is untouched: `<Select><SelectTrigger><SelectValue/></SelectTrigger>
 * <SelectContent><SelectItem/>…</SelectContent></Select>` behaves exactly as
 * before at every call site. What changes is what it RENDERS when the primary
 * pointer is touch — `phone-select.tsx` has the anatomy and the sources; the
 * short version (docs/research/mobile-forms-inputs.md §2.2) is that a popover
 * anchored to a trigger the keyboard has pushed off-screen is the single worst
 * control on a phone, so the content becomes a segmented control (2–5), a
 * bottom-sheet list (6–12), a sheet with a search field (> 12), or the native
 * `<select>` when we are already inside a sheet (never sheet-on-sheet).
 *
 * How the swap works without touching call sites: `Select` walks its own JSX
 * children, finds the `SelectTrigger` (for its id / className / `data-tour` /
 * `aria-label`, and the placeholder on the `SelectValue` inside it) and the
 * `SelectItem`s under `SelectContent`, and hands them to `PhoneSelect`. The
 * walk is recursive so `{list.map(…)}`, fragments and conditionals all work.
 * If it finds no items it renders Radix unchanged — the adapter can only ever
 * improve a select, never break one.
 *
 * Escape hatch (additive, no existing call site passes it): `phoneTier` forces
 * one shape — `'sheet'` for a set whose labels would not fit segments,
 * `'native'` inside a control that is already a sheet, `'off'` to keep Radix.
 */

import * as React from "react"
import * as SelectPrimitive from "@radix-ui/react-select"
import { Check, ChevronDown, ChevronUp } from "lucide-react"

import { cn } from "@/lib/utils"
import { useIsCoarsePointer } from "@/hooks/use-viewport-class"
import { useInBottomSheet } from "@/components/ui/bottom-sheet"
import {
  PhoneSelect,
  phoneSelectTier,
  type PhoneSelectOption,
  type PhoneSelectTier,
} from "@/components/ui/phone-select"

const SelectGroup = SelectPrimitive.Group

const SelectValue = SelectPrimitive.Value

const SelectTrigger = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Trigger>
>(({ className, children, ...props }, ref) => (
  <SelectPrimitive.Trigger
    ref={ref}
    className={cn(
      // Field, not button (element-specs §9): solid `bg-card`, hairline
      // `input` border, no rim — identical to Input / Textarea. 40 px on a
      // mouse, 48 px on a phone (density §7), like every other control.
      "flex h-10 max-md:h-12 w-full items-center justify-between rounded-md border border-input bg-card px-3 py-2 text-base text-ink md:text-sm ring-offset-background placeholder:text-ink-3 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 [&>span]:line-clamp-1",
      className
    )}
    {...props}
  >
    {children}
    <SelectPrimitive.Icon asChild>
      <ChevronDown className="h-4 w-4 text-ink-3" />
    </SelectPrimitive.Icon>
  </SelectPrimitive.Trigger>
))
SelectTrigger.displayName = SelectPrimitive.Trigger.displayName

const SelectScrollUpButton = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.ScrollUpButton>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.ScrollUpButton>
>(({ className, ...props }, ref) => (
  <SelectPrimitive.ScrollUpButton
    ref={ref}
    className={cn(
      "flex cursor-default items-center justify-center py-1",
      className
    )}
    {...props}
  >
    <ChevronUp className="h-4 w-4" />
  </SelectPrimitive.ScrollUpButton>
))
SelectScrollUpButton.displayName = SelectPrimitive.ScrollUpButton.displayName

const SelectScrollDownButton = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.ScrollDownButton>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.ScrollDownButton>
>(({ className, ...props }, ref) => (
  <SelectPrimitive.ScrollDownButton
    ref={ref}
    className={cn(
      "flex cursor-default items-center justify-center py-1",
      className
    )}
    {...props}
  >
    <ChevronDown className="h-4 w-4" />
  </SelectPrimitive.ScrollDownButton>
))
SelectScrollDownButton.displayName =
  SelectPrimitive.ScrollDownButton.displayName

const SelectContent = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Content>
>(({ className, children, position = "popper", ...props }, ref) => (
  <SelectPrimitive.Portal>
    <SelectPrimitive.Content
      ref={ref}
      className={cn(
        // Grows FROM its trigger (origin-aware, motion-spec §6): enter 150ms
        // decelerate, exit 100ms fade-only.
        "relative z-50 max-h-96 min-w-[8rem] glass-strong overflow-hidden rounded-md text-popover-foreground origin-[--radix-select-content-transform-origin] duration-150 ease-enter data-[state=closed]:duration-100 data-[state=closed]:ease-exit data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 motion-reduce:animate-none",
        position === "popper" &&
          "data-[side=bottom]:translate-y-1 data-[side=left]:-translate-x-1 data-[side=right]:translate-x-1 data-[side=top]:-translate-y-1",
        className
      )}
      position={position}
      {...props}
    >
      <SelectScrollUpButton />
      <SelectPrimitive.Viewport
        className={cn(
          "p-1",
          position === "popper" &&
            "h-[var(--radix-select-trigger-height)] w-full min-w-[var(--radix-select-trigger-width)]"
        )}
      >
        {children}
      </SelectPrimitive.Viewport>
      <SelectScrollDownButton />
    </SelectPrimitive.Content>
  </SelectPrimitive.Portal>
))
SelectContent.displayName = SelectPrimitive.Content.displayName

const SelectLabel = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Label>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Label>
>(({ className, ...props }, ref) => (
  <SelectPrimitive.Label
    ref={ref}
    className={cn("t-label py-1.5 pl-8 pr-2", className)}
    {...props}
  />
))
SelectLabel.displayName = SelectPrimitive.Label.displayName

const SelectItem = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Item>
>(({ className, children, ...props }, ref) => (
  <SelectPrimitive.Item
    ref={ref}
    className={cn(
      "relative flex w-full cursor-default select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
      className
    )}
    {...props}
  >
    <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
      <SelectPrimitive.ItemIndicator>
        <Check className="h-4 w-4" />
      </SelectPrimitive.ItemIndicator>
    </span>

    <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
  </SelectPrimitive.Item>
))
SelectItem.displayName = SelectPrimitive.Item.displayName

const SelectSeparator = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Separator>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Separator>
>(({ className, ...props }, ref) => (
  <SelectPrimitive.Separator
    ref={ref}
    className={cn("-mx-1 my-1 h-px bg-hairline", className)}
    {...props}
  />
))
SelectSeparator.displayName = SelectPrimitive.Separator.displayName

/* ------------------------------------------------------------------ */
/* Touch adapter                                                       */
/* ------------------------------------------------------------------ */

/** Flatten a label node to plain text (native `<option>`, search, a11y). */
function nodeText(node: React.ReactNode): string {
  if (node === null || node === undefined || typeof node === "boolean") return ""
  if (typeof node === "string" || typeof node === "number") return String(node)
  if (Array.isArray(node)) return node.map(nodeText).join(" ")
  if (React.isValidElement(node)) return nodeText((node.props as { children?: React.ReactNode }).children)
  return ""
}

/** Depth-first walk collecting every `SelectItem` under a subtree. */
function collectItems(node: React.ReactNode, out: PhoneSelectOption[]): void {
  React.Children.forEach(node, (child) => {
    if (!React.isValidElement(child)) return
    const props = child.props as {
      value?: string
      disabled?: boolean
      children?: React.ReactNode
    }
    if (child.type === SelectItem) {
      if (typeof props.value === "string") {
        out.push({
          value: props.value,
          label: props.children,
          labelText: nodeText(props.children).replace(/\s+/g, " ").trim(),
          disabled: props.disabled,
        })
      }
      return
    }
    if (props.children) collectItems(props.children, out)
  })
}

type AnyProps = Record<string, unknown> & { children?: React.ReactNode }

/** Find the first descendant of `type` (trigger, content, value). */
function findChild(node: React.ReactNode, type: unknown): React.ReactElement<AnyProps> | null {
  let found: React.ReactElement<AnyProps> | null = null
  React.Children.forEach(node, (child) => {
    if (found !== null || !React.isValidElement(child)) return
    if (child.type === type) {
      found = child as React.ReactElement<AnyProps>
      return
    }
    const nested = (child.props as AnyProps).children
    if (nested) found = findChild(nested, type)
  })
  return found
}

export type SelectPhoneTier = PhoneSelectTier | "off"

export interface SelectProps extends React.ComponentPropsWithoutRef<typeof SelectPrimitive.Root> {
  /**
   * Force the touch shape instead of deriving it from the option count.
   * `'off'` keeps the Radix popover everywhere (a select that is itself the
   * chrome of a picker, e.g. a month jump inside a calendar).
   */
  phoneTier?: SelectPhoneTier
  /** Rendered under the option list in the sheet tiers. */
  phoneSheetFooter?: React.ReactNode
}

function Select({ phoneTier, phoneSheetFooter, children, ...props }: SelectProps) {
  const coarse = useIsCoarsePointer()
  const insideSheet = useInBottomSheet()
  // Uncontrolled call sites (`defaultValue` only) keep working on touch.
  const [uncontrolled, setUncontrolled] = React.useState<string | undefined>(props.defaultValue)

  const options = React.useMemo(() => {
    if (!coarse || phoneTier === "off") return []
    const content = findChild(children, SelectContent)
    const out: PhoneSelectOption[] = []
    collectItems(content ? (content.props as { children?: React.ReactNode }).children : children, out)
    return out
  }, [coarse, phoneTier, children])

  if (!coarse || phoneTier === "off" || options.length === 0) {
    return <SelectPrimitive.Root {...props}>{children}</SelectPrimitive.Root>
  }

  const trigger = findChild(children, SelectTrigger)
  const triggerProps = trigger
    ? (() => {
        const { children: _ignored, ...rest } = trigger.props
        return rest as React.ButtonHTMLAttributes<HTMLButtonElement> & Record<string, unknown>
      })()
    : {}
  const valueEl = trigger ? findChild(trigger.props.children, SelectValue) : null
  const placeholder = valueEl ? nodeText(valueEl.props.placeholder as React.ReactNode) : undefined

  // The sheet title / recents key: the field's own name, in this order —
  // an explicit `aria-label`, the placeholder, then a neutral fallback.
  const label =
    (typeof triggerProps["aria-label"] === "string" && triggerProps["aria-label"]) ||
    placeholder ||
    "Choisir"

  const value = props.value !== undefined ? props.value : uncontrolled
  // `phoneTier === 'off'` already returned above, so anything left is a tier.
  const tier: PhoneSelectTier = phoneTier ?? phoneSelectTier(options, { insideSheet })

  return (
    <PhoneSelect
      options={options}
      value={value}
      onValueChange={(v) => {
        if (props.value === undefined) setUncontrolled(v)
        props.onValueChange?.(v)
      }}
      placeholder={placeholder}
      label={label}
      disabled={props.disabled}
      tier={tier}
      triggerProps={triggerProps}
      sheetFooter={phoneSheetFooter}
    />
  )
}
Select.displayName = "Select"

export {
  Select,
  SelectGroup,
  SelectValue,
  SelectTrigger,
  SelectContent,
  SelectLabel,
  SelectItem,
  SelectSeparator,
  SelectScrollUpButton,
  SelectScrollDownButton,
}
