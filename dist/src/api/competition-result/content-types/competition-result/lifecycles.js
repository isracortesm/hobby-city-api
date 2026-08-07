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
async function assignBatch(resultId) {
    var _a, _b, _c, _d, _e, _f;
    const result = await strapi.db
        .query('api::competition-result.competition-result')
        .findOne({
        where: { id: resultId },
        populate: {
            model: { populate: { category: { populate: { batches: true } } } },
            batch: true,
        },
    });
    if (!((_a = result === null || result === void 0 ? void 0 : result.model) === null || _a === void 0 ? void 0 : _a.category))
        return;
    const evaluationCount = await strapi.db
        .query('api::competition-evaluation.competition-evaluation')
        .count({ where: { result: resultId } });
    const totalPoints = (_b = result.totalPoints) !== null && _b !== void 0 ? _b : 0;
    let bestBatchId = null;
    let bestRequiredValue = -Infinity;
    for (const batch of (_c = result.model.category.batches) !== null && _c !== void 0 ? _c : []) {
        const requiredValue = (_d = batch.requiredValue) !== null && _d !== void 0 ? _d : 0;
        const operationType = (_e = batch.operationType) !== null && _e !== void 0 ? _e : 'average';
        const metric = operationType === 'average'
            ? evaluationCount > 0
                ? totalPoints / evaluationCount
                : 0
            : totalPoints;
        if (metric >= requiredValue && requiredValue > bestRequiredValue) {
            bestRequiredValue = requiredValue;
            bestBatchId = batch.id;
        }
    }
    if (!bestBatchId)
        return;
    if (((_f = result.batch) === null || _f === void 0 ? void 0 : _f.id) === bestBatchId)
        return;
    await strapi.db
        .query('api::competition-result.competition-result')
        .update({ where: { id: resultId }, data: { batch: bestBatchId } });
}
exports.default = {
    async afterUpdate(event) {
        var _a;
        const resultId = extractNumericId((_a = event.result) === null || _a === void 0 ? void 0 : _a.id);
        if (!resultId)
            return;
        await assignBatch(resultId);
    },
};
