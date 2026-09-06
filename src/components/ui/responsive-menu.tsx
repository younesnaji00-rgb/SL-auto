'use client';

/**
 * ResponsiveMenu — the touch half of every `DropdownMenu` in the app
 * (research docs/research/mobile-overlays-feedback.md §3; mobile-synthesis §3).
 *
 * On a fine pointer a menu is a popover anchored to its trigger: 32 px rows,
 * hover, cascading submenus. On a COARSE pointer none of that survives — M3
 * calls the modal bottom sheet "the mobile-only alternative to menus", Apple
 * says an action sheet gives "choices related to an action", and NN/g caps a
 * touch menu at "fewer than 10–12 items" with no cascades. So on coarse
 * pointers the whole `DropdownMenuContent` re-renders as a `BottomSheet` whose
 * body is a list of 52 px rows.
 *
 * This module holds the pieces; `dropdown-menu.tsx` wires each primitive to
 * them, so all ~13 existing call sites (user menu, record bar, table column
 * menus, saved views, workspace tabs, language switcher, notifications,
 * sidebar help, slot card, ATG/consultation/dossiers filters) convert with
 * NO page edits. `align` / `side` / `sideOffset` / popover `className` are
 * simply ignored on touch; `asChild` triggers, `onSelect`, `onClick`,
 * checkbox and radio items, and `data-tour` anchors all keep working.
 *
 * Nothing here is used above the coarse-pointer break, so the desktop menu is
 * byte-for-byte the component it always was.
 */

import * as React from 'react';
import * as DropdownMenuPrimitive from '@radix-ui/react-dropdown-menu';

import { useIsCoarsePointer } from '@/hooks/use-viewport-class';
import { BottomSheet } from '@/components/ui/bottom-sheet';

/* ------------------------------------------------------------------ */
/* Menu state shared by trigger and content                            */
/* ------------------------------------------------------------------ */

export interface ResponsiveMenuState {
  /** True when the primary pointer is touch: render the sheet, not a popover. */
  coarse: boolean;
  open: boolean;
  setOpen: (open: boolean) => void;
}

const ResponsiveMenuContext = React.createContext<ResponsiveMenuState | null>(null);

export function useResponsiveMenu(): ResponsiveMenuState | null {
  return React.useContext(ResponsiveMenuContext);
}

export type ResponsiveMenuProps = React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Root>;

/**
 * Drop-in replacement for `DropdownMenuPrimitive.Root`. It keeps its own open
 * state (so a coarse pointer can drive a sheet) and hands the Radix root a
 * permanently-closed `open` on touch — the popover simply never mounts.
 */
export function ResponsiveMenu({
  children,
  open: openProp,
  defaultOpen,
  onOpenChange,
  ...rest
}: ResponsiveMenuProps) {
  const coarse = useIsCoarsePointer();
  const [internal, setInternal] = React.useState(!!defaultOpen);
  const open = openProp ?? internal;

  const setOpen = React.useCallback(
    (next: boolean) => {
      if (openProp === undefined) setInternal(next);
      onOpenChange?.(next);
    },
    [openProp, onOpenChange],
  );

  const value = React.useMemo<ResponsiveMenuState>(
    () => ({ coarse, open, setOpen }),
    [coarse, open, setOpen],
  );

  return (
    <ResponsiveMenuContext.Provider value={value}>
      {/* Always controlled, so flipping `coarse` after mount never trips
          Radix's uncontrolled → controlled warning. */}
      <DropdownMenuPrimitive.Root {...rest} open={coarse ? false : open} onOpenChange={setOpen}>
        {children}
      </DropdownMenuPrimitive.Root>
    </ResponsiveMenuContext.Provider>
  );
}

/* ------------------------------------------------------------------ */
/* The sheet a menu becomes on touch                                   */
/* ------------------------------------------------------------------ */

const MenuSheetContext = React.createContext<{ close: () => void } | null>(null);

/** Rows call this to close the sheet before running their action. */
export function useMenuSheet(): { close: () => void } | null {
  return React.useContext(MenuSheetContext);
}

export interface MenuSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: React.ReactNode;
  titleText?: string;
  detent?: 'default' | 'tall';
  children: React.ReactNode;
}

export function MenuSheet({ open, onOpenChange, title, titleText, detent, children }: MenuSheetProps) {
  const value = React.useMemo(() => ({ close: () => onOpenChange(false) }), [onOpenChange]);
  return (
    <BottomSheet
      open={open}
      onOpenChange={onOpenChange}
      title={title ?? 'Actions'}
      titleText={titleText ?? (typeof title === 'string' ? title : 'Actions')}
      detent={detent}
      flush
    >
      <MenuSheetContext.Provider value={value}>
        <div className="pb-1">{children}</div>
      </MenuSheetContext.Provider>
    </BottomSheet>
  );
}

/* ------------------------------------------------------------------ */
/* Row anatomy (D §3: 52 px, 20 px icon in ink-2, 15 px label)         */
/* ------------------------------------------------------------------ */

export const MENU_ROW =
  'flex min-h-[52px] w-full items-center gap-3 px-4 text-left text-[15px] leading-tight text-ink transition-colors ' +
  'hover:bg-surface-2 focus:outline-none focus-visible:bg-surface-2 ' +
  'disabled:pointer-events-none disabled:opacity-50 data-[disabled]:pointer-events-none data-[disabled]:opacity-50 ' +
  '[&>svg]:h-5 [&>svg]:w-5 [&>svg]:shrink-0 [&>svg]:text-ink-2';

/** Hairline between rows — the only divider a touch menu gets. */
export const MENU_SEPARATOR = 'my-1 h-px bg-hairline';

/** `DropdownMenuLabel` on touch: a `t-label` band, not a bolded row. */
export const MENU_LABEL = 't-label px-4 pb-1 pt-3';

/**
 * Touch rows are DIVs with `role="menuitem"`, exactly like Radix's own item —
 * not `<button>`. Two call sites nest an interactive control inside a menu
 * item (`ui/saved-views.tsx` puts a delete button in each row), and a button
 * inside a button is invalid HTML. The div keeps the row keyboard-operable.
 */
export function menuRowKeyDown(activate: () => void) {
  return (e: React.KeyboardEvent) => {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    if (e.target !== e.currentTarget) return;
    e.preventDefault();
    activate();
  };
}

/**
 * Radix fires `onSelect` with a cancelable `menu.itemSelect` event and keeps
 * the menu open when a handler calls `preventDefault()` — the pattern every
 * "Colonnes" / density menu in this app relies on. Reproduced here so those
 * call sites behave identically inside the sheet.
 *
 * @returns true when the handler prevented the default (keep the sheet open).
 */
export function fireMenuSelect(onSelect?: (event: Event) => void): boolean {
  if (!onSelect) return false;
  const event =
    typeof CustomEvent === 'function'
      ? new CustomEvent('menu.itemSelect', { bubbles: false, cancelable: true })
      : ({ defaultPrevented: false, preventDefault() { (this as { defaultPrevented: boolean }).defaultPrevented = true; } } as unknown as Event);
  onSelect(event);
  return event.defaultPrevented;
}

/* ------------------------------------------------------------------ */
/* Radio group (Radix's own needs the menu context we do not mount)    */
/* ------------------------------------------------------------------ */

export interface MenuRadioState {
  value?: string;
  onValueChange?: (value: string) => void;
}

const MenuRadioContext = React.createContext<MenuRadioState | null>(null);

export const MenuRadioProvider = MenuRadioContext.Provider;

export function useMenuRadio(): MenuRadioState | null {
  return React.useContext(MenuRadioContext);
}

export default ResponsiveMenu;
