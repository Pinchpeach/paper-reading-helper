const DEFAULT_TIMEOUT_MS = 30000;

export async function getAnalysisConfig() {
  if (!globalThis.chrome?.storage?.local) return { mode: "mock", apiBaseUrl: "" };
  const stored = await chrome.storage.local.get(["analysisMode", "apiBaseUrl"]);
  return { mode: stored.analysisMode || "mock", apiBaseUrl: (stored.apiBaseUrl || "").replace(/\/$/, "") };
}

export async function analyzeWithBackend(payload, fallback) {
  const config = await getAnalysisConfig();
  if (config.mode !== "api" || !config.apiBaseUrl) return fallback();

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);
  try {
    const response = await fetch(config.apiBaseUrl + "/v1/analyze", {
      method: "POST",
      headers: { "content-type": "application/json" },
      credentials: "include",
      body: JSON.stringify(payload),
      signal: controller.signal
    });
    if (!response.ok) throw new Error("Analysis API returned " + response.status);
    return { source: "api", data: await response.json() };
  } catch (error) {
    console.warn("PRH API unavailable; using local analysis.", error);
    return { source: "fallback", error: String(error), data: fallback().data };
  } finally {
    clearTimeout(timer);
  }
}

export function serializePaper(sentences, chapters, sourceUrl) {
  return {
    sourceUrl,
    sentences: sentences.map(s => ({ id: s.id, page: s.page, text: s.text })),
    chapters: chapters.map(c => ({ id: c.id, title: c.title, page: c.page, sentenceIds: c.members.map(s => s.id) }))
  };
}
