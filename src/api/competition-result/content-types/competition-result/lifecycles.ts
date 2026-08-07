function extractNumericId(value: unknown): number | null {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const n = Number(value);
    if (!Number.isNaN(n)) return n;
  }
  return null;
}

async function assignBatch(resultId: number): Promise<void> {
  const result = await strapi.db
    .query('api::competition-result.competition-result')
    .findOne({
      where: { id: resultId },
      populate: {
        model: { populate: { category: { populate: { batches: true } } } },
        batch: true,
      },
    });

  if (!result?.model?.category) return;

  const evaluationCount = await strapi.db
    .query('api::competition-evaluation.competition-evaluation')
    .count({ where: { result: resultId } });

  const totalPoints = result.totalPoints ?? 0;

  let bestBatchId: number | null = null;
  let bestRequiredValue = -Infinity;

  for (const batch of result.model.category.batches ?? []) {
    const requiredValue = batch.requiredValue ?? 0;
    const operationType = batch.operationType ?? 'average';
    const metric =
      operationType === 'average'
        ? evaluationCount > 0
          ? totalPoints / evaluationCount
          : 0
        : totalPoints;

    if (metric >= requiredValue && requiredValue > bestRequiredValue) {
      bestRequiredValue = requiredValue;
      bestBatchId = batch.id;
    }
  }

  if (!bestBatchId) return;
  if (result.batch?.id === bestBatchId) return;

  await strapi.db
    .query('api::competition-result.competition-result')
    .update({ where: { id: resultId }, data: { batch: bestBatchId } });
}

export default {
  async afterUpdate(event: any) {
    const resultId = extractNumericId(event.result?.id);
    if (!resultId) return;

    await assignBatch(resultId);
  },
};
