"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const config = ({ env }) => ({
    upload: {
        config: {
            breakpoints: {},
            provider: '@strapi/provider-upload-aws-s3',
            providerOptions: {
                allowedMimeTypes: ["image/png", "image/jpeg"],
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
exports.default = config;
