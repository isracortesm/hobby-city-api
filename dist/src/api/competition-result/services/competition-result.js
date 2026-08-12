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
function computeTotalPoints(evaluations, operationType) {
    const rawSum = evaluations.reduce((acc, evaluation) => { var _a; return acc + ((_a = evaluation.points) !== null && _a !== void 0 ? _a : 0); }, 0);
    const count = evaluations.length;
    const metric = operationType === 'average' ? (count > 0 ? rawSum / count : 0) : rawSum;
    return roundToTwo(metric);
}
function computeTieBreakKey(evaluations) {
    const keyWeight = evaluations.reduce((acc, evaluation) => { var _a, _b; return Math.max(acc, (_b = (_a = evaluation.criteria) === null || _a === void 0 ? void 0 : _a.weight) !== null && _b !== void 0 ? _b : 0); }, 0);
    const keyPoints = evaluations.reduce((acc, evaluation) => {
        var _a, _b, _c;
        if (((_b = (_a = evaluation.criteria) === null || _a === void 0 ? void 0 : _a.weight) !== null && _b !== void 0 ? _b : 0) === keyWeight) {
            return Math.max(acc, (_c = evaluation.points) !== null && _c !== void 0 ? _c : 0);
        }
        return acc;
    }, 0);
    const gradedAt = evaluations.reduce((acc, evaluation) => {
        var _a;
        const time = new Date((_a = evaluation.updatedAt) !== null && _a !== void 0 ? _a : 0).getTime();
        if (Number.isNaN(time))
            return acc;
        return Math.max(acc, time);
    }, 0);
    return { keyPoints, keyWeight, gradedAt };
}
async function applyResultUpdates(updates) {
    for (const update of updates) {
        const data = {};
        if ('batch' in update)
            data.batch = update.batch;
        if ('totalPoints' in update)
            data.totalPoints = update.totalPoints;
        if ('order' in update)
            data.order = update.order;
        await strapi.db
            .query('api::competition-result.competition-result')
            .update({ where: { id: update.id }, data });
    }
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
                return `<li><strong>${escapeHtml((_a = evaluation.name) !== null && _a !== void 0 ? _a : 'Criterio')}:</strong> ${escapeHtml(evaluation.points)} pts${evaluation.comments ? ` — ${escapeHtml(evaluation.comments)}` : ''}</li>`;
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
    async recomputeCompetition(competitionId) {
        var _a, _b, _c, _d;
        const competition = (await strapi.db
            .query('api::competition.competition')
            .findOne({
            where: { id: competitionId },
            populate: { batchLimits: { populate: { batch: true } } },
        }));
        if (!competition)
            return;
        const operationType = (_a = competition.operationType) !== null && _a !== void 0 ? _a : 'average';
        const batchLimits = ((_b = competition.batchLimits) !== null && _b !== void 0 ? _b : []).filter((entry) => { var _a; return ((_a = entry === null || entry === void 0 ? void 0 : entry.batch) === null || _a === void 0 ? void 0 : _a.id) != null; });
        const hasQuota = batchLimits.length > 0;
        const results = (await strapi.db
            .query('api::competition-result.competition-result')
            .findMany({
            where: { competition: competitionId },
            populate: {
                batch: true,
                model: { populate: { category: { populate: { batches: true } } } },
                evaluations: { populate: { criteria: true } },
            },
        }));
        if (results.length === 0)
            return;
        const scored = results.map((result) => {
            var _a;
            const evaluations = (_a = result.evaluations) !== null && _a !== void 0 ? _a : [];
            const tieBreak = computeTieBreakKey(evaluations);
            return {
                result,
                totalPoints: computeTotalPoints(evaluations, operationType),
                keyPoints: tieBreak.keyPoints,
                keyWeight: tieBreak.keyWeight,
                gradedAt: tieBreak.gradedAt,
            };
        });
        scored.sort((a, b) => {
            if (b.totalPoints !== a.totalPoints)
                return b.totalPoints - a.totalPoints;
            if (b.keyPoints !== a.keyPoints)
                return b.keyPoints - a.keyPoints;
            if (b.keyWeight !== a.keyWeight)
                return b.keyWeight - a.keyWeight;
            if (a.gradedAt !== b.gradedAt)
                return a.gradedAt - b.gradedAt;
            return a.result.id - b.result.id;
        });
        const levels = hasQuota
            ? batchLimits
                .map((entry) => {
                var _a, _b, _c;
                return ({
                    batchId: entry.batch.id,
                    requiredValue: (_b = (_a = entry.batch) === null || _a === void 0 ? void 0 : _a.requiredValue) !== null && _b !== void 0 ? _b : 0,
                    capacity: ((_c = entry.limit) !== null && _c !== void 0 ? _c : 0) > 0 ? entry.limit : 0,
                });
            })
                .sort((a, b) => b.requiredValue - a.requiredValue)
            : [];
        const capacity = new Map();
        for (const level of levels)
            capacity.set(level.batchId, level.capacity);
        const assignedCount = new Map();
        const updates = [];
        scored.forEach((scoredEntry, index) => {
            var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k;
            const { result, totalPoints } = scoredEntry;
            let assignedBatchId = null;
            if (hasQuota) {
                for (const level of levels) {
                    const remaining = (_a = capacity.get(level.batchId)) !== null && _a !== void 0 ? _a : 0;
                    if (totalPoints >= level.requiredValue && remaining > 0) {
                        assignedBatchId = level.batchId;
                        capacity.set(level.batchId, remaining - 1);
                        break;
                    }
                }
            }
            else {
                let bestRequiredValue = -Infinity;
                for (const batch of (_d = (_c = (_b = result.model) === null || _b === void 0 ? void 0 : _b.category) === null || _c === void 0 ? void 0 : _c.batches) !== null && _d !== void 0 ? _d : []) {
                    const requiredValue = (_e = batch.requiredValue) !== null && _e !== void 0 ? _e : 0;
                    if (totalPoints >= requiredValue && requiredValue > bestRequiredValue) {
                        bestRequiredValue = requiredValue;
                        assignedBatchId = batch.id;
                    }
                }
            }
            if (assignedBatchId !== null) {
                assignedCount.set(assignedBatchId, ((_f = assignedCount.get(assignedBatchId)) !== null && _f !== void 0 ? _f : 0) + 1);
            }
            const update = { id: result.id };
            const currentBatchId = (_h = (_g = result.batch) === null || _g === void 0 ? void 0 : _g.id) !== null && _h !== void 0 ? _h : null;
            if (assignedBatchId !== currentBatchId)
                update.batch = assignedBatchId;
            if (roundToTwo((_j = result.totalPoints) !== null && _j !== void 0 ? _j : 0) !== totalPoints) {
                update.totalPoints = totalPoints;
            }
            if (((_k = result.order) !== null && _k !== void 0 ? _k : 0) !== index + 1)
                update.order = index + 1;
            if (Object.keys(update).length > 1)
                updates.push(update);
        });
        await applyResultUpdates(updates);
        if (hasQuota) {
            for (const entry of batchLimits) {
                const count = (_c = assignedCount.get(entry.batch.id)) !== null && _c !== void 0 ? _c : 0;
                if (((_d = entry.assigned) !== null && _d !== void 0 ? _d : 0) !== count) {
                    await strapi.db
                        .query('competition.batch-limits')
                        .update({ where: { id: entry.id }, data: { assigned: count } });
                }
            }
        }
    },
    async recomputeResult(resultId) {
        var _a;
        const result = (await strapi.db
            .query('api::competition-result.competition-result')
            .findOne({
            where: { id: resultId },
            populate: { competition: true },
        }));
        if (!((_a = result === null || result === void 0 ? void 0 : result.competition) === null || _a === void 0 ? void 0 : _a.id))
            return;
        await this.recomputeCompetition(result.competition.id);
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
