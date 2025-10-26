const fs = require("fs");
const path = require("path");

// Redoc configuration
const redocOptions = {
  title: "Personelim API Documentation",
  theme: {
    colors: {
      primary: {
        main: "#4f46e5",
      },
    },
    typography: {
      fontSize: "14px",
      fontFamily: "Roboto, sans-serif",
    },
  },
  scrollYOffset: 0,
  hideDownloadButton: false,
  disableSearch: false,
  hideLoading: false,
  nativeScrollbars: false,
  theme: "light",
};

// Load OpenAPI specification
function loadOpenAPISpec() {
  try {
    const specPath = path.join(__dirname, "..", "docs", "openapi.json");
    const specContent = fs.readFileSync(specPath, "utf8");
    return JSON.parse(specContent);
  } catch (error) {
    console.error("Error loading OpenAPI specification:", error);
    return null;
  }
}

// Generate Redoc HTML without inline scripts/styles (CSP friendly)
function generateRedocHTML(spec) {
  if (!spec) {
    return null;
  }

  return `
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Personelim API Documentation</title>
    <link rel="stylesheet" href="/docs.css" />
  </head>
  <body>
    <div class="loading" id="loading">
      <div>
        <div>📚 Loading API Documentation...</div>
        <div class="loading-sub">Please wait while we load the documentation</div>
      </div>
    </div>
    <div id="redoc-container" class="redoc-container" hidden></div>
    <script src="/redoc.standalone.js" defer></script>
    <script src="/docs-init.js" defer></script>
  </body>
</html>`;
}

module.exports = {
  redocOptions,
  loadOpenAPISpec,
  generateRedocHTML,
};
