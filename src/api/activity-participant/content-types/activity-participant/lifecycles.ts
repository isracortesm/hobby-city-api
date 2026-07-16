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

function extractId(value: unknown): number | null {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const n = Number(value);
    if (!Number.isNaN(n)) return n;
  }
  return null;
}

async function resolveActivity(
  strapi: any,
  activityData: unknown,
): Promise<any> {
  if (!activityData) return null;

  // direct id or documentId string
  if (typeof activityData === 'string') {
    const id = extractId(activityData);
    if (id !== null) {
      return strapi
        .documents('api::activity.activity')
        .findFirst({ filters: { id } });
    }
    return strapi
      .documents('api::activity.activity')
      .findOne({ documentId: activityData });
  }

  // direct numeric id
  if (typeof activityData === 'number') {
    return strapi
      .documents('api::activity.activity')
      .findFirst({ filters: { id: activityData } });
  }

  if (typeof activityData === 'object' && activityData !== null) {
    const obj = activityData as Record<string, unknown>;

    // { id: 8 } or { id: '8' }
    if (obj.id) {
      const id = extractId(obj.id);
      if (id !== null) {
        return strapi
          .documents('api::activity.activity')
          .findFirst({ filters: { id } });
      }
    }

    // { documentId: 'abc' }
    if (typeof obj.documentId === 'string') {
      return strapi
        .documents('api::activity.activity')
        .findOne({ documentId: obj.documentId });
    }

    // { set: [ { id: '8' } ] } — query engine lifecycle format
    if (Array.isArray(obj.set) && obj.set.length > 0) {
      const first = obj.set[0] as Record<string, unknown>;
      const id = extractId(first?.id);
      if (id !== null) {
        return strapi
          .documents('api::activity.activity')
          .findFirst({ filters: { id } });
      }
    }

    // { connect: [ { id: '8' } ] }
    if (Array.isArray(obj.connect) && obj.connect.length > 0) {
      const first = obj.connect[0] as Record<string, unknown>;
      const id = extractId(first?.id ?? first?.documentId);
      if (id !== null) {
        return strapi
          .documents('api::activity.activity')
          .findFirst({ filters: { id } });
      }
      if (first?.documentId) {
        return strapi
          .documents('api::activity.activity')
          .findOne({ documentId: first.documentId as string });
      }
    }
  }

  return null;
}

export default {
  async beforeCreate(event: any) {
    const activity = await resolveActivity(strapi, event.params.data?.activity);
    if (!activity?.documentId) return;

    if (activity.participantsCount >= activity.capacity && activity.capacity > 0) {
      throw new ApplicationError('The activity is already full');
    }

    event.state.activityDocumentId = activity.documentId;
  },

  async afterCreate(event: any) {
    const activityDocumentId =
      event.state?.activityDocumentId;

    if (!activityDocumentId) {
      const activity = await resolveActivity(strapi, event.result?.activity);
      if (activity?.documentId) {
        return await countAndUpdateActivity(strapi, activity.documentId);
      }
      return;
    }

    await countAndUpdateActivity(strapi, activityDocumentId);
  },

  async beforeDelete(event: any) {
    const where = event.params?.where;
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
