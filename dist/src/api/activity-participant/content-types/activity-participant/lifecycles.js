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
function extractNumericId(value) {
    if (typeof value === 'number')
        return value;
    if (typeof value === 'string') {
        const n = Number(value);
        if (!Number.isNaN(n))
            return n;
    }
    return null;
}
function extractIdFromRelation(data) {
    var _a, _b;
    if (!data || typeof data !== 'object')
        return null;
    const obj = data;
    if (Array.isArray(obj.set) && obj.set.length > 0) {
        return extractNumericId((_a = obj.set[0]) === null || _a === void 0 ? void 0 : _a.id);
    }
    if (Array.isArray(obj.connect) && obj.connect.length > 0) {
        return extractNumericId((_b = obj.connect[0]) === null || _b === void 0 ? void 0 : _b.id);
    }
    if ('id' in obj) {
        return extractNumericId(obj.id);
    }
    return extractNumericId(data);
}
exports.default = {
    async beforeCreate(event) {
        var _a;
        const relationData = (_a = event.params.data) === null || _a === void 0 ? void 0 : _a.activity;
        const activityId = extractIdFromRelation(relationData);
        if (!activityId)
            return;
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
    async afterCreate(event) {
        var _a;
        const activityDocumentId = (_a = event.state) === null || _a === void 0 ? void 0 : _a.activityDocumentId;
        if (!activityDocumentId)
            return;
        await countAndUpdateActivity(strapi, activityDocumentId);
    },
    async beforeDelete(event) {
        var _a, _b;
        const where = (_a = event.params) === null || _a === void 0 ? void 0 : _a.where;
        if (!where)
            return;
        // 1. Obtenemos el registro usando el Query Engine de Strapi.
        // Acepta tanto id numérico como documentId en el objeto 'where' de forma nativa.
        const record = await strapi.db
            .query('api::activity-participant.activity-participant')
            .findOne({
            where: where,
            populate: { activity: true } // El Query Engine sí hace el JOIN directo en BD sin pasar por la lógica i18n/draft de v5
        });
        // 2. Si encontró el participante y tiene una actividad vinculada, guardamos su documentId
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
