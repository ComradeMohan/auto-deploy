import express from "express";
import cors from "cors";
import fetch from "node-fetch";
import dotenv from "dotenv";
import JSZip from "jszip";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json({ limit: "10mb" }));

const NETLIFY_TOKEN = process.env.NETLIFY_TOKEN;

// =======================================================
// Clean Netlify site naming: username-portfolio, fallback
// =======================================================
async function createNetlifySite(username) {
  let baseName = `${username}-portfolio`;
  let finalName = baseName;
  let attempt = 0;

  while (true) {
    const siteRes = await fetch("https://api.netlify.com/api/v1/sites", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${NETLIFY_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ name: finalName })
    });

    const site = await siteRes.json();

    // SUCCESS → return the site object
    if (site.id) return site;

    // Name already taken → try next
    attempt++;
    finalName = `${baseName}-${attempt}`;
  }
}

// =======================================================
// DEPLOY ROUTE (Main API endpoint)
// =======================================================
app.post("/deploy", async (req, res) => {
  try {
    const { username, html } = req.body;

    if (!username || !html) {
      return res.status(400).json({ error: "Missing username or html" });
    }

    // ---------------------------------------------------
    // 1. Create Netlify Site (clean naming)
    // ---------------------------------------------------
    const site = await createNetlifySite(username);
    const siteId = site.id;

    // ---------------------------------------------------
    // 2. Create ZIP file containing "index.html"
    // ---------------------------------------------------
    const zip = new JSZip();
    zip.file("index.html", html);

    const zipBuffer = await zip.generateAsync({ type: "nodebuffer" });

    // ---------------------------------------------------
    // 3. Deploy ZIP to Netlify
    // ---------------------------------------------------
    const deployRes = await fetch(
      `https://api.netlify.com/api/v1/sites/${siteId}/deploys`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${NETLIFY_TOKEN}`,
          "Content-Type": "application/zip",
        },
        body: zipBuffer
      }
    );

    const deploy = await deployRes.json();

    // ---------------------------------------------------
    // 4. Send final working URL to frontend
    // ---------------------------------------------------
    return res.json({
      success: true,
      url: site.ssl_url,
      siteId,
      deployId: deploy.id
    });

  } catch (error) {
    console.error("Deploy Error:", error);
    res.status(500).json({ error: error.message });
  }
});

// =======================================================
// START SERVER
// =======================================================
app.listen(3000, () => console.log("🚀 Backend running on port 3000"));
