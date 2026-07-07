'use client';

import { useState } from 'react';
import { CheckCircle2, XCircle, FileText } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export interface CitationRow {
  clauseId: string;
  textSnippet: string;
  passed: boolean | null;
}

interface Props {
  citations: CitationRow[];
  hardStopViolations?: string[];
}

/**
 * Compliance Checklist + Citation verification drawer.
 * Lists each policy rule with pass/fail status. Clicking a clause opens a
 * right-hand drawer showing the exact indexed document snippet (RAG source).
 */
export function CitationPanel({ citations, hardStopViolations = [] }: Props) {
  const [active, setActive] = useState<CitationRow | null>(null);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Compliance Checklist</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {citations.length === 0 && (
          <p className="text-xs text-muted-foreground">No policy rules evaluated.</p>
        )}
        {citations.map((c) => {
          const isHardStop = hardStopViolations.includes(c.clauseId);
          return (
            <button
              key={c.clauseId}
              onClick={() => setActive(c)}
              className={cn(
                'flex w-full items-center justify-between rounded-md border border-border bg-secondary/40 px-3 py-2 text-left transition-colors hover:bg-secondary',
                isHardStop && 'border-destructive/50',
              )}
            >
              <span className="flex items-center gap-2">
                {c.passed === false ? (
                  <XCircle className="h-4 w-4 text-destructive" />
                ) : (
                  <CheckCircle2 className="h-4 w-4 text-success" />
                )}
                <code className="text-xs font-medium">[{c.clauseId}]</code>
                {isHardStop && <Badge variant="destructive">Hard stop</Badge>}
              </span>
              <FileText className="h-3.5 w-3.5 text-muted-foreground" />
            </button>
          );
        })}
      </CardContent>

      <Dialog open={!!active} onOpenChange={(o) => !o && setActive(null)}>
        <DialogContent side="right">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <code className="text-sm">[{active?.clauseId}]</code>
              {active?.passed === false ? (
                <Badge variant="destructive">Failed</Badge>
              ) : (
                <Badge variant="success">Passed</Badge>
              )}
            </DialogTitle>
            <DialogDescription>Indexed policy document snippet (Chroma RAG source)</DialogDescription>
          </DialogHeader>
          <div className="mt-4 rounded-md border border-border bg-background p-4">
            <p className="text-sm leading-relaxed text-foreground">{active?.textSnippet}</p>
          </div>
          <p className="mt-4 text-xs text-muted-foreground">
            This snippet is the exact clause the compliance agent retrieved and cited when
            evaluating the applicant against workspace policy.
          </p>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
