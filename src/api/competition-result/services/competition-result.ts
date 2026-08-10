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

type ResultWithRelations = {
  id: number;
  totalPoints?: number | null;
  batch?: { id: number } | null;
  competition?: { operationType?: 'average' | 'sum' | null } | null;
  model?: {
    category?: {
      batches?: BatchLike[] | null;
    } | null;
  } | null;
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
  criteria?: string | null;
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

function roundToTwo(value: number): number {
  return Math.round(value * 100) / 100;
}

function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function sendEmail(options: { to: string; subject: string; html: string }): Promise<unknown> {
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
          .map(
            (group) => `
            <div style="margin:10px 0;">
              <strong style="color:#4338ca;">${group.reviewerName}</strong>
              <ul style="margin:6px 0 0;padding-left:20px;">
                ${group.evaluations
                  .map(
                    (evaluation) =>
                      `<li><strong>${escapeHtml(evaluation.criteria ?? 'Criterio')}:</strong> ${escapeHtml(
                        evaluation.points
                      )} pts${evaluation.comments ? ` — ${escapeHtml(evaluation.comments)}` : ''}</li>`
                  )
                  .join('')}
              </ul>
            </div>`
          )
          .join('');
        evaluationsHtml = `
          <h4 style="margin:12px 0 4px;">Evaluaciones por juez</h4>
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
    async recomputeResult(resultId: number): Promise<void> {
      const result = (await strapi.db
        .query('api::competition-result.competition-result')
        .findOne({
          where: { id: resultId },
          populate: {
            competition: true,
            model: { populate: { category: { populate: { batches: true } } } },
            batch: true,
          },
        })) as ResultWithRelations | null;

      if (!result) return;

      const evaluations = await strapi.db
        .query('api::competition-evaluation.competition-evaluation')
        .findMany({ where: { result: resultId }, select: ['points'] });

      const rawSum = evaluations.reduce(
        (acc, evaluation) => acc + (evaluation.points ?? 0),
        0
      );
      const count = evaluations.length;

      const operationType = result.competition?.operationType ?? 'average';
      const metric =
        operationType === 'average'
          ? count > 0
            ? rawSum / count
            : 0
          : rawSum;

      let bestBatchId: number | null = null;
      let bestRequiredValue = -Infinity;

      for (const batch of result.model?.category?.batches ?? []) {
        const requiredValue = batch.requiredValue ?? 0;

        if (metric >= requiredValue && requiredValue > bestRequiredValue) {
          bestRequiredValue = requiredValue;
          bestBatchId = batch.id;
        }
      }

      const totalPoints = roundToTwo(metric);

      const data: {
        batch?: number | null;
        totalPoints?: number;
      } = {};

      if (bestBatchId !== null && result.batch?.id !== bestBatchId) {
        data.batch = bestBatchId;
      } else if (bestBatchId === null && result.batch?.id != null) {
        data.batch = null;
      }

      if (result.totalPoints !== totalPoints) {
        data.totalPoints = totalPoints;
      }

      if (Object.keys(data).length === 0) return;

      await strapi.db
        .query('api::competition-result.competition-result')
        .update({ where: { id: resultId }, data });
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
    }): Promise<{ sentTo: string; resultsCount: number }> {
      const { participantDocumentId, competitionDocumentId } = input;

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
      await sendEmail({ to: user.email, subject, html });

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

      for (const { user, results: userResults } of byUser.values()) {
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
      }

      return summary;
    },
  })
);
