// Generate simple HTML documentation
function generateSimpleHTML(spec) {
  const paths = spec.paths || {};
  let pathsHtml = "";

  Object.keys(paths).forEach((pathKey) => {
    const methods = paths[pathKey];
    Object.keys(methods).forEach((methodKey) => {
      const operation = methods[methodKey];
      pathsHtml += `
        <div class="endpoint">
          <div class="method ${methodKey.toUpperCase()}">${methodKey.toUpperCase()}</div>
          <div class="path">${pathKey}</div>
          <div class="summary">${operation.summary || "No description"}</div>
          <div class="description">${operation.description || ""}</div>
        </div>
      `;
    });
  });

  return `
<!DOCTYPE html>
<html>
  <head>
    <title>${spec.info?.title || "API Documentation"}</title>
    <meta charset="utf-8"/>
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <style>
      * { margin: 0; padding: 0; box-sizing: border-box; }
      body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
      .header { background: #4f46e5; color: white; padding: 2rem; text-align: center; }
      .header h1 { font-size: 2rem; margin-bottom: 0.5rem; }
      .header p { opacity: 0.9; }
      .container { max-width: 1200px; margin: 0 auto; padding: 2rem; }
      .endpoint { border: 1px solid #e0e0e0; border-radius: 8px; margin-bottom: 1rem; overflow: hidden; }
      .endpoint-header { display: flex; align-items: center; padding: 1rem; background: #f8f9fa; }
      .method {
        padding: 0.25rem 0.75rem; border-radius: 4px; color: white; font-weight: bold;
        margin-right: 1rem; min-width: 60px; text-align: center; font-size: 0.8rem;
      }
      .method.GET { background: #4caf50; }
      .method.POST { background: #2196f3; }
      .method.PUT { background: #ff9800; }
      .method.DELETE { background: #f44336; }
      .path { font-family: 'Courier New', monospace; font-weight: bold; color: #1976d2; }
      .summary { margin-left: auto; color: #666; }
      .description { padding: 1rem; background: white; border-top: 1px solid #e0e0e0; }
      .servers { margin-bottom: 2rem; }
      .servers h3 { margin-bottom: 1rem; color: #4f46e5; }
      .server { background: #f8f9fa; padding: 1rem; border-radius: 4px; margin-bottom: 0.5rem; }
      .server-url { font-family: 'Courier New', monospace; color: #1976d2; }
      .json-link {
        position: fixed; bottom: 2rem; right: 2rem; background: #4f46e5; color: white;
        padding: 1rem; border-radius: 50%; text-decoration: none; box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        font-size: 1.2rem; width: 60px; height: 60px; display: flex; align-items: center; justify-content: center;
      }
      .json-link:hover { background: #3f36d5; }
    </style>
  </head>
  <body>
    <div class="header">
      <h1>${spec.info?.title || "API Documentation"}</h1>
      <p>${spec.info?.description || "API Documentation"}</p>
      <p>Version: ${spec.info?.version || "1.0.0"}</p>
    </div>

    <div class="container">
      ${
        spec.servers
          ? `
        <div class="servers">
          <h3>🌐 Servers</h3>
          ${spec.servers
            .map(
              (server) => `
            <div class="server">
              <div class="server-url">${server.url}</div>
              <div>${server.description || ""}</div>
            </div>
          `,
            )
            .join("")}
        </div>
      `
          : ""
      }

      <h3>📋 API Endpoints</h3>
      ${pathsHtml || "<p>No endpoints found</p>"}
    </div>

    <a href="/openapi.json" class="json-link" title="View OpenAPI JSON">📄</a>
  </body>
</html>
  `;
}

module.exports = {
  generateSimpleHTML,
};
