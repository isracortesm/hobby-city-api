"use strict";
/**
 * competition-result service
 */
Object.defineProperty(exports, "__esModule", { value: true });
const strapi_1 = require("@strapi/strapi");
const utils_1 = require("@strapi/utils");
const { ApplicationError } = utils_1.errors;
const PODIUM_BATCHES = new Set(['gold', 'silver', 'bronce']);
function roundToTwo(value) {
    return Math.round(value * 100) / 100;
}
function escapeHtml(value) {
    return String(value !== null && value !== void 0 ? value : '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}
function sendEmail(options) {
    return strapi.plugin('email').service('email').send(options);
}
function buildResultEmailHtml(input) {
    var _a, _b, _c, _d, _e, _f;
    const { user, results } = input;
    const username = escapeHtml((_b = (_a = user.username) !== null && _a !== void 0 ? _a : user.email) !== null && _b !== void 0 ? _b : 'Participante');
    const competitionName = escapeHtml((_f = (_e = (_d = (_c = results[0]) === null || _c === void 0 ? void 0 : _c.competition) === null || _d === void 0 ? void 0 : _d.activity) === null || _e === void 0 ? void 0 : _e.name) !== null && _f !== void 0 ? _f : 'Competencia');
    const resultsHtml = results
        .map((result) => {
        var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q, _r, _s, _t, _u, _v, _w, _x, _y, _z, _0;
        const modelName = escapeHtml((_c = (_b = (_a = result.model) === null || _a === void 0 ? void 0 : _a.model) === null || _b === void 0 ? void 0 : _b.name) !== null && _c !== void 0 ? _c : 'Modelo');
        const categoryName = escapeHtml((_f = (_e = (_d = result.model) === null || _d === void 0 ? void 0 : _d.category) === null || _e === void 0 ? void 0 : _e.name) !== null && _f !== void 0 ? _f : '');
        const totalPoints = (_g = result.totalPoints) !== null && _g !== void 0 ? _g : 0;
        const order = (_h = result.order) !== null && _h !== void 0 ? _h : 0;
        const batchEnum = (_k = (_j = result.batch) === null || _j === void 0 ? void 0 : _j.batch) !== null && _k !== void 0 ? _k : null;
        const batchName = escapeHtml((_o = (_m = (_l = result.batch) === null || _l === void 0 ? void 0 : _l.batchName) !== null && _m !== void 0 ? _m : batchEnum) !== null && _o !== void 0 ? _o : '');
        const isPodium = batchEnum !== null && PODIUM_BATCHES.has(batchEnum);
        const modelImage = (_r = (_q = (_p = result.model) === null || _p === void 0 ? void 0 : _p.model) === null || _q === void 0 ? void 0 : _q.image) === null || _r === void 0 ? void 0 : _r.url;
        const imageHtml = modelImage
            ? `<img src="${escapeHtml(modelImage)}" alt="${modelName}" style="max-width:120px;border-radius:8px;margin:8px 0;" />`
            : '';
        let batchHtml = '';
        if (isPodium) {
            batchHtml = `<p style="color:#16a34a;font-weight:600;">🎉 ¡Felicidades! Tu modelo obtuvo <strong>${batchName}</strong>.</p>`;
        }
        else if (batchName) {
            batchHtml = `<p><strong>Batch:</strong> ${batchName}</p>`;
        }
        const evaluations = (_s = result.evaluations) !== null && _s !== void 0 ? _s : [];
        const grouped = new Map();
        for (const evaluation of evaluations) {
            const reviewerId = (_u = (_t = evaluation.reviewer) === null || _t === void 0 ? void 0 : _t.id) !== null && _u !== void 0 ? _u : 0;
            if (!grouped.has(reviewerId)) {
                grouped.set(reviewerId, {
                    reviewerName: escapeHtml((_0 = (_x = (_w = (_v = evaluation.reviewer) === null || _v === void 0 ? void 0 : _v.user) === null || _w === void 0 ? void 0 : _w.username) !== null && _x !== void 0 ? _x : (_z = (_y = evaluation.reviewer) === null || _y === void 0 ? void 0 : _y.user) === null || _z === void 0 ? void 0 : _z.email) !== null && _0 !== void 0 ? _0 : 'Juez'),
                    evaluations: [],
                });
            }
            grouped.get(reviewerId).evaluations.push(evaluation);
        }
        let evaluationsHtml = '';
        if (grouped.size > 0) {
            const judgesHtml = Array.from(grouped.values())
                .map((group) => `
            <div style="margin:10px 0;">
              <strong style="color:#4338ca;">${group.reviewerName}</strong>
              <ul style="margin:6px 0 0;padding-left:20px;">
                ${group.evaluations
                .map((evaluation) => {
                var _a;
                return `<li><strong>${escapeHtml((_a = evaluation.criteria) !== null && _a !== void 0 ? _a : 'Criterio')}:</strong> ${escapeHtml(evaluation.points)} pts${evaluation.comments ? ` — ${escapeHtml(evaluation.comments)}` : ''}</li>`;
            })
                .join('')}
              </ul>
            </div>`)
                .join('');
            evaluationsHtml = `
          <h4 style="margin:12px 0 4px;">Evaluaciones por juez</h4>
          ${judgesHtml}`;
        }
        else {
            evaluationsHtml = '<p style="color:#6b7280;">Sin evaluaciones registradas.</p>';
        }
        return `
      <div style="border:1px solid #e5e7eb;border-radius:10px;padding:16px;margin:14px 0;">
        <h3 style="margin:0 0 4px;">${modelName}${categoryName ? ` <span style="color:#6b7280;font-weight:400;">— ${categoryName}</span>` : ''}</h3>
        ${imageHtml}
        <p style="margin:4px 0;">Puntos totales: <strong>${totalPoints}</strong> | Posición: ${order}</p>
        ${batchHtml}
        ${evaluationsHtml}
      </div>`;
    })
        .join('');
    const html = `<!DOCTYPE html>
<html lang="es">
  <head>
    <meta charset="utf-8" />
  </head>
  <body style="margin:0;padding:0;background-color:#f3f4f6;font-family:Arial,Helvetica,sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f3f4f6;padding:24px 0;">
      <tr>
        <td align="center">
          <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:12px;overflow:hidden;">
            <tr>
              <td style="background-color:#4338ca;padding:24px;color:#ffffff;">
                <h1 style="margin:0;font-size:22px;">Resultados de la competencia</h1>
                <p style="margin:4px 0 0;opacity:.9;">${competitionName}</p>
              </td>
            </tr>
            <tr>
              <td style="padding:24px;">
                <h2 style="margin:0 0 12px;">¡Hola ${username}!</h2>
                <p style="margin:0 0 8px;">Estos son los resultados de tus modelos:</p>
                ${resultsHtml}
                <p style="margin:20px 0 0;">¡Gracias por participar!</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
    return { subject: `Resultados de ${competitionName}`, html };
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
    async getParticipantResults(input) {
        const { participantDocumentId, competitionDocumentId } = input;
        return (await strapi.db
            .query('api::competition-result.competition-result')
            .findMany({
            where: {
                competition: { documentId: competitionDocumentId },
                model: { user: { documentId: participantDocumentId } },
            },
            populate: {
                competition: { populate: { activity: true } },
                model: { populate: { model: true, category: true } },
                batch: true,
                evaluations: { populate: { reviewer: { populate: { user: true } } } },
            },
        }));
    },
    async sendResultEmailToParticipant(input) {
        const { participantDocumentId, competitionDocumentId } = input;
        const user = (await strapi.db
            .query('plugin::users-permissions.user')
            .findOne({ where: { documentId: participantDocumentId } }));
        if (!user) {
            throw new ApplicationError('Participant user not found');
        }
        if (!user.email) {
            throw new ApplicationError('Participant user has no email');
        }
        const results = await this.getParticipantResults({
            participantDocumentId,
            competitionDocumentId,
        });
        if (results.length === 0) {
            throw new ApplicationError('The participant has no results in this competition');
        }
        const { subject, html } = buildResultEmailHtml({ user, results });
        await sendEmail({ to: user.email, subject, html });
        return { sentTo: user.email, resultsCount: results.length };
    },
    async sendResultEmailsToAll(input) {
        var _a, _b;
        const { competitionDocumentId } = input;
        const results = (await strapi.db
            .query('api::competition-result.competition-result')
            .findMany({
            where: { competition: { documentId: competitionDocumentId } },
            populate: {
                competition: { populate: { activity: true } },
                model: { populate: { model: true, category: true, user: true } },
                batch: true,
                evaluations: { populate: { reviewer: { populate: { user: true } } } },
            },
        }));
        const byUser = new Map();
        for (const result of results) {
            const user = (_a = result.model) === null || _a === void 0 ? void 0 : _a.user;
            if (!(user === null || user === void 0 ? void 0 : user.email))
                continue;
            const key = user.id;
            if (!byUser.has(key)) {
                byUser.set(key, { user, results: [] });
            }
            byUser.get(key).results.push(result);
        }
        const summary = { total: byUser.size, sent: 0, failed: 0, errors: [] };
        for (const { user, results: userResults } of byUser.values()) {
            try {
                const { subject, html } = buildResultEmailHtml({ user, results: userResults });
                await sendEmail({ to: user.email, subject, html });
                summary.sent += 1;
            }
            catch (error) {
                summary.failed += 1;
                summary.errors.push({
                    participant: user.email,
                    error: (_b = error === null || error === void 0 ? void 0 : error.message) !== null && _b !== void 0 ? _b : String(error),
                });
            }
        }
        return summary;
    },
}));
