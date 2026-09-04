import { PageSkeleton } from '@/components/ui/page-skeleton';

/**
 * Table-shaped skeleton (element-specs §15: NN/g skeleton screens ✓ mirror the
 * final layout; Carbon data table ✓ skeleton instead of spinner): title +
 * count + primary pill, filter row, then a header row and 44 px rows in one
 * paper frame — the desktop shape of the grouped mission tables.
 */
export default function Loading() {
  return <PageSkeleton variant="list" />;
}
