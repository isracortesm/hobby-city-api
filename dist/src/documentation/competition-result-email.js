"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const errorResponses = {
    400: {
        description: 'Bad Request',
        content: {
            'application/json': {
                schema: { $ref: '#/components/schemas/Error' },
            },
        },
    },
    401: {
        description: 'Unauthorized',
        content: {
            'application/json': {
                schema: { $ref: '#/components/schemas/Error' },
            },
        },
    },
    403: {
        description: 'Forbidden',
        content: {
            'application/json': {
                schema: { $ref: '#/components/schemas/Error' },
            },
        },
    },
    404: {
        description: 'Not Found',
        content: {
            'application/json': {
                schema: { $ref: '#/components/schemas/Error' },
            },
        },
    },
    500: {
        description: 'Internal Server Error',
        content: {
            'application/json': {
                schema: { $ref: '#/components/schemas/Error' },
            },
        },
    },
};
const override = {
    paths: {
        '/competition-results/send-result-email': {
            post: {
                tags: ['CompetitionResult'],
                summary: 'Enviar resultados por email a un participante',
                description: 'Envía un email al participante con los resultados de sus modelos evaluados en la competencia, incluyendo el batch obtenido (con felicitación cuando es gold/silver/bronce) y las evaluaciones agrupadas por juez.',
                operationId: 'post/competition-results/send-result-email',
                requestBody: {
                    required: true,
                    content: {
                        'application/json': {
                            schema: { $ref: '#/components/schemas/SendResultEmailRequest' },
                        },
                    },
                },
                responses: {
                    200: {
                        description: 'OK',
                        content: {
                            'application/json': {
                                schema: { $ref: '#/components/schemas/SendResultEmailResponse' },
                            },
                        },
                    },
                    ...errorResponses,
                },
            },
        },
        '/competition-results/send-result-emails-to-all': {
            post: {
                tags: ['CompetitionResult'],
                summary: 'Enviar resultados por email a todos los participantes',
                description: 'Envía un email a cada participante con resultados en la competencia, incluyendo únicamente sus modelos evaluados y sus evaluaciones agrupadas por juez.',
                operationId: 'post/competition-results/send-result-emails-to-all',
                requestBody: {
                    required: true,
                    content: {
                        'application/json': {
                            schema: { $ref: '#/components/schemas/SendResultEmailsToAllRequest' },
                        },
                    },
                },
                responses: {
                    200: {
                        description: 'OK',
                        content: {
                            'application/json': {
                                schema: { $ref: '#/components/schemas/SendResultEmailsToAllResponse' },
                            },
                        },
                    },
                    ...errorResponses,
                },
            },
        },
    },
    components: {
        schemas: {
            SendResultEmailRequest: {
                type: 'object',
                required: ['participant', 'competition'],
                properties: {
                    participant: {
                        type: 'string',
                        description: 'DocumentId del usuario participante',
                    },
                    competition: {
                        type: 'string',
                        description: 'DocumentId de la competencia',
                    },
                },
            },
            SendResultEmailResponse: {
                type: 'object',
                properties: {
                    data: {
                        type: 'object',
                        required: ['sentTo', 'resultsCount'],
                        properties: {
                            sentTo: {
                                type: 'string',
                                format: 'email',
                                description: 'Correo al que se envió el resultado',
                            },
                            resultsCount: {
                                type: 'integer',
                                description: 'Cantidad de resultados enviados',
                            },
                        },
                    },
                },
            },
            SendResultEmailsToAllRequest: {
                type: 'object',
                required: ['competition'],
                properties: {
                    competition: {
                        type: 'string',
                        description: 'DocumentId de la competencia',
                    },
                },
            },
            SendResultEmailsToAllResponse: {
                type: 'object',
                properties: {
                    data: {
                        type: 'object',
                        required: ['total', 'sent', 'failed'],
                        properties: {
                            total: {
                                type: 'integer',
                                description: 'Total de destinatarios con resultados',
                            },
                            sent: {
                                type: 'integer',
                                description: 'Correos enviados correctamente',
                            },
                            failed: {
                                type: 'integer',
                                description: 'Correos que fallaron',
                            },
                            errors: {
                                type: 'array',
                                items: {
                                    type: 'object',
                                    properties: {
                                        participant: {
                                            type: 'string',
                                            description: 'Correo del participante que falló',
                                        },
                                        error: {
                                            type: 'string',
                                            description: 'Mensaje del error',
                                        },
                                    },
                                },
                            },
                        },
                    },
                },
            },
        },
    },
};
exports.default = override;
