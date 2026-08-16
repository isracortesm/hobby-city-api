import type { Core } from '@strapi/strapi';

const config: Core.Config.Api = {
  rest: {
    defaultLimit: 2000,
    maxLimit: 2000,
    withCount: true,
  },
};

export default config;
