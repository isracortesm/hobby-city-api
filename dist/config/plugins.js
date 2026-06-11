"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const config = ({ env }) => ({
    email: {
        config: {
            provider: 'strapi-provider-email-resend',
            providerOptions: {
                apiKey: env('RESEND_API_KEY'), // Required
            },
            settings: {
                defaultFrom: env('RESEND_EMAIL_FROM'),
                defaultReplyTo: env('RESEND_EMAIL_REPLY'),
            },
        }
    },
});
exports.default = config;
