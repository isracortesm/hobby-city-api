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
        var _a;
        const resultId = extractNumericId((_a = event.result) === null || _a === void 0 ? void 0 : _a.id);
        if (!resultId)
            return;
        const service = strapi.service('api::competition-result.competition-result');
        await service.recomputeResult(resultId);
    },
};
