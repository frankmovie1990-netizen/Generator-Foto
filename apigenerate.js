// api/generate.js
// Proxy serverless (Vercel) untuk memanggil Google AI Studio Images API
// Model: gemini-2.5-flash-image
// Tidak menyimpan API key; key dikirim user → diteruskan → dibuang.

const MODEL_ENDPOINT =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateImage";

export default async function handler(req, res) {
  // CORS preflight
  if (req.method === "OPTIONS") {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method Not Allowed" });
  }

  try {
    const { apiKey, prompt, count, ratio, references } = req.body || {};
    if (!apiKey) return res.status(400).json({ message: "Missing apiKey" });
    if (!prompt) return res.status(400).json({ message: "Missing prompt" });

    // Payload sesuai dokumentasi Images API
    const payload = {
      prompt: { text: String(prompt) },
      imageCount: Number(count) || 1,
      aspectRatio: String(ratio || "1:1"),
    };

    // Image references (opsional)
    if (Array.isArray(references) && references.length) {
      payload.references = references.map((b64) => ({
        inlineData: { mimeType: "image/jpeg", data: b64 },
      }));
    }

    const upstream = await fetch(MODEL_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey, // lebih aman untuk CORS daripada querystring
      },
      body: JSON.stringify(payload),
    });

    const text = await upstream.text();
    let data;
    try { data = JSON.parse(text); } catch { /* ignore */ }

    if (!upstream.ok) {
      return res.status(upstream.status).json({
        message: data?.error?.message || text || `Upstream HTTP ${upstream.status}`,
      });
    }

    // Harapkan: { images: [{ base64Data: "..." }, ...] }
    const base64s = (data?.images || [])
      .map((it) => it.base64Data || it.inlineData?.data)
      .filter(Boolean);

    if (!base64s.length) {
      return res.status(502).json({
        message:
          "Upstream OK tetapi kosong. Pastikan project & API key kamu punya akses model gemini-2.5-flash-image.",
      });
    }

    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Content-Type", "application/json");
    return res.status(200).json({ images: base64s });
  } catch (e) {
    console.error("Proxy error:", e);
    return res.status(500).json({ message: e?.message || "Internal error" });
  }
}