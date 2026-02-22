const swaggerUi = require("swagger-ui-express");
const path = require("path");
const fs = require("fs");

// Swagger UI configuration options
const swaggerUIOptions = {
  customCss: `
    .swagger-ui .topbar { display: none }
    .swagger-ui .info { margin: 50px 0 }
    .swagger-ui .info .title {
      font-size: 36px;
      font-weight: bold;
      color: #1a73e8;
    }
    .swagger-ui .info .description {
      font-size: 16px;
      margin-top: 20px;
    }
    .swagger-ui .scheme-container {
      background: #fafafa;
      padding: 20px;
      border-radius: 4px;
    }
  `,
  customSiteTitle: "Personelim API Documentation",
  customfavIcon: "https://cdn-icons-png.flaticon.com/512/3135/3135715.png",
  swaggerOptions: {
    persistAuthorization: true,
    displayRequestDuration: true,
    filter: true,
    syntaxHighlight: {
      activate: true,
      theme: "monokai",
    },
    tryItOutEnabled: true,
    docExpansion: "list",
    defaultModelsExpandDepth: 3,
    defaultModelExpandDepth: 3,
  },
};

// Load OpenAPI specification from docs folder
const loadOpenAPISpec = () => {
  try {
    const specPath = path.join(__dirname, "..", "..", "docs", "openapi.json");
    if (fs.existsSync(specPath)) {
      const specContent = fs.readFileSync(specPath, "utf8");
      return JSON.parse(specContent);
    }
    console.warn("OpenAPI spec file not found at:", specPath);
    return null;
  } catch (error) {
    console.error("Error loading OpenAPI specification:", error);
    return null;
  }
};

module.exports = {
  swaggerUi,
  swaggerUIOptions,
  loadOpenAPISpec,
};
