function extractNumericId(value: unknown): number | null {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const n = Number(value);
    if (!Number.isNaN(n)) return n;
  }
  return null;
}

async function getResultIdFromEvaluation(evaluationId: number): Promise<number | null> {
  const evaluation = await strapi.db
    .query('api::competition-evaluation.competition-evaluation')
    .findOne({ where: { id: evaluationId }, populate: { result: true } });

  return evaluation?.result?.id ?? null;
}

async function recomputeResult(resultId: number): Promise<void> {
  const service = strapi.service('api::competition-result.competition-result') as {
    recomputeResult: (resultId: number) => Promise<void>;
  };

  await service.recomputeResult(resultId);
}

export default {
  async afterCreate(event: any) {
    const evaluationId = extractNumericId(event.result?.id);
    if (!evaluationId) return;

    const resultId = await getResultIdFromEvaluation(evaluationId);
    if (resultId) {
      await recomputeResult(resultId);
    }
  },

  async afterUpdate(event: any) {
    const evaluationId = extractNumericId(event.result?.id);
    if (!evaluationId) return;

    const resultId = await getResultIdFromEvaluation(evaluationId);
    if (resultId) {
      await recomputeResult(resultId);
    }
  },

  async beforeDelete(event: any) {
    const where = event.params?.where;
    if (!where) return;

    const record = await strapi.db
      .query('api::competition-evaluation.competition-evaluation')
      .findOne({ where, populate: { result: true } });

    if (record?.result?.id) {
      event.state.resultId = record.result.id;
    }
  },

  async afterDelete(event: any) {
    const { resultId } = event.state ?? {};
    if (!resultId) return;

    await recomputeResult(resultId);
  },
};
