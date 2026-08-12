"use strict";
/**
 * competition-result controller
 */
Object.defineProperty(exports, "__esModule", { value: true });
const strapi_1 = require("@strapi/strapi");
const utils_1 = require("@strapi/utils");
const { ValidationError } = utils_1.errors;
function readBody(ctx) {
    var _a, _b, _c;
    const body = (_b = (_a = ctx.request) === null || _a === void 0 ? void 0 : _a.body) !== null && _b !== void 0 ? _b : {};
    return (_c = body === null || body === void 0 ? void 0 : body.data) !== null && _c !== void 0 ? _c : body;
}
exports.default = strapi_1.factories.createCoreController('api::competition-result.competition-result', ({ strapi }) => ({
    async sendResultEmail(ctx) {
        const body = readBody(ctx);
        const participant = body.participant;
        const competition = body.competition;
        if (!participant) {
            throw new ValidationError('Missing "participant" (user documentId) in the request body');
        }
        if (!competition) {
            throw new ValidationError('Missing "competition" (competition documentId) in the request body');
        }
        const service = strapi.service('api::competition-result.competition-result');
        const result = await service.sendResultEmailToParticipant({
            participantDocumentId: participant,
            competitionDocumentId: competition,
        });
        ctx.body = { data: result };
    },
    async sendResultEmailsToAll(ctx) {
        const body = readBody(ctx);
        const competition = body.competition;
        if (!competition) {
            throw new ValidationError('Missing "competition" (competition documentId) in the request body');
        }
        const service = strapi.service('api::competition-result.competition-result');
        const result = await service.sendResultEmailsToAll({
            competitionDocumentId: competition,
        });
        ctx.body = { data: result };
    },
}));
