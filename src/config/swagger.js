import swaggerJsdoc from 'swagger-jsdoc';

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Game Tracker REST API',
      version: '2.0.0',
      description:
        'Документація REST API для сервісу обліку проходження відеоігор (аутентифікація JWT + Argon2id, RBAC, файловий сервіс Multer 2, пошук, фільтрація, пагінація та аудит дій).',
    },
    servers: [
      {
        url: 'http://localhost:3000',
        description: 'Development server',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
    },
  },
  apis: ['./src/routes/*.js'],
};

export const swaggerSpecs = swaggerJsdoc(options);