import { errors } from '@strapi/utils';

const { ApplicationError } = errors;

async function countAndUpdateActivity(
  strapi: any,
  activityDocumentId: string,
) {
  const count = await strapi
    .documents('api::activity-participant.activity-participant')
    .count({ filters: { activity: { documentId: activityDocumentId } } });

  const statuses = ['draft', 'published'] as const;
  for (const status of statuses) {
    try {
      await strapi.documents('api::activity.activity').update({
        documentId: activityDocumentId,
        data: { participantsCount: count },
        status,
      });
    } catch {
      // skip if that status doesn't exist
    }
  }
}

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

export default {
  async beforeCreate(event: any) {
    const relationData = event.params.data?.activity;
    const activityId = extractIdFromRelation(relationData);
    if (!activityId) return;

    const activity = await strapi
      .documents('api::activity.activity')
      .findFirst({ filters: { id: activityId }, status: 'published' });

    if (!activity) {
      throw new ApplicationError('The activity is not published yet');
    }

    if (activity.participantsCount >= activity.capacity && activity.capacity > 0) {
      throw new ApplicationError('The activity is already full');
    }

    event.state.activityDocumentId = activity.documentId;
  },

  async afterCreate(event: any) {
    const activityDocumentId = event.state?.activityDocumentId;
    if (!activityDocumentId) return;

    await countAndUpdateActivity(strapi, activityDocumentId);
  },

  async beforeDelete(event: any) {
  const where = event.params?.where;
  if (!where) return;

  // 1. Obtenemos el registro usando el Query Engine de Strapi.
  // Acepta tanto id numérico como documentId en el objeto 'where' de forma nativa.
  const record = await strapi.db
    .query('api::activity-participant.activity-participant')
    .findOne({
      where: where,
      populate: { activity: true } // El Query Engine sí hace el JOIN directo en BD sin pasar por la lógica i18n/draft de v5
    });

  // 2. Si encontró el participante y tiene una actividad vinculada, guardamos su documentId
  if (record?.activity?.documentId) {
    event.state.activityDocumentId = record.activity.documentId;
  }
},

  async afterDelete(event: any) {
    const activityDocumentId = event.state?.activityDocumentId;
    if (!activityDocumentId) return;

    await countAndUpdateActivity(strapi, activityDocumentId);
  },
};
