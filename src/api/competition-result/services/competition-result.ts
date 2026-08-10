/**
 * competition-result service
 */

import { factories } from '@strapi/strapi';

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

function roundToTwo(value: number): number {
  return Math.round(value * 100) / 100;
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
  })
);
