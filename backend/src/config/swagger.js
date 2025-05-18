const swaggerJSDoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'QA Development API',
      version: '1.0.0',
      description: 'API Dokumentation für das QA Development Projekt',
    },
    servers: [
      {
        url: 'http://localhost:3000',
      },
    ],
  },
  apis: ['./src/routes/*.js', './src/controllers/*.js', './src/app.js'], // app.js hinzugefügt
};

const swaggerSpec = swaggerJSDoc(options);

module.exports = swaggerSpec;
