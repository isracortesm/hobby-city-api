import type { Core } from '@strapi/strapi';

const config = ({ env }: Core.Config.Shared.ConfigParams): Core.Config.Plugin => ({

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

export default config;
