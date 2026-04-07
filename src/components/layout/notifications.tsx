import { Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';

export default function Notifications() {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative h-9 w-9">
          <Bell className="h-5 w-5" />
          <span className="absolute top-1.5 right-1.5 flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-primary/90"></span>
          </span>
          <span className="sr-only">View notifications</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 p-0">
        <Card className="border-0">
          <CardHeader>
            <CardTitle>Notifications</CardTitle>
            <CardDescription>You have 2 unread messages.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-1">
             <div
              className="mb-2 grid grid-cols-[25px_1fr] items-start pb-4 last:mb-0 last:pb-0"
            >
              <span className="flex h-2 w-2 translate-y-1 rounded-full bg-primary" />
              <div className="grid gap-1">
                <p className="text-sm font-medium">New user registered</p>
                <p className="text-sm text-muted-foreground">
                  A new user, 'John Doe', has just signed up.
                </p>
                <p className="text-xs text-muted-foreground">2 minutes ago</p>
              </div>
            </div>
             <div
              className="mb-2 grid grid-cols-[25px_1fr] items-start pb-4 last:mb-0 last:pb-0"
            >
              <span className="flex h-2 w-2 translate-y-1 rounded-full bg-primary" />
              <div className="grid gap-1">
                <p className="text-sm font-medium">Server usage is high</p>
                <p className="text-sm text-muted-foreground">
                  CPU usage is currently at 92%.
                </p>
                <p className="text-xs text-muted-foreground">15 minutes ago</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
