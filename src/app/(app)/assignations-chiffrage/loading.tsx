import { PageSkeleton } from '@/components/ui/page-skeleton';

/**
 * Table-shaped skeleton (element-specs §15: NN/g skeleton screens ✓ mirror the
 * final layout; Carbon data table ✓ skeleton instead of spinner): title + count
 * line, filter row, then a header row and 44 px rows in the same paper frame.
 */
export default function Loading() {
  return <PageSkeleton variant="list" action={false} />;
}
