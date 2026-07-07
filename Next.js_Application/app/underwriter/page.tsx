import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { QueueTable, type QueueRow } from '@/components/QueueTable';

export const dynamic = 'force-dynamic';

async function loadRows(where: any): Promise<QueueRow[]> {
  const apps = await prisma.underwritingApplication.findMany({
    where,
    orderBy: { submissionDate: 'desc' },
    include: { assessment: true, referralPackage: true, decisionRecord: true, assignedTo: true },
  });
  return apps.map((a) => ({
    skIdCurr: a.skIdCurr,
    status: a.status,
    loanAmount: a.loanAmount,
    dtiRatio: a.dtiRatio,
    submissionDate: a.submissionDate.toISOString(),
    riskTier: a.assessment?.riskTier ?? null,
    pd: a.assessment?.defaultProbability ?? null,
    assignedToName: a.assignedTo?.name ?? null,
    escalationFlags: a.referralPackage?.escalationFlags ?? [],
    verdict: a.decisionRecord?.decisionRecommendation ?? null,
  }));
}

export default async function UnderwriterQueuePage() {
  const user = await getCurrentUser();
  const currentUserId = user?.id ?? '';
  const [pending, referred, completed] = await Promise.all([
    loadRows({ status: 'PENDING' }),
    loadRows({ status: 'ESCALATED' }),
    loadRows({ status: { in: ['APPROVED', 'DECLINED'] } }),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Underwriter Console</h1>
        <p className="text-sm text-muted-foreground">
          Triage pending applications, work referrals, and review completed decisions.
        </p>
      </div>

      <Tabs defaultValue="queue">
        <TabsList>
          <TabsTrigger value="queue">Underwriter Queue ({pending.length})</TabsTrigger>
          <TabsTrigger value="referral">Referral Queue ({referred.length})</TabsTrigger>
          <TabsTrigger value="completed">Completed ({completed.length})</TabsTrigger>
        </TabsList>
        <TabsContent value="queue">
          <QueueTable rows={pending} currentUserId={currentUserId} />
        </TabsContent>
        <TabsContent value="referral">
          <QueueTable rows={referred} currentUserId={currentUserId} showFlags />
        </TabsContent>
        <TabsContent value="completed">
          <QueueTable rows={completed} currentUserId={currentUserId} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
