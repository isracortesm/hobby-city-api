"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const config = [
    'strapi::logger',
    'strapi::errors',
    'strapi::cors',
    'strapi::poweredBy',
    'strapi::query',
    'strapi::body',
    'strapi::session',
    'strapi::favicon',
    'strapi::public',
    {
        name: 'strapi::security',
        config: {
            contentSecurityPolicy: {
                useDefaults: true,
                directives: {
                    'img-src': [
                        "'self'",
                        'data:',
                        'blob:',
                        'https://market-assets.strapi.io',
                        'https://lwhtqgysqynugqbpisva.storage.supabase.co',
                        'https://pjpmsspqzphwpikxfxdf.storage.supabase.co'
                    ],
                },
            },
        },
    },
];
exports.default = config;
