"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
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
async function getResultIdFromEvaluation(evaluationId) {
    var _a, _b;
    const evaluation = await strapi.db
        .query('api::competition-evaluation.competition-evaluation')
        .findOne({ where: { id: evaluationId }, populate: { result: true } });
    return (_b = (_a = evaluation === null || evaluation === void 0 ? void 0 : evaluation.result) === null || _a === void 0 ? void 0 : _a.id) !== null && _b !== void 0 ? _b : null;
}
async function recomputeResult(resultId) {
    const service = strapi.service('api::competition-result.competition-result');
    await service.recomputeResult(resultId);
}
exports.default = {
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
