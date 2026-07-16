"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const utils_1 = require("@strapi/utils");
const { ApplicationError } = utils_1.errors;
async function countAndUpdateActivity(strapi, activityDocumentId) {
    const count = await strapi
        .documents('api::activity-participant.activity-participant')
        .count({ filters: { activity: { documentId: activityDocumentId } } });
    const statuses = ['draft', 'published'];
    for (const status of statuses) {
        try {
            await strapi.documents('api::activity.activity').update({
                documentId: activityDocumentId,
                data: { participantsCount: count },
                status,
            });
        }
        catch {
            // skip if that status doesn't exist
        }
    }
}
function extractId(value) {
    if (typeof value === 'number')
        return value;
    if (typeof value === 'string') {
        const n = Number(value);
        if (!Number.isNaN(n))
            return n;
    }
    return null;
}
async function resolveActivity(strapi, activityData) {
    var _a;
    if (!activityData)
        return null;
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
        const obj = activityData;
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
            const first = obj.set[0];
            const id = extractId(first === null || first === void 0 ? void 0 : first.id);
            if (id !== null) {
                return strapi
                    .documents('api::activity.activity')
                    .findFirst({ filters: { id } });
            }
        }
        // { connect: [ { id: '8' } ] }
        if (Array.isArray(obj.connect) && obj.connect.length > 0) {
            const first = obj.connect[0];
            const id = extractId((_a = first === null || first === void 0 ? void 0 : first.id) !== null && _a !== void 0 ? _a : first === null || first === void 0 ? void 0 : first.documentId);
            if (id !== null) {
                return strapi
                    .documents('api::activity.activity')
                    .findFirst({ filters: { id } });
            }
            if (first === null || first === void 0 ? void 0 : first.documentId) {
                return strapi
                    .documents('api::activity.activity')
                    .findOne({ documentId: first.documentId });
            }
        }
    }
    return null;
}
exports.default = {
    async beforeCreate(event) {
        var _a;
        const activity = await resolveActivity(strapi, (_a = event.params.data) === null || _a === void 0 ? void 0 : _a.activity);
        if (!(activity === null || activity === void 0 ? void 0 : activity.documentId))
            return;
        if (activity.participantsCount >= activity.capacity && activity.capacity > 0) {
            throw new ApplicationError('The activity is already full');
        }
        event.state.activityDocumentId = activity.documentId;
    },
    async afterCreate(event) {
        var _a, _b;
        const activityDocumentId = (_a = event.state) === null || _a === void 0 ? void 0 : _a.activityDocumentId;
        if (!activityDocumentId) {
            const activity = await resolveActivity(strapi, (_b = event.result) === null || _b === void 0 ? void 0 : _b.activity);
            if (activity === null || activity === void 0 ? void 0 : activity.documentId) {
                return await countAndUpdateActivity(strapi, activity.documentId);
            }
            return;
        }
        await countAndUpdateActivity(strapi, activityDocumentId);
    },
    async beforeDelete(event) {
        var _a, _b;
        const where = (_a = event.params) === null || _a === void 0 ? void 0 : _a.where;
        if (!where)
            return;
        let record = null;
        if (where.documentId) {
            record = await strapi
                .documents('api::activity-participant.activity-participant')
                .findOne({ documentId: where.documentId, populate: { activity: true } });
        }
        else if (where.id) {
            record = await strapi
                .documents('api::activity-participant.activity-participant')
                .findFirst({ filters: { id: where.id }, populate: { activity: true } });
        }
        if ((_b = record === null || record === void 0 ? void 0 : record.activity) === null || _b === void 0 ? void 0 : _b.documentId) {
            event.state.activityDocumentId = record.activity.documentId;
        }
    },
    async afterDelete(event) {
        var _a;
        const activityDocumentId = (_a = event.state) === null || _a === void 0 ? void 0 : _a.activityDocumentId;
        if (!activityDocumentId)
            return;
        await countAndUpdateActivity(strapi, activityDocumentId);
    },
};
