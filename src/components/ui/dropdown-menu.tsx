"use client"

/**
 * DropdownMenu — a popover on a fine pointer, a `BottomSheet` of 52 px rows on
 * a coarse one (research docs/research/mobile-overlays-feedback.md §3).
 *
 * Every primitive below branches on `useResponsiveMenu()?.coarse`; the touch
 * pieces live in `responsive-menu.tsx`. Call sites are untouched — `align`,
 * `side`, `sideOffset` and the popover `className` are ignored on touch,
 * `asChild` triggers and items keep working through Radix's `Slot`, `onSelect`
 * keeps its `preventDefault()` semantics (the "Colonnes" / density menus rely
 * on it), and submenus are FLATTENED inline (no cascading on touch — NN/g).
 *
 * Verified against: `layout/user-menu.tsx` (asChild avatar trigger, label +
 * separators + destructive item), `dossiers/client-page.tsx` (align="end"
 * w-64 with a RadioGroup, checkbox items and `onSelect` preventDefault, plus
 * the per-row ⋯ menu with a destructive item), `dossiers/record-bar.tsx`
 * (align="end" w-60, `data-tour` anchors), `layout/sidebar.tsx`
 * (side="top" align="start", `data-tour="nav-aide"`, `asChild` link items).
 */

import * as React from "react"
import * as DropdownMenuPrimitive from "@radix-ui/react-dropdown-menu"
import { Slot } from "@radix-ui/react-slot"
import { Check, ChevronRight, Circle } from "lucide-react"

import { cn } from "@/lib/utils"
import {
  fireMenuSelect,
  MENU_LABEL,
  MENU_ROW,
  MENU_SEPARATOR,
  MenuRadioProvider,
  menuRowKeyDown,
  MenuSheet,
  ResponsiveMenu,
  useMenuRadio,
  useMenuSheet,
  useResponsiveMenu,
} from "@/components/ui/responsive-menu"

/** Root: keeps its own open state so a phone can drive the sheet. */
const DropdownMenu = ResponsiveMenu

const DropdownMenuPortal = ({
  children,
  ...props
}: React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Portal>) => {
  const menu = useResponsiveMenu()
  if (menu?.coarse) return <>{children}</>
  return <DropdownMenuPrimitive.Portal {...props}>{children}</DropdownMenuPrimitive.Portal>
}

const DropdownMenuGroup = React.forwardRef<
  HTMLDivElement,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Group>
>(({ children, ...props }, ref) => {
  const menu = useResponsiveMenu()
  if (menu?.coarse) {
    return (
      <div ref={ref} role="group" {...props}>
        {children}
      </div>
    )
  }
  return (
    <DropdownMenuPrimitive.Group ref={ref} {...props}>
      {children}
    </DropdownMenuPrimitive.Group>
  )
})
DropdownMenuGroup.displayName = DropdownMenuPrimitive.Group.displayName

/** Submenus are flattened on touch: the sub content renders inline. */
const DropdownMenuSub = ({
  children,
  ...props
}: React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Sub>) => {
  const menu = useResponsiveMenu()
  if (menu?.coarse) return <>{children}</>
  return <DropdownMenuPrimitive.Sub {...props}>{children}</DropdownMenuPrimitive.Sub>
}

const DropdownMenuTrigger = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Trigger>
>(({ asChild, onClick, children, ...props }, ref) => {
  const menu = useResponsiveMenu()
  if (!menu?.coarse) {
    return (
      <DropdownMenuPrimitive.Trigger ref={ref} asChild={asChild} onClick={onClick} {...props}>
        {children}
      </DropdownMenuPrimitive.Trigger>
    )
  }
  const Comp = asChild ? Slot : "button"
  return (
    <Comp
      ref={ref as React.Ref<HTMLButtonElement>}
      {...(asChild ? {} : { type: "button" as const })}
      aria-haspopup="dialog"
      aria-expanded={menu.open}
      onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
        onClick?.(e)
        if (e.defaultPrevented) return
        menu.setOpen(true)
      }}
      {...props}
    >
      {children}
    </Comp>
  )
})
DropdownMenuTrigger.displayName = DropdownMenuPrimitive.Trigger.displayName

const DropdownMenuSubTrigger = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.SubTrigger>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.SubTrigger> & {
    inset?: boolean
  }
>(({ className, inset, children, ...props }, ref) => {
  const menu = useResponsiveMenu()
  if (menu?.coarse) {
    // Flattened: the sub-trigger becomes the section label of its own rows.
    return <div className={cn(MENU_LABEL, className)}>{children}</div>
  }
  return (
    <DropdownMenuPrimitive.SubTrigger
      ref={ref}
      className={cn(
        "flex cursor-default gap-2 select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none focus:bg-accent data-[state=open]:bg-accent [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
        inset && "pl-8",
        className
      )}
      {...props}
    >
      {children}
      <ChevronRight className="ml-auto" />
    </DropdownMenuPrimitive.SubTrigger>
  )
})
DropdownMenuSubTrigger.displayName =
  DropdownMenuPrimitive.SubTrigger.displayName

const DropdownMenuSubContent = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.SubContent>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.SubContent>
>(({ className, children, ...props }, ref) => {
  const menu = useResponsiveMenu()
  if (menu?.coarse) return <>{children}</>
  return (
    <DropdownMenuPrimitive.SubContent
      ref={ref}
      className={cn(
        "z-50 min-w-[8rem] glass-strong overflow-hidden rounded-md p-1 text-popover-foreground origin-[--radix-dropdown-menu-content-transform-origin] duration-150 ease-enter data-[state=closed]:duration-100 data-[state=closed]:ease-exit data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 motion-reduce:animate-none",
        className
      )}
      {...props}
    >
      {children}
    </DropdownMenuPrimitive.SubContent>
  )
})
DropdownMenuSubContent.displayName =
  DropdownMenuPrimitive.SubContent.displayName

export interface DropdownMenuContentProps
  extends React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Content> {
  /** Sheet header on touch. Defaults to « Actions ». */
  sheetTitle?: React.ReactNode
  /** Long pickers open at 92 dvh instead of 60. */
  sheetDetent?: "default" | "tall"
}

const DropdownMenuContent = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.Content>,
  DropdownMenuContentProps
>(({ className, sideOffset = 4, sheetTitle, sheetDetent, children, ...props }, ref) => {
  const menu = useResponsiveMenu()
  if (menu?.coarse) {
    // Carry `data-*` (notably `data-tour`) onto a wrapper inside the sheet so
    // the guided tutorial still finds its anchor on touch.
    const dataProps = Object.fromEntries(
      Object.entries(props as Record<string, unknown>).filter(([k]) => k.startsWith("data-"))
    )
    return (
      <MenuSheet open={menu.open} onOpenChange={menu.setOpen} title={sheetTitle} detent={sheetDetent}>
        <div {...dataProps}>{children}</div>
      </MenuSheet>
    )
  }
  return (
    <DropdownMenuPrimitive.Portal>
      <DropdownMenuPrimitive.Content
        ref={ref}
        sideOffset={sideOffset}
        className={cn(
          // Grows FROM its trigger (origin-aware, motion-spec §6): enter 150ms
          // decelerate, exit 100ms fade-only.
          "z-50 min-w-[8rem] glass-strong overflow-hidden rounded-md p-1 text-popover-foreground origin-[--radix-dropdown-menu-content-transform-origin] duration-150 ease-enter data-[state=closed]:duration-100 data-[state=closed]:ease-exit data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 motion-reduce:animate-none",
          className
        )}
        {...props}
      >
        {children}
      </DropdownMenuPrimitive.Content>
    </DropdownMenuPrimitive.Portal>
  )
})
DropdownMenuContent.displayName = DropdownMenuPrimitive.Content.displayName

const DropdownMenuItem = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Item> & {
    inset?: boolean
  }
>(({ className, inset, asChild, onSelect, onClick, disabled, children, ...props }, ref) => {
  const menu = useResponsiveMenu()
  const sheet = useMenuSheet()
  if (menu?.coarse) {
    const Comp = asChild ? Slot : "div"
    const activate = () => {
      if (disabled) return
      // The select handler and the sheet close land in ONE React commit, so
      // the sheet's exit and whatever the action opens start together (Apple:
      // dismiss before presenting). `preventDefault()` in `onSelect` keeps the
      // sheet open, exactly as it keeps a Radix menu open.
      if (!fireMenuSelect(onSelect)) sheet?.close()
    }
    return (
      <Comp
        ref={ref}
        role="menuitem"
        tabIndex={disabled ? -1 : 0}
        aria-disabled={disabled || undefined}
        data-disabled={disabled ? "" : undefined}
        className={cn(MENU_ROW, className)}
        onClick={(e: React.MouseEvent<HTMLDivElement>) => {
          if (disabled) return
          onClick?.(e)
          activate()
        }}
        onKeyDown={menuRowKeyDown(activate)}
        {...props}
      >
        {children}
      </Comp>
    )
  }
  return (
    <DropdownMenuPrimitive.Item
      ref={ref}
      asChild={asChild}
      onSelect={onSelect}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "relative flex cursor-default select-none items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none transition-colors focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
        inset && "pl-8",
        className
      )}
      {...props}
    >
      {children}
    </DropdownMenuPrimitive.Item>
  )
})
DropdownMenuItem.displayName = DropdownMenuPrimitive.Item.displayName

const DropdownMenuCheckboxItem = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.CheckboxItem>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.CheckboxItem>
>(({ className, children, checked, onCheckedChange, onSelect, disabled, ...props }, ref) => {
  const menu = useResponsiveMenu()
  const sheet = useMenuSheet()
  if (menu?.coarse) {
    const activate = () => {
      if (disabled) return
      onCheckedChange?.(!checked)
      if (!fireMenuSelect(onSelect)) sheet?.close()
    }
    return (
      <div
        ref={ref}
        role="menuitemcheckbox"
        tabIndex={disabled ? -1 : 0}
        aria-checked={checked === "indeterminate" ? "mixed" : !!checked}
        aria-disabled={disabled || undefined}
        data-disabled={disabled ? "" : undefined}
        className={cn(MENU_ROW, className)}
        onClick={activate}
        onKeyDown={menuRowKeyDown(activate)}
        {...props}
      >
        <span className="min-w-0 flex-1 truncate">{children}</span>
        {checked ? <Check className="h-5 w-5 shrink-0 text-ink-2" /> : null}
      </div>
    )
  }
  return (
    <DropdownMenuPrimitive.CheckboxItem
      ref={ref}
      className={cn(
        "relative flex cursor-default select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none transition-colors focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
        className
      )}
      checked={checked}
      onCheckedChange={onCheckedChange}
      onSelect={onSelect}
      disabled={disabled}
      {...props}
    >
      <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
        <DropdownMenuPrimitive.ItemIndicator>
          <Check className="h-4 w-4" />
        </DropdownMenuPrimitive.ItemIndicator>
      </span>
      {children}
    </DropdownMenuPrimitive.CheckboxItem>
  )
})
DropdownMenuCheckboxItem.displayName =
  DropdownMenuPrimitive.CheckboxItem.displayName

const DropdownMenuRadioGroup = React.forwardRef<
  HTMLDivElement,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.RadioGroup>
>(({ value, onValueChange, children, ...props }, ref) => {
  const menu = useResponsiveMenu()
  const radio = React.useMemo(() => ({ value, onValueChange }), [value, onValueChange])
  if (menu?.coarse) {
    return (
      <MenuRadioProvider value={radio}>
        <div ref={ref} role="radiogroup" {...props}>
          {children}
        </div>
      </MenuRadioProvider>
    )
  }
  return (
    <DropdownMenuPrimitive.RadioGroup ref={ref} value={value} onValueChange={onValueChange} {...props}>
      {children}
    </DropdownMenuPrimitive.RadioGroup>
  )
})
DropdownMenuRadioGroup.displayName = DropdownMenuPrimitive.RadioGroup.displayName

const DropdownMenuRadioItem = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.RadioItem>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.RadioItem>
>(({ className, children, value, onSelect, disabled, ...props }, ref) => {
  const menu = useResponsiveMenu()
  const radio = useMenuRadio()
  const sheet = useMenuSheet()
  if (menu?.coarse) {
    const checked = radio?.value === value
    const activate = () => {
      if (disabled) return
      radio?.onValueChange?.(value)
      if (!fireMenuSelect(onSelect)) sheet?.close()
    }
    return (
      <div
        ref={ref}
        role="menuitemradio"
        tabIndex={disabled ? -1 : 0}
        aria-checked={checked}
        aria-disabled={disabled || undefined}
        data-disabled={disabled ? "" : undefined}
        className={cn(MENU_ROW, className)}
        onClick={activate}
        onKeyDown={menuRowKeyDown(activate)}
        {...props}
      >
        <span className="min-w-0 flex-1 truncate">{children}</span>
        {checked ? <Check className="h-5 w-5 shrink-0 text-ink-2" /> : null}
      </div>
    )
  }
  return (
    <DropdownMenuPrimitive.RadioItem
      ref={ref}
      value={value}
      onSelect={onSelect}
      disabled={disabled}
      className={cn(
        "relative flex cursor-default select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none transition-colors focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
        className
      )}
      {...props}
    >
      <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
        <DropdownMenuPrimitive.ItemIndicator>
          <Circle className="h-2 w-2 fill-current" />
        </DropdownMenuPrimitive.ItemIndicator>
      </span>
      {children}
    </DropdownMenuPrimitive.RadioItem>
  )
})
DropdownMenuRadioItem.displayName = DropdownMenuPrimitive.RadioItem.displayName

const DropdownMenuLabel = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.Label>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Label> & {
    inset?: boolean
  }
>(({ className, inset, children, ...props }, ref) => {
  const menu = useResponsiveMenu()
  if (menu?.coarse) {
    return (
      <div ref={ref} className={cn(MENU_LABEL, className)} {...props}>
        {children}
      </div>
    )
  }
  return (
    <DropdownMenuPrimitive.Label
      ref={ref}
      className={cn(
        "px-2 py-1.5 text-sm font-semibold",
        inset && "pl-8",
        className
      )}
      {...props}
    >
      {children}
    </DropdownMenuPrimitive.Label>
  )
})
DropdownMenuLabel.displayName = DropdownMenuPrimitive.Label.displayName

const DropdownMenuSeparator = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.Separator>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Separator>
>(({ className, ...props }, ref) => {
  const menu = useResponsiveMenu()
  if (menu?.coarse) {
    return <div ref={ref} role="separator" className={cn(MENU_SEPARATOR, className)} {...props} />
  }
  return (
    <DropdownMenuPrimitive.Separator
      ref={ref}
      // Hairline separator, same as SelectSeparator (element-specs §13: menus
      // are `glass-strong` panels with hairline dividers, never a tinted band).
      className={cn("-mx-1 my-1 h-px bg-hairline", className)}
      {...props}
    />
  )
})
DropdownMenuSeparator.displayName = DropdownMenuPrimitive.Separator.displayName

const DropdownMenuShortcut = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLSpanElement>) => {
  // No keyboard hints on touch (D §9 / do-not list 11).
  return (
    <span
      className={cn("ml-auto text-xs tracking-widest opacity-60 max-md:hidden", className)}
      {...props}
    />
  )
}
DropdownMenuShortcut.displayName = "DropdownMenuShortcut"

export {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuCheckboxItem,
  DropdownMenuRadioItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuGroup,
  DropdownMenuPortal,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuRadioGroup,
}
