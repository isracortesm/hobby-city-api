"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const config = {
    type: 'content-api',
    routes: [
        {
            method: 'POST',
            path: '/competition-results/send-result-email',
            handler: 'api::competition-result.competition-result.sendResultEmail',
        },
        {
            method: 'POST',
            path: '/competition-results/send-result-emails-to-all',
            handler: 'api::competition-result.competition-result.sendResultEmailsToAll',
        },
    ],
};
exports.default = config;
