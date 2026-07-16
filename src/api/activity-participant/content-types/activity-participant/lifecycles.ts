import { errors } from '@strapi/utils';

const { ApplicationError } = errors;

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

    const activity = await strapi.db
      .query('api::activity.activity')
      .findOne({ where: { id: activityId } });

    if (!activity) {
      throw new ApplicationError('Activity not found');
    }

    if (!activity.publishedAt) {
      throw new ApplicationError('The activity is not published yet');
    }

    if (activity.participantsCount >= activity.capacity && activity.capacity > 0) {
      throw new ApplicationError('The activity is already full');
    }

    event.state.activityId = activityId;
    event.state.activityDocumentId = activity.documentId;
  },

  async afterCreate(event: any) {
    const { activityId, activityDocumentId } = event.state ?? {};
    if (!activityId || !activityDocumentId) return;

    const count = await strapi.db
      .query('api::activity-participant.activity-participant')
      .count({ where: { activity: activityId } });

    for (const status of ['draft', 'published'] as const) {
      try {
        await strapi.documents('api::activity.activity').update({
          documentId: activityDocumentId,
          data: { participantsCount: count },
          status,
        });
      } catch { /* skip if status doesn't exist */ }
    }
  },

  async beforeDelete(event: any) {
    const where = event.params?.where;
    if (!where) return;

    const record = await strapi.db
      .query('api::activity-participant.activity-participant')
      .findOne({ where, populate: { activity: true } });

    if (record?.activity?.documentId) {
      event.state.activityId = record.activity.id;
      event.state.activityDocumentId = record.activity.documentId;
    }
  },

  async afterDelete(event: any) {
    const { activityId, activityDocumentId } = event.state ?? {};
    if (!activityId || !activityDocumentId) return;

    const count = await strapi.db
      .query('api::activity-participant.activity-participant')
      .count({ where: { activity: activityId } });

    for (const status of ['draft', 'published'] as const) {
      try {
        await strapi.documents('api::activity.activity').update({
          documentId: activityDocumentId,
          data: { participantsCount: count },
          status,
        });
      } catch { /* skip if status doesn't exist */ }
    }
  },
};
