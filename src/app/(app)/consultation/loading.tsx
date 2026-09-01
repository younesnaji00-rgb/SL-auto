import { PageSkeleton } from '@/components/ui/page-skeleton';

/** Read-only search page: title + subtitle, filter toolbar, one quiet table. */
export default function Loading() {
  return <PageSkeleton variant="list" action={false} />;
}
