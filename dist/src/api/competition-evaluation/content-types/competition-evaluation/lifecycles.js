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
async function recalcResultTotalPoints(resultId) {
    const result = await strapi.db
        .query('api::competition-result.competition-result')
        .findOne({ where: { id: resultId } });
    if (!result)
        return;
    const evaluations = await strapi.db
        .query('api::competition-evaluation.competition-evaluation')
        .findMany({ where: { result: resultId }, select: ['points'] });
    const totalPoints = evaluations.reduce((acc, evaluation) => { var _a; return acc + ((_a = evaluation.points) !== null && _a !== void 0 ? _a : 0); }, 0);
    await strapi.db
        .query('api::competition-result.competition-result')
        .update({ where: { id: resultId }, data: { totalPoints } });
}
exports.default = {
    async afterCreate(event) {
        var _a;
        const resultId = extractIdFromRelation((_a = event.result) === null || _a === void 0 ? void 0 : _a.result);
        if (resultId) {
            await recalcResultTotalPoints(resultId);
        }
    },
    async afterUpdate(event) {
        var _a;
        const resultId = extractIdFromRelation((_a = event.result) === null || _a === void 0 ? void 0 : _a.result);
        if (resultId) {
            await recalcResultTotalPoints(resultId);
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
        await recalcResultTotalPoints(resultId);
    },
};
