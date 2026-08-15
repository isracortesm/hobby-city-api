/**
 * competition-result controller
 */

import { factories } from '@strapi/strapi';
import { errors } from '@strapi/utils';

const { ValidationError } = errors;

function readBody(ctx: any): Record<string, unknown> {
  const body = ctx.request?.body ?? {};
  return body?.data ?? body;
}

export default factories.createCoreController(
  'api::competition-result.competition-result',
  ({ strapi }) => ({
    async sendResultEmail(ctx: any) {
      const body = readBody(ctx);
      const participant = body.participant;
      const competition = body.competition;
      const cc = body.cc as string | undefined;

      if (!participant) {
        throw new ValidationError('Missing "participant" (user documentId) in the request body');
      }
      if (!competition) {
        throw new ValidationError('Missing "competition" (competition documentId) in the request body');
      }

      const service = strapi.service('api::competition-result.competition-result') as any;

      const result = await service.sendResultEmailToParticipant({
        participantDocumentId: participant,
        competitionDocumentId: competition,
        cc,
      });

      ctx.body = { data: result };
    },

    async sendResultEmailsToAll(ctx: any) {
      const body = readBody(ctx);
      const competition = body.competition;

      if (!competition) {
        throw new ValidationError('Missing "competition" (competition documentId) in the request body');
      }

      const service = strapi.service('api::competition-result.competition-result') as any;

      const result = await service.sendResultEmailsToAll({
        competitionDocumentId: competition,
      });

      ctx.body = { data: result };
    },
  })
);
