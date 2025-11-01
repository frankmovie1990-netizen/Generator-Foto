/* ====== Konfigurasi & List Angles ====== */

const ANGLES = [
  "Eye-Level Shot","Dutch Angle","Rear View","Leading Lines","High-Angle Shot",
  "Point of View","Symmetrical Framing","Frame Within a Frame","Low-Angle Shot",
  "Over-the-Shoulder Shot","Asymmetrical Framing","Golden Ratio","Bird’s-Eye View",
  "Profile Shot","Rule of Thirds","Negative Space","Worm’s-Eye View",
  "Three-Quarter View","Center Framing","Fill the Frame",
];

const ANGLE_HINT = {
  "Eye-Level Shot":"camera at subject eye height, natural balanced perspective",
  "Dutch Angle":"slightly tilted horizon for dynamic tension",
  "Rear View":"subject facing away from camera, back visible",
  "Leading Lines":"strong leading lines guide the eyes to subject",
  "High-Angle Shot":"camera above subject looking down",
  "Point of View":"first-person perspective",
  "Symmetrical Framing":"perfectly centered, left-right symmetry",
  "Frame Within a Frame":"subject framed by natural elements",
  "Low-Angle Shot":"camera below subject looking upward",
  "Over-the-Shoulder Shot":"behind the shoulder showing subject’s view",
  "Asymmetrical Framing":"off-center for dynamic balance",
  "Golden Ratio":"aligned to golden spiral focal point",
  "Bird’s-Eye View":"top-down overhead camera",
  "Profile Shot":"clean side view",
  "Rule of Thirds":"aligned on thirds grid intersection",
  "Negative Space":"minimalist with large empty space",
  "Worm’s-Eye View":"ultra-low upward angle",
  "Three-Quarter View":"3/4 facial angle",
  "Center Framing":"perfectly centered",
  "Fill the Frame":"tight crop, extreme close-up"
};

const RATIO_HINT = {
  "1:1": "square ratio 1:1",
  "9:16": "vertical ratio 9:16",
  "16:9": "horizontal ratio 16:9",
  "4:5": "portrait ratio 4:5",
  "3:2": "ratio 3:2",
};

const $ = (id) => document.getElementById(id);

function populateAngles() {
  const sel = $("angle");
  ANGLES.forEach((name) => {
    const opt = document.createElement("option");
    opt.value = name; opt.textContent = name; sel.appendChild(opt);
  });
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = () => resolve(fr.result.split(",")[1]);
    fr.onerror = reject;
    fr.readAsDataURL(file);
  });
}

function dl(filename, blob) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  document.body.appendChild(a);
  a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 1500);
}

function setStatus(msg, isError=false) {
  const el = $("status");
  el.textContent = msg || "";
  el.style.color = isError ? "#ffb3b3" : "#ffd479";
}

/* ====== Prompt Builder ====== */
function buildPrompt() {
  const brief = $("brief").value?.trim() || "A product photo for e-commerce marketing.";
  const angle = $("angle").value;
  const ratio = $("ratio").value;
  const bgMode = $("bgMode").value;
  const bgCustom = $("bgCustom").value?.trim();
  const fontStyle = $("fontStyle").value;

  const angleText = angle ? `Camera angle: ${angle} — ${ANGLE_HINT[angle]}.` : "Camera angle: best-natural.";
  const ratioText = `Aspect ratio: ${RATIO_HINT[ratio] || ratio}.`;
  const bgText = bgMode === "Custom"
    ? `Background: ${bgCustom || "custom aesthetic"} with soft realistic lighting.`
    : `Background: ${bgMode} with soft realistic lighting.`;
  const overlay = fontStyle !== "None"
    ? `Optional minimal overlay using ${fontStyle} font for label if needed.`
    : `No text overlay.`;

  const policy = "photo-realistic, high detail, clean composition, accurate proportions, no watermark, no brand logos, non-copyrighted style, safe-for-work, professional studio quality";

  const finalPrompt =
`Product/UGC Image.
Subject: ${brief}.
${angleText}
${ratioText}
${bgText}
Style: cinematic yet natural lighting, soft shadows, crisp focus, realistic materials, true-to-color.
Composition: rule-of-thirds awareness, subtle depth of field, commercial photography look.
Output: photorealistic single frame.
Constraints: ${policy}. ${overlay}`;

  return finalPrompt;
}

/* ====== Panggil proxy serverless ====== */
async function requestImages({ apiKey, prompt, count, ratio, refImages }) {
  const res = await fetch("/api/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      apiKey,
      prompt,
      count: Number(count) || 1,
      ratio: ratio || "1:1",
      references: refImages || []
    }),
  });

  if (!res.ok) {
    const errText = await res.text().catch(()=>"");
    throw new Error(errText || `HTTP ${res.status}`);
  }

  const data = await res.json();
  if (!Array.isArray(data.images) || !data.images.length) {
    throw new Error(data.message || "Response tidak berisi gambar.");
  }

  return data.images.map((b64, idx) => {
    const bytes = atob(b64);
    const arr = new Uint8Array(bytes.length);
    for (let i = 0; i < bytes.length; i++) arr[i] = bytes.charCodeAt(i);
    return new Blob([arr], { type: "image/jpeg" });
  });
}

/* ====== Render ====== */
function renderResults(blobs) {
  const wrap = $("results");
  wrap.innerHTML = "";
  blobs.forEach((blob, idx) => {
    const url = URL.createObjectURL(blob);
    const div = document.createElement("div");
    div.className = "thumb";
    const img = document.createElement("img");
    img.src = url; img.alt = `result-${idx+1}`;
    const tools = document.createElement("div");
    tools.className = "tools";
    const a = document.createElement("a");
    a.className = "btn-mini"; a.href = url; a.download = `result-${idx+1}.jpg`; a.textContent = "Download";
    const b = document.createElement("button");
    b.className = "btn-mini"; b.textContent = "Save";
    b.addEventListener("click", () => dl(`result-${idx+1}.jpg`, blob));
    tools.appendChild(a); tools.appendChild(b);
    div.appendChild(img); div.appendChild(tools);
    wrap.appendChild(div);
  });
}

/* ====== Init ====== */
document.addEventListener("DOMContentLoaded", () => {
  // isi dropdown angle
  const sel = $("angle");
  ANGLES.forEach((name) => {
    const opt = document.createElement("option");
    opt.value = name; opt.textContent = name; sel.appendChild(opt);
  });

  $("bgMode").addEventListener("change", () => {
    $("bgCustomWrap").style.display = $("bgMode").value === "Custom" ? "block" : "none";
  });

  $("btnGenerate").addEventListener("click", async () => {
    try {
      const apiKey = $("apiKey").value.trim();
      if (!apiKey) { setStatus("Masukkan API key terlebih dahulu.", true); return; }

      const count = $("count").value || "5";
      const ratio = $("ratio").value || "1:1";
      const prompt = buildPrompt();
      $("promptOut").textContent = prompt;

      const refs = [];
      const refProd = $("refProduct").files?.[0];
      const refModel = $("refModel").files?.[0];
      for (const f of [refProd, refModel].filter(Boolean)) {
        if (f.size > 8 * 1024 * 1024) { setStatus(`File ${f.name} > 8MB. Kecilkan dulu.`, true); return; }
        refs.push(await fileToBase64(f));
      }

      setStatus("Menghasilkan gambar…");
      $("btnGenerate").disabled = true;

      const blobs = await requestImages({ apiKey, prompt, count, ratio, refImages: refs });
      renderResults(blobs);
      setStatus(`Selesai. ${blobs.length} gambar dihasilkan.`);
    } catch (err) {
      console.error("DETAIL ERROR:", err);
      setStatus(`Gagal: ${err.message || err}`, true);
    } finally {
      $("btnGenerate").disabled = false;
    }
  });
});