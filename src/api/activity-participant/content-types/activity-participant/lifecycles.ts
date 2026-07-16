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
    console.log(where)
    if (!where) return;

    let record: any = null;

    if (where.documentId) {
      record = await strapi
        .documents('api::activity-participant.activity-participant')
        .findOne({ documentId: where.documentId, populate: { activity: true } });
    } else if (where.id) {
      record = await strapi
        .documents('api::activity-participant.activity-participant')
        .findFirst({ filters: { id: where.id }, populate: { activity: true } });
    }

    console.log(record)
    if (record?.activity?.documentId) {
      event.state.activityDocumentId = record.activity.documentId;
    }
  },

  async afterDelete(event: any) {
    const activityDocumentId = event.state?.activityDocumentId;
    console.log(activityDocumentId)
    if (!activityDocumentId) return;

    await countAndUpdateActivity(strapi, activityDocumentId);
  },
};
