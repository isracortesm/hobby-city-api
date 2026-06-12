import type { Core } from '@strapi/strapi';

const config = ({ env }: Core.Config.Shared.ConfigParams): Core.Config.Plugin => ({
    upload: {
        config: {
            breakpoints: {},
            provider: '@strapi/provider-upload-aws-s3',
            providerOptions: {
                baseUrl: env('SUPABASE_S3_URL_PUBLIC'),
                s3Options: {
                    credentials: {
                        accessKeyId: env('SUPABASE_S3_ACCESS_KEY'),
                        secretAccessKey: env('SUPABASE_S3_SECRET_KEY'),
                    },
                    region: 'us-east-1',
                    endpoint: env('SUPABASE_S3_URL'),
                    forcePathStyle: true,
                    params: {
                        Bucket: env('SUPABASE_S3_BUCKET'),
                    },
                },
            },
        },
    },
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
