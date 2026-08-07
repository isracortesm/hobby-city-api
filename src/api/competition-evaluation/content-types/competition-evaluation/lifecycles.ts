function extractNumericId(value: unknown): number | null {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const n = Number(value);
    if (!Number.isNaN(n)) return n;
  }
  return null;
}

function extractIdFromRelation(data: unknown): number | null {
  if (!data || typeof data !== 'object') return null;
  const obj = data as Record<string, unknown>;

  if (Array.isArray(obj.set) && obj.set.length > 0) {
    return extractNumericId((obj.set[0] as Record<string, unknown>)?.id);
  }

  if (Array.isArray(obj.connect) && obj.connect.length > 0) {
    return extractNumericId((obj.connect[0] as Record<string, unknown>)?.id);
  }

  if ('id' in obj) {
    return extractNumericId(obj.id);
  }

  return extractNumericId(data);
}

async function recalcResultTotalPoints(resultId: number): Promise<void> {
  const result = await strapi.db
    .query('api::competition-result.competition-result')
    .findOne({ where: { id: resultId } });

  if (!result) return;

  const evaluations = await strapi.db
    .query('api::competition-evaluation.competition-evaluation')
    .findMany({ where: { result: resultId }, select: ['points'] });

  const totalPoints = evaluations.reduce(
    (acc, evaluation) => acc + (evaluation.points ?? 0),
    0
  );

  await strapi.db
    .query('api::competition-result.competition-result')
    .update({ where: { id: resultId }, data: { totalPoints } });
}

export default {
  async afterCreate(event: any) {
    const resultId = extractIdFromRelation(event.result?.result);
    if (resultId) {
      await recalcResultTotalPoints(resultId);
    }
  },

  async afterUpdate(event: any) {
    const resultId = extractIdFromRelation(event.result?.result);
    if (resultId) {
      await recalcResultTotalPoints(resultId);
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

    await recalcResultTotalPoints(resultId);
  },
};
