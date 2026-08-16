/**
 * competition-result service
 */

import { factories } from '@strapi/strapi';
import { errors } from '@strapi/utils';

const { ApplicationError } = errors;

type BatchLike = {
  id: number;
  requiredValue?: number | null;
};

type BatchLimitLike = {
  id?: number;
  limit?: number | null;
  assigned?: number | null;
  batch?: { id: number; requiredValue?: number | null } | null;
};

type EvaluationForResult = {
  id: number;
  points?: number | null;
  updatedAt?: string | Date | null;
  criteria?: { weight?: number | null } | null;
};

type ResultForAllocation = {
  id: number;
  totalPoints?: number | null;
  order?: number | null;
  batch?: { id: number } | null;
  evaluations?: EvaluationForResult[] | null;
  model?: {
    category?: {
      batches?: BatchLike[] | null;
    } | null;
  } | null;
};

type ResultUpdate = {
  id: number;
  batch?: number | null;
  totalPoints?: number;
  order?: number;
};

type UserLike = {
  id: number;
  documentId?: string;
  username?: string;
  email?: string;
};

type ReviewerLike = {
  id: number;
  user?: UserLike | null;
};

type EvaluationLike = {
  name?: string | null;
  points?: number | null;
  comments?: string | null;
  reviewer?: ReviewerLike | null;
};

type CompetitionLike = {
  id: number;
  activity?: { name?: string } | null;
};

type BatchResultLike = {
  id: number;
  batch?: string | null;
  batchName?: string | null;
};

type ResultEmailLike = {
  id: number;
  order?: number | null;
  totalPoints?: number | null;
  competition?: CompetitionLike | null;
  batch?: BatchResultLike | null;
  evaluations?: EvaluationLike[] | null;
  model?: {
    user?: UserLike | null;
    model?: { name?: string; image?: { url?: string } | null } | null;
    category?: { name?: string } | null;
  } | null;
};

const PODIUM_BATCHES = new Set(['gold', 'silver', 'bronce']);

const recomputeInFlight = new Set<number>();

async function mapLimit<T, R>(
  items: T[],
  limit: number,
  fn: (item: T, index: number) => Promise<R>
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let index = 0;

  async function worker() {
    while (index < items.length) {
      const i = index++;
      results[i] = await fn(items[i], i);
    }
  }

  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}

function roundToTwo(value: number): number {
  return Math.round(value * 100) / 100;
}

function computeTotalPoints(
  evaluations: EvaluationForResult[],
  operationType: 'average' | 'sum'
): number {
  const rawSum = evaluations.reduce((acc, evaluation) => acc + (evaluation.points ?? 0), 0);
  const count = evaluations.length;
  const metric =
    operationType === 'average' ? (count > 0 ? rawSum / count : 0) : rawSum;
  return roundToTwo(metric);
}

function computeTieBreakKey(evaluations: EvaluationForResult[]): {
  keyPoints: number;
  keyWeight: number;
  gradedAt: number;
} {
  const keyWeight = evaluations.reduce(
    (acc, evaluation) => Math.max(acc, evaluation.criteria?.weight ?? 0),
    0
  );
  const keyPoints = evaluations.reduce((acc, evaluation) => {
    if ((evaluation.criteria?.weight ?? 0) === keyWeight) {
      return Math.max(acc, evaluation.points ?? 0);
    }
    return acc;
  }, 0);
  const gradedAt = evaluations.reduce((acc, evaluation) => {
    const time = new Date(evaluation.updatedAt ?? 0).getTime();
    if (Number.isNaN(time)) return acc;
    return Math.max(acc, time);
  }, 0);
  return { keyPoints, keyWeight, gradedAt };
}

async function applyResultUpdates(updates: ResultUpdate[]): Promise<void> {
  for (const update of updates) {
    const data: Record<string, unknown> = {};
    if ('batch' in update) data.batch = update.batch;
    if ('totalPoints' in update) data.totalPoints = update.totalPoints;
    if ('order' in update) data.order = update.order;

    await strapi.db
      .query('api::competition-result.competition-result')
      .update({ where: { id: update.id }, data });
  }
}

function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function sendEmail(options: {
  to: string;
  cc?: string;
  subject: string;
  html: string;
}): Promise<unknown> {
  return strapi.plugin('email').service('email').send(options);
}

function buildResultEmailHtml(input: {
  user: UserLike;
  results: ResultEmailLike[];
}): { subject: string; html: string } {
  const { user, results } = input;
  const username = escapeHtml(user.username ?? user.email ?? 'Participante');
  const competitionName = escapeHtml(
    results[0]?.competition?.activity?.name ?? 'Competencia'
  );

  const resultsHtml = results
    .map((result) => {
      const modelName = escapeHtml(result.model?.model?.name ?? 'Modelo');
      const categoryName = escapeHtml(result.model?.category?.name ?? '');
      const totalPoints = result.totalPoints ?? 0;
      const order = result.order ?? 0;
      const batchEnum = result.batch?.batch ?? null;
      const batchName = escapeHtml(result.batch?.batchName ?? batchEnum ?? '');
      const isPodium = batchEnum !== null && PODIUM_BATCHES.has(batchEnum);

      const modelImage = result.model?.model?.image?.url;
      const imageHtml = modelImage
        ? `<img src="${escapeHtml(modelImage)}" alt="${modelName}" style="max-width:120px;border-radius:8px;margin:8px 0;" />`
        : '';

      let batchHtml = '';
      if (isPodium) {
        batchHtml = `<p style="color:#16a34a;font-weight:600;">🎉 ¡Felicidades! Tu modelo obtuvo <strong>${batchName}</strong>.</p>`;
      } else if (batchName) {
        batchHtml = `<p><strong>Batch:</strong> ${batchName}</p>`;
      }

      const evaluations = result.evaluations ?? [];
      const grouped = new Map<number, { reviewerName: string; evaluations: EvaluationLike[] }>();
      for (const evaluation of evaluations) {
        const reviewerId = evaluation.reviewer?.id ?? 0;
        if (!grouped.has(reviewerId)) {
          grouped.set(reviewerId, {
            reviewerName: escapeHtml(
              evaluation.reviewer?.user?.username ?? evaluation.reviewer?.user?.email ?? 'Juez'
            ),
            evaluations: [],
          });
        }
        grouped.get(reviewerId)!.evaluations.push(evaluation);
      }

      let evaluationsHtml = '';
      if (grouped.size > 0) {
        const judgesHtml = Array.from(grouped.values())
          .map((group) => {
            const feedback = group.evaluations.filter((evaluation) => evaluation.comments);
            const feedbackList =
              feedback.length > 0
                ? feedback
                    .map(
                      (evaluation) =>
                        `<li><strong>${escapeHtml(evaluation.name ?? 'Criterio')}:</strong> ${escapeHtml(
                          evaluation.comments
                        )}</li>`
                    )
                    .join('')
                : '<li style="color:#6b7280;">Sin comentarios.</li>';

            return `
            <div style="margin:10px 0;">
              <strong style="color:#4338ca;">${group.reviewerName}</strong>
              <ul style="margin:6px 0 0;padding-left:20px;">
                ${feedbackList}
              </ul>
            </div>`;
          })
          .join('');
        evaluationsHtml = `
          <h4 style="margin:12px 0 4px;">Feedback por juez</h4>
          ${judgesHtml}`;
      } else {
        evaluationsHtml = '<p style="color:#6b7280;">Sin evaluaciones registradas.</p>';
      }

      return `
      <div style="border:1px solid #e5e7eb;border-radius:10px;padding:16px;margin:14px 0;">
        <h3 style="margin:0 0 4px;">${modelName}${categoryName ? ` <span style="color:#6b7280;font-weight:400;">— ${categoryName}</span>` : ''}</h3>
        ${imageHtml}
        <p style="margin:4px 0;">Puntos totales: <strong>${totalPoints}</strong> | Posición: ${order}</p>
        ${batchHtml}
        ${evaluationsHtml}
      </div>`;
    })
    .join('');

  const html = `<!DOCTYPE html>
<html lang="es">
  <head>
    <meta charset="utf-8" />
  </head>
  <body style="margin:0;padding:0;background-color:#f3f4f6;font-family:Arial,Helvetica,sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f3f4f6;padding:24px 0;">
      <tr>
        <td align="center">
          <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:12px;overflow:hidden;">
            <tr>
              <td style="background-color:#4338ca;padding:24px;color:#ffffff;">
                <h1 style="margin:0;font-size:22px;">Resultados de la competencia</h1>
                <p style="margin:4px 0 0;opacity:.9;">${competitionName}</p>
              </td>
            </tr>
            <tr>
              <td style="padding:24px;">
                <h2 style="margin:0 0 12px;">¡Hola ${username}!</h2>
                <p style="margin:0 0 8px;">Estos son los resultados de tus modelos:</p>
                ${resultsHtml}
                <p style="margin:20px 0 0;">¡Gracias por participar!</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;

  return { subject: `Resultados de ${competitionName}`, html };
}

export default factories.createCoreService(
  'api::competition-result.competition-result',
  ({ strapi }) => ({
    async recomputeCompetition(competitionId: number): Promise<void> {
      if (recomputeInFlight.has(competitionId)) return;
      recomputeInFlight.add(competitionId);

      try {
        await strapi.db.transaction(async ({ trx }) => {
          // Serializa recomputes de la misma competencia entre instancias
          // (compatible con pgbouncer en modo transacción: se libera al commitear).
          await trx.raw('SELECT pg_advisory_xact_lock(?)', [competitionId]);

          const competition = (await strapi.db
            .query('api::competition.competition')
            .findOne({
              where: { id: competitionId },
              populate: { batchLimits: { populate: { batch: true } } },
            })) as {
            id: number;
            operationType?: 'average' | 'sum' | null;
            batchLimits?: BatchLimitLike[] | null;
          } | null;

          if (!competition) return;

          const operationType = competition.operationType ?? 'average';
          const batchLimits = (competition.batchLimits ?? []).filter(
            (entry) => entry?.batch?.id != null
          );
          const hasQuota = batchLimits.length > 0;

          const results = (await strapi.db
            .query('api::competition-result.competition-result')
            .findMany({
              where: { competition: competitionId },
              populate: {
                batch: true,
                model: { populate: { category: { populate: { batches: true } } } },
                evaluations: { populate: { criteria: true } },
              },
            })) as ResultForAllocation[];

          if (results.length === 0) return;

          const scored = results.map((result) => {
            const evaluations = result.evaluations ?? [];
            const tieBreak = computeTieBreakKey(evaluations);
            return {
              result,
              totalPoints: computeTotalPoints(evaluations, operationType),
              keyPoints: tieBreak.keyPoints,
              keyWeight: tieBreak.keyWeight,
              gradedAt: tieBreak.gradedAt,
            };
          });

          scored.sort((a, b) => {
            if (b.totalPoints !== a.totalPoints) return b.totalPoints - a.totalPoints;
            if (b.keyPoints !== a.keyPoints) return b.keyPoints - a.keyPoints;
            if (b.keyWeight !== a.keyWeight) return b.keyWeight - a.keyWeight;
            if (a.gradedAt !== b.gradedAt) return a.gradedAt - b.gradedAt;
            return a.result.id - b.result.id;
          });

          const levels = hasQuota
            ? batchLimits
                .map((entry) => ({
                  batchId: entry.batch!.id,
                  requiredValue: entry.batch?.requiredValue ?? 0,
                  capacity: (entry.limit ?? 0) > 0 ? entry.limit! : 0,
                }))
                .sort((a, b) => b.requiredValue - a.requiredValue)
            : [];

          const capacity = new Map<number, number>();
          for (const level of levels) capacity.set(level.batchId, level.capacity);

          const assignedCount = new Map<number, number>();
          const updates: ResultUpdate[] = [];

          scored.forEach((scoredEntry, index) => {
            const { result, totalPoints } = scoredEntry;

            let assignedBatchId: number | null = null;

            if (hasQuota) {
              for (const level of levels) {
                const remaining = capacity.get(level.batchId) ?? 0;
                if (totalPoints >= level.requiredValue && remaining > 0) {
                  assignedBatchId = level.batchId;
                  capacity.set(level.batchId, remaining - 1);
                  break;
                }
              }
            } else {
              let bestRequiredValue = -Infinity;
              for (const batch of result.model?.category?.batches ?? []) {
                const requiredValue = batch.requiredValue ?? 0;
                if (totalPoints >= requiredValue && requiredValue > bestRequiredValue) {
                  bestRequiredValue = requiredValue;
                  assignedBatchId = batch.id;
                }
              }
            }

            if (assignedBatchId !== null) {
              assignedCount.set(assignedBatchId, (assignedCount.get(assignedBatchId) ?? 0) + 1);
            }

            const update: ResultUpdate = { id: result.id };
            const currentBatchId = result.batch?.id ?? null;
            if (assignedBatchId !== currentBatchId) update.batch = assignedBatchId;
            if (roundToTwo(result.totalPoints ?? 0) !== totalPoints) {
              update.totalPoints = totalPoints;
            }
            if ((result.order ?? 0) !== index + 1) update.order = index + 1;

            if (Object.keys(update).length > 1) updates.push(update);
          });

          await applyResultUpdates(updates);

          if (hasQuota) {
            for (const entry of batchLimits) {
              const count = assignedCount.get(entry.batch!.id) ?? 0;
              if ((entry.assigned ?? 0) !== count) {
                await strapi.db
                  .query('competition.batch-limits')
                  .update({ where: { id: entry.id }, data: { assigned: count } });
              }
            }
          }
        });
      } finally {
        recomputeInFlight.delete(competitionId);
      }
    },

    async recomputeResult(resultId: number): Promise<void> {
      const result = (await strapi.db
        .query('api::competition-result.competition-result')
        .findOne({
          where: { id: resultId },
          populate: { competition: true },
        })) as { competition?: { id?: number } | null } | null;

      if (!result?.competition?.id) return;

      await this.recomputeCompetition(result.competition.id);
    },

    async getParticipantResults(input: {
      participantDocumentId: string;
      competitionDocumentId: string;
    }): Promise<ResultEmailLike[]> {
      const { participantDocumentId, competitionDocumentId } = input;

      return (await strapi.db
        .query('api::competition-result.competition-result')
        .findMany({
          where: {
            competition: { documentId: competitionDocumentId },
            model: { user: { documentId: participantDocumentId } },
          },
          populate: {
            competition: { populate: { activity: true } },
            model: { populate: { model: true, category: true } },
            batch: true,
            evaluations: { populate: { reviewer: { populate: { user: true } } } },
          },
        })) as ResultEmailLike[];
    },

    async sendResultEmailToParticipant(input: {
      participantDocumentId: string;
      competitionDocumentId: string;
      cc?: string;
    }): Promise<{ sentTo: string; resultsCount: number }> {
      const { participantDocumentId, competitionDocumentId, cc } = input;

      const user = (await strapi.db
        .query('plugin::users-permissions.user')
        .findOne({ where: { documentId: participantDocumentId } })) as UserLike | null;

      if (!user) {
        throw new ApplicationError('Participant user not found');
      }
      if (!user.email) {
        throw new ApplicationError('Participant user has no email');
      }

      const results = await this.getParticipantResults({
        participantDocumentId,
        competitionDocumentId,
      });

      if (results.length === 0) {
        throw new ApplicationError('The participant has no results in this competition');
      }

      const { subject, html } = buildResultEmailHtml({ user, results });
      await sendEmail({ to: user.email, cc, subject, html });

      return { sentTo: user.email, resultsCount: results.length };
    },

    async sendResultEmailsToAll(input: {
      competitionDocumentId: string;
    }): Promise<{
      total: number;
      sent: number;
      failed: number;
      errors: { participant?: string; error: string }[];
    }> {
      const { competitionDocumentId } = input;

      const results = (await strapi.db
        .query('api::competition-result.competition-result')
        .findMany({
          where: { competition: { documentId: competitionDocumentId } },
          populate: {
            competition: { populate: { activity: true } },
            model: { populate: { model: true, category: true, user: true } },
            batch: true,
            evaluations: { populate: { reviewer: { populate: { user: true } } } },
          },
        })) as ResultEmailLike[];

      const byUser = new Map<number, { user: UserLike; results: ResultEmailLike[] }>();
      for (const result of results) {
        const user = result.model?.user;
        if (!user?.email) continue;
        const key = user.id;
        if (!byUser.has(key)) {
          byUser.set(key, { user, results: [] });
        }
        byUser.get(key)!.results.push(result);
      }

      const summary: {
        total: number;
        sent: number;
        failed: number;
        errors: { participant?: string; error: string }[];
      } = { total: byUser.size, sent: 0, failed: 0, errors: [] };

      const recipients = Array.from(byUser.values());
      await mapLimit(recipients, 5, async ({ user, results: userResults }) => {
        try {
          const { subject, html } = buildResultEmailHtml({ user, results: userResults });
          await sendEmail({ to: user.email, subject, html });
          summary.sent += 1;
        } catch (error: any) {
          summary.failed += 1;
          summary.errors.push({
            participant: user.email,
            error: error?.message ?? String(error),
          });
        }
      });

      return summary;
    },
  })
);
