import * as React from "react"

import { cn } from "@/lib/utils"

/**
 * Data-table primitives (NN/g / Carbon, blueprint §2/§4): row hairlines only,
 * a sticky `bg-card` header with `t-label` column heads (12 px sentence case,
 * ink-3 — never uppercase), 44 px rows (36 px under `data-density=compact`,
 * see globals.css), tabular figures on every cell, no vertical cell borders
 * and no zebra, hover = `surface-2`, selected row = accent tint,
 * `scope="col"` on every header cell, and a focusable labelled scroll region
 * so keyboard users can pan wide tables.
 *
 * Alignment contract (Polaris data table: "numerical data right aligned,
 * textual left, headers must align with their related data, don't center
 * align"; element-specs §3). There is no `numeric` prop — callers put the
 * SAME class on the head and its cells:
 *
 *   <TableHead className="text-right">Montant</TableHead>
 *   <TableCell className="text-right">1 250,00</TableCell>
 *
 * Digits are already tabular on every cell. Refs/plates use `t-mono`. The
 * first (identifier) column is frozen with `sticky left-0 bg-card` on both
 * the head and the cells when the table can overflow.
 */

const Table = React.forwardRef<
  HTMLTableElement,
  React.HTMLAttributes<HTMLTableElement> & { regionLabel?: string }
>(({ className, regionLabel, ...props }, ref) => (
  <div
    className="relative w-full overflow-auto focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    role="region"
    aria-label={regionLabel ?? "Tableau"}
    tabIndex={0}
  >
    <table
      ref={ref}
      className={cn("w-full caption-bottom text-sm", className)}
      {...props}
    />
  </div>
))
Table.displayName = "Table"

const TableHeader = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
  <thead ref={ref} className={cn("bg-card [&_tr]:border-b [&_tr]:border-hairline [&_tr]:hover:bg-transparent", className)} {...props} />
))
TableHeader.displayName = "TableHeader"

const TableBody = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
  <tbody
    ref={ref}
    className={cn("[&_tr:last-child]:border-0", className)}
    {...props}
  />
))
TableBody.displayName = "TableBody"

const TableFooter = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
  <tfoot
    ref={ref}
    className={cn(
      "border-t border-hairline bg-card font-medium tabular-nums [&>tr]:last:border-b-0",
      className
    )}
    {...props}
  />
))
TableFooter.displayName = "TableFooter"

const TableRow = React.forwardRef<
  HTMLTableRowElement,
  React.HTMLAttributes<HTMLTableRowElement>
>(({ className, ...props }, ref) => (
  <tr
    ref={ref}
    className={cn(
      "border-b border-hairline transition-colors hover:bg-surface-2 data-[state=selected]:bg-accent/40",
      className
    )}
    {...props}
  />
))
TableRow.displayName = "TableRow"

const TableHead = React.forwardRef<
  HTMLTableCellElement,
  React.ThHTMLAttributes<HTMLTableCellElement>
>(({ className, scope = "col", ...props }, ref) => (
  <th
    ref={ref}
    scope={scope}
    className={cn(
      // Sticky inside the scroll region; solid card so rows scroll under it.
      // 44 px like the body rows (Carbon data table: "the column header row
      // should always match the row size of the table"); compact density
      // drops both to 36 px via globals.css.
      "t-label sticky top-0 z-[1] h-11 whitespace-nowrap bg-card px-3 text-left align-middle font-normal normal-case tracking-normal tabular-nums [&:has([role=checkbox])]:pr-0",
      className
    )}
    {...props}
  />
))
TableHead.displayName = "TableHead"

const TableCell = React.forwardRef<
  HTMLTableCellElement,
  React.TdHTMLAttributes<HTMLTableCellElement>
>(({ className, ...props }, ref) => (
  <td
    ref={ref}
    className={cn("h-11 whitespace-nowrap px-3 py-2 align-middle text-ink tabular-nums [&:has([role=checkbox])]:pr-0", className)}
    {...props}
  />
))
TableCell.displayName = "TableCell"

const TableCaption = React.forwardRef<
  HTMLTableCaptionElement,
  React.HTMLAttributes<HTMLTableCaptionElement>
>(({ className, ...props }, ref) => (
  <caption
    ref={ref}
    className={cn("t-caption mt-4", className)}
    {...props}
  />
))
TableCaption.displayName = "TableCaption"

export {
  Table,
  TableHeader,
  TableBody,
  TableFooter,
  TableHead,
  TableRow,
  TableCell,
  TableCaption,
}
