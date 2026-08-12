import type { Core } from '@strapi/strapi';

const config: Core.RouterConfig = {
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

export default config;
