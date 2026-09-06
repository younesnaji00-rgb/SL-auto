"use client"

/**
 * Command palette primitives (cmdk).
 *
 * Phone form (research docs/research/mobile-overlays-feedback.md §9): below md
 * the palette is a `FullScreenDialog`, not a bottom sheet — a bottom-anchored
 * palette puts its input UNDER the on-screen keyboard (today's outcome) and
 * hits the Safari `visualViewport` reset bug (Radix #2323 class). The input is
 * pinned in the 56 px header via `CommandHeaderSlot` at 16 px (never smaller:
 * iOS zooms the page for anything below 16), the list fills the rest in `dvh`
 * so the keyboard shrinks the LIST and not the input, rows are 52 px, and the
 * ⌘K / ↵ / ↑↓ hint bar is hidden (do-not list 11: no keyboard-taught
 * affordances on touch).
 */

import * as React from "react"
import { createPortal } from "react-dom"
import { type DialogProps } from "@radix-ui/react-dialog"
import { Command as CommandPrimitive } from "cmdk"
import { Search } from "lucide-react"

import { cn } from "@/lib/utils"
import { Dialog, DialogContent, useOverlayChrome } from "@/components/ui/dialog"

/**
 * Pins the palette's search input in the phone overlay's 56 px header. On md
 * and up it renders in place, so one JSX tree serves both shells.
 */
const CommandHeaderSlot = ({ children }: { children: React.ReactNode }) => {
  const { mode, titleSlot } = useOverlayChrome()
  if (mode !== "none" && titleSlot) return createPortal(<>{children}</>, titleSlot)
  return <>{children}</>
}

const Command = React.forwardRef<
  React.ElementRef<typeof CommandPrimitive>,
  React.ComponentPropsWithoutRef<typeof CommandPrimitive>
>(({ className, ...props }, ref) => (
  <CommandPrimitive
    ref={ref}
    className={cn(
      "flex h-full w-full flex-col overflow-hidden rounded-md bg-popover text-popover-foreground",
      className
    )}
    {...props}
  />
))
Command.displayName = CommandPrimitive.displayName

interface CommandDialogProps extends DialogProps {}

const CommandDialog = ({ children, ...props }: CommandDialogProps) => {
  return (
    <Dialog {...props}>
      <DialogContent
        fullScreen
        bodyClassName="gap-0 overflow-hidden p-0"
        className="overflow-hidden p-0 [&_[cmdk-root]]:bg-transparent"
      >
        <Command className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-muted-foreground [&_[cmdk-group]:not([hidden])_~[cmdk-group]]:pt-0 [&_[cmdk-group]]:px-2 [&_[cmdk-input-wrapper]_svg]:h-5 [&_[cmdk-input-wrapper]_svg]:w-5 [&_[cmdk-input]]:h-12 [&_[cmdk-item]]:px-2 [&_[cmdk-item]]:py-3 [&_[cmdk-item]_svg]:h-5 [&_[cmdk-item]_svg]:w-5">
          {children}
        </Command>
      </DialogContent>
    </Dialog>
  )
}

const CommandInput = React.forwardRef<
  React.ElementRef<typeof CommandPrimitive.Input>,
  React.ComponentPropsWithoutRef<typeof CommandPrimitive.Input>
>(({ className, ...props }, ref) => (
  // In the phone header the bar IS the header, so it drops its own border.
  <div className="flex items-center border-b px-3 max-md:border-0 max-md:pl-0 max-md:pr-2" cmdk-input-wrapper="">
    <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
    <CommandPrimitive.Input
      ref={ref}
      className={cn(
        // 16 px below md: anything smaller makes iOS Safari zoom the page.
        "flex h-11 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50 max-md:h-12 max-md:text-[16px]",
        className
      )}
      {...props}
    />
  </div>
))

CommandInput.displayName = CommandPrimitive.Input.displayName

const CommandList = React.forwardRef<
  React.ElementRef<typeof CommandPrimitive.List>,
  React.ComponentPropsWithoutRef<typeof CommandPrimitive.List>
>(({ className, ...props }, ref) => (
  <CommandPrimitive.List
    ref={ref}
    className={cn("max-h-[300px] overflow-y-auto overflow-x-hidden overscroll-contain max-md:max-h-none max-md:flex-1", className)}
    {...props}
  />
))

CommandList.displayName = CommandPrimitive.List.displayName

const CommandEmpty = React.forwardRef<
  React.ElementRef<typeof CommandPrimitive.Empty>,
  React.ComponentPropsWithoutRef<typeof CommandPrimitive.Empty>
>((props, ref) => (
  <CommandPrimitive.Empty
    ref={ref}
    className="py-6 text-center text-sm"
    {...props}
  />
))

CommandEmpty.displayName = CommandPrimitive.Empty.displayName

const CommandGroup = React.forwardRef<
  React.ElementRef<typeof CommandPrimitive.Group>,
  React.ComponentPropsWithoutRef<typeof CommandPrimitive.Group>
>(({ className, ...props }, ref) => (
  <CommandPrimitive.Group
    ref={ref}
    className={cn(
      "overflow-hidden p-1 text-foreground [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-muted-foreground max-md:p-0 [&_[cmdk-group-heading]]:max-md:px-4 [&_[cmdk-group-heading]]:max-md:pb-1 [&_[cmdk-group-heading]]:max-md:pt-3",
      className
    )}
    {...props}
  />
))

CommandGroup.displayName = CommandPrimitive.Group.displayName

const CommandSeparator = React.forwardRef<
  React.ElementRef<typeof CommandPrimitive.Separator>,
  React.ComponentPropsWithoutRef<typeof CommandPrimitive.Separator>
>(({ className, ...props }, ref) => (
  <CommandPrimitive.Separator
    ref={ref}
    className={cn("-mx-1 h-px bg-border", className)}
    {...props}
  />
))
CommandSeparator.displayName = CommandPrimitive.Separator.displayName

const CommandItem = React.forwardRef<
  React.ElementRef<typeof CommandPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof CommandPrimitive.Item>
>(({ className, ...props }, ref) => (
  <CommandPrimitive.Item
    ref={ref}
    className={cn(
      // Touch rows are 52 px with 16 px side padding (D §9 / do-not list 9).
      "relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none aria-selected:bg-accent aria-selected:text-accent-foreground data-[disabled=true]:pointer-events-none data-[disabled=true]:opacity-50 max-md:min-h-[52px] max-md:rounded-none max-md:px-4 max-md:text-[15px]",
      className
    )}
    {...props}
  />
))

CommandItem.displayName = CommandPrimitive.Item.displayName

const CommandShortcut = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLSpanElement>) => {
  return (
    <span
      className={cn(
        // No keyboard hints below md (do-not list 11).
        "ml-auto text-xs tracking-widest text-muted-foreground max-md:hidden",
        className
      )}
      {...props}
    />
  )
}
CommandShortcut.displayName = "CommandShortcut"

const CommandLoading = (props: React.ComponentProps<typeof CommandPrimitive.Loading>) => (
    <CommandPrimitive.Loading {...props} />
)

export {
  Command,
  CommandDialog,
  CommandHeaderSlot,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandShortcut,
  CommandSeparator,
  CommandLoading,
}
