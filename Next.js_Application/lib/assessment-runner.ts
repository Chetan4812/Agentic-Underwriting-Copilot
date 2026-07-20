import { prisma } from './prisma';
import { assess } from './ai-service';
import { computeAssessment } from './mock-ai';
import type { ApplicantFile, ApplicationInput, AssessResponse, RiskTier } from './types';

// ---------------------------------------------------------------------------
// Shared assessment orchestration used by both the intake endpoint and the
// manual "re-assess" endpoint.
//
// Strategy:
//  - Always compute the local breakdown (risk / SHAP / compliance) with the
//    deterministic mock engine so the case detail view is fully populated.
//  - For the final DecisionRecord / ReferralPackage, call the real FastAPI
//    service UNLESS AI_SERVICE_MOCK=true. If the real call fails, fall back to
//    the mock outcome so the system keeps working end-to-end.
// ---------------------------------------------------------------------------

export interface AssessmentPersistResult {
  kind: 'decision' | 'referral';
  engine: 'mock' | 'live';
  outcome: AssessResponse;
  riskTier: RiskTier;
  pd: number;
}

export async function assessAndPersist(
  skIdCurr: number,
  applicantFile: ApplicantFile,
): Promise<AssessmentPersistResult> {
  const full = computeAssessment(applicantFile);

  let outcome: AssessResponse = full.outcome;
  let engine: 'mock' | 'live' = 'mock';

  const useMock = process.env.AI_SERVICE_MOCK === 'true';
  if (!useMock) {
    const input: ApplicationInput = {
      sk_id_curr: skIdCurr,
      requested_at: new Date().toISOString(),
      raw_fields: applicantFile as unknown as Record<string, unknown>,
    };
    try {
      outcome = await assess(input);
      engine = 'live';
    } catch {
      // Live service unreachable -> keep deterministic mock outcome.
      outcome = full.outcome;
      engine = 'mock';
    }
  }

  const isReferral = outcome.kind === 'referral';

  await prisma.$transaction(async (tx) => {
    // Assessment (RiskScoringResult projection)
    await tx.assessment.upsert({
      where: { applicationId: skIdCurr },
      update: {
        defaultProbability: full.risk.probability_of_default,
        riskTier: full.risk.risk_tier,
        confidenceBandLower: full.risk.confidence_band[0],
        confidenceBandUpper: full.risk.confidence_band[1],
        lowConfidenceFlag: full.lowConfidence,
        thinFileFlag: full.thinFileFlag,
        fairnessFlag: full.fairnessFlag,
      },
      create: {
        applicationId: skIdCurr,
        defaultProbability: full.risk.probability_of_default,
        riskTier: full.risk.risk_tier,
        confidenceBandLower: full.risk.confidence_band[0],
        confidenceBandUpper: full.risk.confidence_band[1],
        lowConfidenceFlag: full.lowConfidence,
        thinFileFlag: full.thinFileFlag,
        fairnessFlag: full.fairnessFlag,
      },
    });

    // SHAP factors (replace)
    await tx.shapFactor.deleteMany({ where: { applicationId: skIdCurr } });
    await tx.shapFactor.createMany({
      data: full.risk.top_shap_factors.map((s) => ({
        applicationId: skIdCurr,
        featureName: s.feature_name,
        shapValue: s.shap_value,
        effect: s.effect,
      })),
    });

    // Policy citations (replace)
    await tx.policyCitation.deleteMany({ where: { applicationId: skIdCurr } });
    await tx.policyCitation.createMany({
      data: full.compliance.citations.map((c) => ({
        applicationId: skIdCurr,
        clauseId: c.clause_id,
        textSnippet: c.text_snippet,
        passed: full.compliance.rule_pass_fail[c.clause_id] ?? null,
      })),
    });

    if (outcome.kind === 'referral') {
      // Clear any stale decision, write referral, set status ESCALATED.
      await tx.decisionRecord.deleteMany({ where: { applicationId: skIdCurr } });
      await tx.referralPackage.upsert({
        where: { applicationId: skIdCurr },
        update: {
          reasonForReferral: outcome.reason_for_referral,
          escalationFlags: outcome.escalation_flags,
          partialFindings: outcome.partial_findings as object,
        },
        create: {
          applicationId: skIdCurr,
          reasonForReferral: outcome.reason_for_referral,
          escalationFlags: outcome.escalation_flags,
          partialFindings: outcome.partial_findings as object,
        },
      });
      await tx.underwritingApplication.update({
        where: { skIdCurr },
        data: { status: 'ESCALATED' },
      });
    } else {
      await tx.referralPackage.deleteMany({ where: { applicationId: skIdCurr } });
      await tx.decisionRecord.upsert({
        where: { applicationId: skIdCurr },
        update: {
          decisionRecommendation: outcome.decision,
          confidence: outcome.confidence,
          explanationNarrative: outcome.explanation_narrative,
          topReasons: outcome.top_reasons,
          policyCitations: outcome.policy_citations,
          auditTrail: outcome.audit_trail as object,
          finalCostUsd: outcome.total_cost_usd,
        },
        create: {
          applicationId: skIdCurr,
          decisionRecommendation: outcome.decision,
          confidence: outcome.confidence,
          explanationNarrative: outcome.explanation_narrative,
          topReasons: outcome.top_reasons,
          policyCitations: outcome.policy_citations,
          auditTrail: outcome.audit_trail as object,
          finalCostUsd: outcome.total_cost_usd,
        },
      });
      // Fresh recommendation -> awaiting underwriter action.
      await tx.underwritingApplication.update({
        where: { skIdCurr },
        data: { status: 'PENDING' },
      });
    }
  });

  return {
    kind: isReferral ? 'referral' : 'decision',
    engine,
    outcome,
    riskTier: full.risk.risk_tier,
    pd: full.risk.probability_of_default,
  };
}
