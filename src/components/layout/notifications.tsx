'use client';

import { Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { EmptyState } from '@/components/ui/empty-state';
import { useT } from '@/i18n';

export type NotificationItem = {
  id: string;
  title: string;
  description?: string;
  timeLabel?: string;
  unread?: boolean;
};

type NotificationsProps = {
  items?: NotificationItem[];
};

export default function Notifications({ items = [] }: NotificationsProps) {
  const t = useT();
  const hasUnread = items.some((item) => item.unread);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative h-9 w-9">
          <Bell className="h-5 w-5" />
          {hasUnread && (
            <span className="absolute top-1.5 right-1.5 flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-primary/90"></span>
            </span>
          )}
          <span className="sr-only">{t('Notifications')}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 p-0">
        <div className="p-4 border-b">
          <p className="text-sm font-semibold">{t('Notifications')}</p>
          <p className="text-xs text-muted-foreground">
            {items.length > 0
              ? `${items.filter((i) => i.unread).length} ${t('non lue(s)')}`
              : t('Aucune nouvelle activité')}
          </p>
        </div>
        {items.length === 0 ? (
          <div className="p-3">
            <EmptyState
              icon={<Bell />}
              title={t('Aucune notification')}
              description={t('Vous serez notifié des changements importants ici.')}
              dashed={false}
              className="border-0 bg-transparent py-6"
            />
          </div>
        ) : (
          <div className="max-h-80 overflow-y-auto p-2">
            {items.map((item) => (
              <div
                key={item.id}
                className="grid grid-cols-[16px_1fr] items-start gap-2 rounded-md p-2 hover:bg-muted/60"
              >
                <span className={`mt-1.5 h-2 w-2 rounded-full ${item.unread ? 'bg-primary' : 'bg-muted-foreground/30'}`} />
                <div className="flex flex-col gap-0.5">
                  <p className="text-sm font-medium">{item.title}</p>
                  {item.description && (
                    <p className="text-xs text-muted-foreground">{item.description}</p>
                  )}
                  {item.timeLabel && (
                    <p className="text-[11px] text-muted-foreground">{item.timeLabel}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
