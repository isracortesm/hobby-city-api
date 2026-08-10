"use strict";
/**
 * competition-result service
 */
Object.defineProperty(exports, "__esModule", { value: true });
const strapi_1 = require("@strapi/strapi");
function roundToTwo(value) {
    return Math.round(value * 100) / 100;
}
exports.default = strapi_1.factories.createCoreService('api::competition-result.competition-result', ({ strapi }) => ({
    async recomputeResult(resultId) {
        var _a, _b, _c, _d, _e, _f, _g, _h;
        const result = (await strapi.db
            .query('api::competition-result.competition-result')
            .findOne({
            where: { id: resultId },
            populate: {
                competition: true,
                model: { populate: { category: { populate: { batches: true } } } },
                batch: true,
            },
        }));
        if (!result)
            return;
        const evaluations = await strapi.db
            .query('api::competition-evaluation.competition-evaluation')
            .findMany({ where: { result: resultId }, select: ['points'] });
        const rawSum = evaluations.reduce((acc, evaluation) => { var _a; return acc + ((_a = evaluation.points) !== null && _a !== void 0 ? _a : 0); }, 0);
        const count = evaluations.length;
        const operationType = (_b = (_a = result.competition) === null || _a === void 0 ? void 0 : _a.operationType) !== null && _b !== void 0 ? _b : 'average';
        const metric = operationType === 'average'
            ? count > 0
                ? rawSum / count
                : 0
            : rawSum;
        let bestBatchId = null;
        let bestRequiredValue = -Infinity;
        for (const batch of (_e = (_d = (_c = result.model) === null || _c === void 0 ? void 0 : _c.category) === null || _d === void 0 ? void 0 : _d.batches) !== null && _e !== void 0 ? _e : []) {
            const requiredValue = (_f = batch.requiredValue) !== null && _f !== void 0 ? _f : 0;
            if (metric >= requiredValue && requiredValue > bestRequiredValue) {
                bestRequiredValue = requiredValue;
                bestBatchId = batch.id;
            }
        }
        const totalPoints = roundToTwo(metric);
        const data = {};
        if (bestBatchId !== null && ((_g = result.batch) === null || _g === void 0 ? void 0 : _g.id) !== bestBatchId) {
            data.batch = bestBatchId;
        }
        else if (bestBatchId === null && ((_h = result.batch) === null || _h === void 0 ? void 0 : _h.id) != null) {
            data.batch = null;
        }
        if (result.totalPoints !== totalPoints) {
            data.totalPoints = totalPoints;
        }
        if (Object.keys(data).length === 0)
            return;
        await strapi.db
            .query('api::competition-result.competition-result')
            .update({ where: { id: resultId }, data });
    },
}));
