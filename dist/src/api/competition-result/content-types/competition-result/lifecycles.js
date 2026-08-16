"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const http_errors_1 = require("../../../../utils/http-errors");
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
function extractRelationValue(value) {
    if (!value || typeof value !== 'object')
        return value;
    const obj = value;
    if (Array.isArray(obj.connect) && obj.connect.length > 0)
        return obj.connect[0];
    if (Array.isArray(obj.set) && obj.set.length > 0)
        return obj.set[0];
    if ('id' in obj)
        return obj.id;
    if ('documentId' in obj)
        return obj.documentId;
    return value;
}
async function resolveNumericId(uid, value) {
    var _a;
    const v = extractRelationValue(value);
    if (v == null)
        return null;
    if (typeof v === 'number')
        return v;
    if (typeof v === 'string') {
        const asNumber = Number(v);
        if (!Number.isNaN(asNumber))
            return asNumber;
        const record = await strapi.db
            .query(uid)
            .findOne({ where: { documentId: v }, select: ['id'] });
        return (_a = record === null || record === void 0 ? void 0 : record.id) !== null && _a !== void 0 ? _a : null;
    }
    return null;
}
exports.default = {
    async beforeCreate(event) {
        var _a, _b;
        const data = (_b = (_a = event.params) === null || _a === void 0 ? void 0 : _a.data) !== null && _b !== void 0 ? _b : {};
        const competitionId = await resolveNumericId('api::competition.competition', data.competition);
        const modelId = await resolveNumericId('api::competition-model.competition-model', data.model);
        if (!competitionId || !modelId)
            return;
        let exists = false;
        await strapi.db.transaction(async ({ trx }) => {
            await trx.raw('SELECT pg_advisory_xact_lock(?)', [competitionId]);
            const found = await strapi.db
                .query('api::competition-result.competition-result')
                .findOne({ where: { competition: competitionId, model: modelId }, select: ['id'] });
            exists = !!found;
        });
        if (exists) {
            throw new http_errors_1.ConflictError('A result already exists for this competition and model');
        }
    },
    async afterUpdate(event) {
        var _a;
        const resultId = extractNumericId((_a = event.result) === null || _a === void 0 ? void 0 : _a.id);
        if (!resultId)
            return;
        try {
            const service = strapi.service('api::competition-result.competition-result');
            await service.recomputeResult(resultId);
        }
        catch (error) {
            strapi.log.error('[competition-result] recomputeResult failed', { resultId, error });
        }
    },
};
