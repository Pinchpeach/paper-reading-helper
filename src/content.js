(() => {
  if (window.__PRH_LOADED__) return;
  window.__PRH_LOADED__ = true;

  const state = { enabled: true, highlights: [] };

  function isPdfLike() {
    const url = location.href.toLowerCase();
    return url.includes(".pdf") || document.contentType === "application/pdf" ||
      document.querySelector("embed[type='application/pdf']");
  }

  function mountPanel() {
    if (document.getElementById("prh-root")) return;
    const root = document.createElement("aside");
    root.id = "prh-root";
    root.innerHTML = `
      <header class="prh-header">
        <div><strong>Paper Helper</strong><span>reading layer</span></div>
        <button id="prh-close" aria-label="Close">×</button>
      </header>
      <section class="prh-section">
        <div class="prh-kicker">CURRENT PAPER</div>
        <h2>Analysis ready</h2>
        <p>Prototype mode: the UI layer is active. Next we will connect PDF text coordinates to the analysis API.</p>
      </section>
      <section class="prh-section">
        <div class="prh-kicker">KEY IDEAS</div>
        <button class="prh-chip">Main contribution</button>
        <button class="prh-chip">Method</button>
        <button class="prh-chip">Results</button>
      </section>
      <section class="prh-section prh-demo">
        <div class="prh-kicker">CHAPTER ESSENTIALS</div>
        <p><b>Problem</b><br>Important chapter-level problems will appear here.</p>
        <p><b>Approach</b><br>The paper's proposed approach will be summarized here.</p>
      </section>`;
    document.documentElement.appendChild(root);
    root.querySelector("#prh-close").addEventListener("click", () => root.remove());
  }

  function addLauncher() {
    if (document.getElementById("prh-launcher")) return;
    const button = document.createElement("button");
    button.id = "prh-launcher";
    button.textContent = "PRH";
    button.title = "Open Paper Reading Helper";
    button.addEventListener("click", mountPanel);
    document.documentElement.appendChild(button);
  }

  // Chrome's built-in PDF viewer is isolated from ordinary content scripts.
  // For now this verifies the extension UI on PDF URLs and normal pages.
  // The next implementation step is our own PDF.js viewer/text layer.
  if (isPdfLike()) mountPanel();
  addLauncher();
})();