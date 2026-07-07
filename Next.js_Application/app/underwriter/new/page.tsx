import { getCurrentUser } from '@/lib/auth';
import { can } from '@/lib/rbac';
import { redirect } from 'next/navigation';
import { SAMPLE_PRESETS } from '@/lib/sample-applicants';
import { NewApplicationClient } from './NewApplicationClient';

export const dynamic = 'force-dynamic';

export default async function NewApplicationPage() {
  const user = await getCurrentUser();
  if (!can(user?.role, 'applications.create')) redirect('/forbidden');

  const presets = SAMPLE_PRESETS.map((p) => ({
    id: p.id,
    label: p.label,
    description: p.description,
    expectedOutcome: p.expectedOutcome,
    file: p.file,
  }));

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-xl font-semibold">New Application</h1>
        <p className="text-sm text-muted-foreground">
          Pick a dummy applicant to auto-fill every field, tweak anything you like, then submit to
          run the full assessment pipeline end-to-end.
        </p>
      </div>
      <NewApplicationClient presets={presets} />
    </div>
  );
}
