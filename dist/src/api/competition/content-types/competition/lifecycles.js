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
exports.default = {
    async afterUpdate(event) {
        var _a, _b, _c;
        const data = (_b = (_a = event.params) === null || _a === void 0 ? void 0 : _a.data) !== null && _b !== void 0 ? _b : {};
        if (!('batchLimits' in data))
            return;
        const competitionId = extractNumericId((_c = event.result) === null || _c === void 0 ? void 0 : _c.id);
        if (!competitionId)
            return;
        try {
            const service = strapi.service('api::competition-result.competition-result');
            await service.recomputeCompetition(competitionId);
        }
        catch (error) {
            strapi.log.error('[competition] recomputeCompetition failed', { competitionId, error });
        }
    },
};
