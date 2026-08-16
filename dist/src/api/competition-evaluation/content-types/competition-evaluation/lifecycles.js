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
async function getResultIdFromEvaluation(evaluationId) {
    var _a, _b;
    const evaluation = await strapi.db
        .query('api::competition-evaluation.competition-evaluation')
        .findOne({ where: { id: evaluationId }, populate: { result: true } });
    return (_b = (_a = evaluation === null || evaluation === void 0 ? void 0 : evaluation.result) === null || _a === void 0 ? void 0 : _a.id) !== null && _b !== void 0 ? _b : null;
}
async function recomputeResult(resultId) {
    try {
        const service = strapi.service('api::competition-result.competition-result');
        await service.recomputeResult(resultId);
    }
    catch (error) {
        strapi.log.error('[competition-evaluation] recomputeResult failed', { resultId, error });
    }
}
exports.default = {
    async beforeCreate(event) {
        var _a, _b;
        const data = (_b = (_a = event.params) === null || _a === void 0 ? void 0 : _a.data) !== null && _b !== void 0 ? _b : {};
        const resultId = await resolveNumericId('api::competition-result.competition-result', data.result);
        const reviewerId = await resolveNumericId('api::activity-collaborator.activity-collaborator', data.reviewer);
        const criteriaId = await resolveNumericId('api::competition-criteria.competition-criteria', data.criteria);
        if (!resultId || !reviewerId || !criteriaId)
            return;
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
            throw new http_errors_1.ConflictError('An evaluation already exists for this reviewer and criteria');
        }
    },
    async afterCreate(event) {
        var _a;
        const evaluationId = extractNumericId((_a = event.result) === null || _a === void 0 ? void 0 : _a.id);
        if (!evaluationId)
            return;
        const resultId = await getResultIdFromEvaluation(evaluationId);
        if (resultId) {
            await recomputeResult(resultId);
        }
    },
    async afterUpdate(event) {
        var _a;
        const evaluationId = extractNumericId((_a = event.result) === null || _a === void 0 ? void 0 : _a.id);
        if (!evaluationId)
            return;
        const resultId = await getResultIdFromEvaluation(evaluationId);
        if (resultId) {
            await recomputeResult(resultId);
        }
    },
    async beforeDelete(event) {
        var _a, _b;
        const where = (_a = event.params) === null || _a === void 0 ? void 0 : _a.where;
        if (!where)
            return;
        const record = await strapi.db
            .query('api::competition-evaluation.competition-evaluation')
            .findOne({ where, populate: { result: true } });
        if ((_b = record === null || record === void 0 ? void 0 : record.result) === null || _b === void 0 ? void 0 : _b.id) {
            event.state.resultId = record.result.id;
        }
    },
    async afterDelete(event) {
        var _a;
        const { resultId } = (_a = event.state) !== null && _a !== void 0 ? _a : {};
        if (!resultId)
            return;
        await recomputeResult(resultId);
    },
};
