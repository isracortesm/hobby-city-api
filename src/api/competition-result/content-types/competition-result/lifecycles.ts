import { ConflictError } from '../../../../utils/http-errors';

function extractNumericId(value: unknown): number | null {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const n = Number(value);
    if (!Number.isNaN(n)) return n;
  }
  return null;
}

function extractRelationValue(value: unknown): unknown {
  if (!value || typeof value !== 'object') return value;
  const obj = value as Record<string, unknown>;
  if (Array.isArray(obj.connect) && obj.connect.length > 0) return obj.connect[0];
  if (Array.isArray(obj.set) && obj.set.length > 0) return obj.set[0];
  if ('id' in obj) return obj.id;
  if ('documentId' in obj) return obj.documentId;
  return value;
}

async function resolveNumericId(uid: string, value: unknown): Promise<number | null> {
  const v = extractRelationValue(value);
  if (v == null) return null;
  if (typeof v === 'number') return v;
  if (typeof v === 'string') {
    const asNumber = Number(v);
    if (!Number.isNaN(asNumber)) return asNumber;
    const record = await strapi.db
      .query(uid)
      .findOne({ where: { documentId: v }, select: ['id'] });
    return record?.id ?? null;
  }
  return null;
}

export default {
  async beforeCreate(event: any) {
    const data = event.params?.data ?? {};

    const competitionId = await resolveNumericId(
      'api::competition.competition',
      data.competition
    );
    const modelId = await resolveNumericId('api::competition-model.competition-model', data.model);
    if (!competitionId || !modelId) return;

    let exists = false;
    await strapi.db.transaction(async ({ trx }) => {
      await trx.raw('SELECT pg_advisory_xact_lock(?)', [competitionId]);
      const found = await strapi.db
        .query('api::competition-result.competition-result')
        .findOne({ where: { competition: competitionId, model: modelId }, select: ['id'] });
      exists = !!found;
    });

    if (exists) {
      throw new ConflictError('A result already exists for this competition and model');
    }
  },

  async afterUpdate(event: any) {
    const resultId = extractNumericId(event.result?.id);
    if (!resultId) return;

    try {
      const service = strapi.service('api::competition-result.competition-result') as {
        recomputeResult: (resultId: number) => Promise<void>;
      };

      await service.recomputeResult(resultId);
    } catch (error) {
      strapi.log.error('[competition-result] recomputeResult failed', { resultId, error });
    }
  },
};
