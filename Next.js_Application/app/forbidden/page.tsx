import Link from 'next/link';
import { ShieldX } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function ForbiddenPage() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 text-center">
      <ShieldX className="h-10 w-10 text-destructive" />
      <h1 className="text-xl font-semibold">Access denied</h1>
      <p className="max-w-sm text-sm text-muted-foreground">
        Your role does not have permission to view this section. Contact an administrator if you
        believe this is a mistake.
      </p>
      <Button asChild variant="outline">
        <Link href="/underwriter">Back to console</Link>
      </Button>
    </div>
  );
}
