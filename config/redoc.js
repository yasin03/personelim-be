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

// Generate Redoc HTML
function generateRedocHTML(spec) {
  const specString = JSON.stringify(spec, null, 2);
  return `
<!DOCTYPE html>
<html>
  <head>
    <title>Personelim API Documentation</title>
    <meta charset="utf-8"/>
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <link href="https://fonts.googleapis.com/css?family=Roboto:300,400,700" rel="stylesheet">
    <style>
      body {
        margin: 0;
        padding: 0;
        font-family: Roboto, sans-serif;
      }
      .loading {
        display: flex;
        justify-content: center;
        align-items: center;
        height: 100vh;
        font-size: 18px;
        background: #fafafa;
      }
      .error {
        color: #d32f2f;
        padding: 20px;
        text-align: center;
      }
    </style>
  </head>
  <body>
    <div class="loading" id="loading">
      <div>
        <div>📚 Loading API Documentation...</div>
        <div style="font-size: 14px; margin-top: 10px; color: #666;">Please wait while we load the documentation</div>
      </div>
    </div>
    <div id="redoc-container"></div>
    
    <script>
      console.log('Starting Redoc initialization...');
      
      const spec = ${specString};
      console.log('Spec loaded successfully, paths:', Object.keys(spec.paths || {}));
      
      // Create script element for Redoc
      const script = document.createElement('script');
      script.src = 'https://unpkg.com/redoc@2.1.3/bundles/redoc.standalone.js';
      script.crossOrigin = 'anonymous';
      
      script.onload = function() {
        console.log('Redoc library loaded successfully');
        
        try {
          if (typeof Redoc === 'undefined') {
            throw new Error('Redoc library not found');
          }
          
          const container = document.getElementById('redoc-container');
          const loading = document.getElementById('loading');
          
          console.log('Initializing Redoc...');
          
          // Initialize Redoc with the spec
          Redoc.init(spec, {
            scrollYOffset: 0,
            hideDownloadButton: false,
            disableSearch: false,
            hideLoading: false,
            nativeScrollbars: false,
            requiredPropsFirst: true,
            sortPropsAlphabetically: true,
            showExtensions: false,
            noAutoAuth: false,
            pathInMiddlePanel: false,
            hideHostname: false,
            expandResponses: "200,201",
            expandSingleSchemaField: true,
            showObjectSchemaExamples: true,
            theme: {
              colors: {
                primary: {
                  main: '#4f46e5'
                },
                success: {
                  main: '#4caf50'
                },
                warning: {
                  main: '#ff9800'
                },
                error: {
                  main: '#f44336'
                }
              },
              typography: {
                fontSize: '14px',
                fontFamily: 'Roboto, sans-serif',
                lineHeight: '1.5',
                code: {
                  fontSize: '13px',
                  fontFamily: 'Courier, monospace'
                }
              },
              menu: {
                backgroundColor: '#fafafa'
              }
            }
          }, container).then(() => {
            console.log('Redoc initialized successfully!');
            loading.style.display = 'none';
            container.style.display = 'block';
          }).catch(error => {
            console.error('Redoc initialization error:', error);
            loading.innerHTML = '<div class="error">❌ Failed to initialize documentation: ' + error.message + '</div>';
          });
          
        } catch (error) {
          console.error('Error in Redoc setup:', error);
          document.getElementById('loading').innerHTML = '<div class="error">❌ Error loading documentation: ' + error.message + '</div>';
        }
      };
      
      script.onerror = function(error) {
        console.error('Failed to load Redoc script:', error);
        document.getElementById('loading').innerHTML = '<div class="error">❌ Failed to load Redoc library from CDN. Please check your internet connection.</div>';
      };
      
      // Add script to head
      document.head.appendChild(script);
      
      // Timeout fallback
      setTimeout(() => {
        if (document.getElementById('loading').style.display !== 'none') {
          console.warn('Loading timeout - trying alternative approach');
          document.getElementById('loading').innerHTML = '<div class="error">⏰ Loading timeout. <a href="/openapi.json">View raw OpenAPI spec</a></div>';
        }
      }, 15000);
    </script>
  </body>
</html>
  `;
}

module.exports = {
  redocOptions,
  loadOpenAPISpec,
  generateRedocHTML,
};
