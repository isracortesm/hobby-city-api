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

async function getResultIdFromEvaluation(evaluationId: number): Promise<number | null> {
  const evaluation = await strapi.db
    .query('api::competition-evaluation.competition-evaluation')
    .findOne({ where: { id: evaluationId }, populate: { result: true } });

  return evaluation?.result?.id ?? null;
}

async function recomputeResult(resultId: number): Promise<void> {
  try {
    const service = strapi.service('api::competition-result.competition-result') as {
      recomputeResult: (resultId: number) => Promise<void>;
    };

    await service.recomputeResult(resultId);
  } catch (error) {
    strapi.log.error('[competition-evaluation] recomputeResult failed', { resultId, error });
  }
}

export default {
  async beforeCreate(event: any) {
    const data = event.params?.data ?? {};

    const resultId = await resolveNumericId(
      'api::competition-result.competition-result',
      data.result
    );
    const reviewerId = await resolveNumericId(
      'api::activity-collaborator.activity-collaborator',
      data.reviewer
    );
    const criteriaId = await resolveNumericId(
      'api::competition-criteria.competition-criteria',
      data.criteria
    );
    if (!resultId || !reviewerId || !criteriaId) return;

    let exists = false;
    await strapi.db.transaction(async ({ trx }) => {
      await trx.raw('SELECT pg_advisory_xact_lock(?)', [resultId]);
      const found = await strapi.db
        .query('api::competition-evaluation.competition-evaluation')
        .findOne({
          where: { result: resultId, reviewer: reviewerId, criteria: criteriaId },
          select: ['id'],
        });
      exists = !!found;
    });

    if (exists) {
      throw new ConflictError('An evaluation already exists for this reviewer and criteria');
    }
  },

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
