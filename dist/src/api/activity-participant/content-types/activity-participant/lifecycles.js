"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const utils_1 = require("@strapi/utils");
const { ApplicationError } = utils_1.errors;
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
        const activity = await strapi.db
            .query('api::activity.activity')
            .findOne({ where: { id: activityId } });
        if (!activity) {
            throw new ApplicationError('Activity not found');
        }
        if (!activity.publishedAt) {
            throw new ApplicationError('The activity is not published yet');
        }
        // Incremento atómico con guarda de capacidad (una sola sentencia => sin carreras).
        // Con capacity = 0 la actividad es ilimitada. Corre dentro de la transacción del
        // create (rollback automático si el participante no llega a insertarse).
        const affected = await strapi.db.transaction(async ({ trx }) => trx('activities')
            .where({ id: activityId })
            .whereRaw('(capacity = 0 OR participants_count < capacity)')
            .increment('participants_count', 1));
        if (affected === 0) {
            throw new ApplicationError('The activity is already full');
        }
        event.state.activityId = activityId;
        event.state.activityDocumentId = activity.documentId;
    },
    async beforeDelete(event) {
        var _a, _b;
        const where = (_a = event.params) === null || _a === void 0 ? void 0 : _a.where;
        if (!where)
            return;
        const record = await strapi.db
            .query('api::activity-participant.activity-participant')
            .findOne({ where, populate: { activity: true } });
        if ((_b = record === null || record === void 0 ? void 0 : record.activity) === null || _b === void 0 ? void 0 : _b.documentId) {
            event.state.activityId = record.activity.id;
            event.state.activityDocumentId = record.activity.documentId;
        }
    },
    async afterDelete(event) {
        var _a;
        const { activityId } = (_a = event.state) !== null && _a !== void 0 ? _a : {};
        if (!activityId)
            return;
        // Decremento atómico (no puede bajar de 0), dentro de la transacción del delete.
        await strapi.db.transaction(async ({ trx }) => trx('activities')
            .where({ id: activityId })
            .whereRaw('participants_count > 0')
            .decrement('participants_count', 1));
    },
};
