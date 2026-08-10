"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const competition_result_email_1 = __importDefault(require("./documentation/competition-result-email"));
exports.default = {
    /**
     * An asynchronous register function that runs before
     * your application is initialized.
     *
     * This gives you an opportunity to extend code.
     */
    register({ strapi }) {
        strapi
            .plugin('documentation')
            .service('override')
            .registerOverride(competition_result_email_1.default);
    },
    /**
     * An asynchronous bootstrap function that runs before
     * your application gets started.
     *
     * This gives you an opportunity to set up your data model,
     * run jobs, or perform some special logic.
     */
    bootstrap( /* { strapi }: { strapi: Core.Strapi } */) { },
};
