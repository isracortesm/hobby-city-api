"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const config = ({ env }) => ({
    host: env('HOST', '0.0.0.0'),
    port: env.int('PORT', 1337),
    url: env('PUBLIC_URL', '0.0.0.0'),
    app: {
        keys: env.array('APP_KEYS'),
    },
});
exports.default = config;
