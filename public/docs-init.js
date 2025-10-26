"use strict";
(function initDocs() {
  function ready(fn) {
    if (
      document.readyState === "complete" ||
      document.readyState === "interactive"
    ) {
      fn();
    } else {
      document.addEventListener("DOMContentLoaded", fn);
    }
  }

  ready(function () {
    var loadingEl = document.getElementById("loading");
    var containerEl = document.getElementById("redoc-container");

    function showError(message) {
      if (loadingEl) {
        loadingEl.innerHTML = '<div class="error">' + message + "</div>";
      }
    }

    if (!window.Redoc) {
      showError("Failed to load documentation viewer.");
      return;
    }

    fetch("/openapi.json", { credentials: "same-origin" })
      .then(function (response) {
        if (!response.ok) {
          throw new Error(
            "Unable to fetch OpenAPI spec (status " + response.status + ")"
          );
        }
        return response.json();
      })
      .then(function (spec) {
        return window.Redoc.init(
          spec,
          {
            scrollYOffset: 0,
            hideDownloadButton: false,
            disableSearch: false,
            hideLoading: false,
            nativeScrollbars: false,
            theme: {
              colors: {
                primary: { main: "#4f46e5" },
              },
              typography: {
                fontSize: "14px",
                fontFamily: "Roboto, sans-serif",
              },
            },
          },
          containerEl
        );
      })
      .then(function () {
        if (loadingEl) {
          loadingEl.style.display = "none";
        }
        if (containerEl) {
          containerEl.hidden = false;
          containerEl.style.display = "block";
        }
      })
      .catch(function (error) {
        console.error("Redoc init error:", error);
        showError("Failed to load API documentation: " + error.message);
      });
  });
})();
