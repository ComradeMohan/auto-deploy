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

// =========================
// DEPLOY PORTFOLIO ROUTE
// =========================
app.post("/deploy", async (req, res) => {
  try {
    const { username, html } = req.body;

    if (!username || !html) {
      return res.status(400).json({ error: "Missing username or html" });
    }

    // ---------------------------
    // 1. Create a new Netlify site
    // ---------------------------
    const siteRes = await fetch("https://api.netlify.com/api/v1/sites", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${NETLIFY_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: `portfolio-${username}-${Date.now()}`
      }),
    });

    const site = await siteRes.json();
    if (!site.id) {
      return res.status(500).json({ error: "Failed to create Netlify site", details: site });
    }

    const siteId = site.id;

    // ---------------------------
    // 2. Create ZIP containing index.html
    // ---------------------------
    const zip = new JSZip();
    zip.file("index.html", html);
    const zipBuffer = await zip.generateAsync({ type: "nodebuffer" });

    // ---------------------------
    // 3. Deploy ZIP to Netlify
    // ---------------------------
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

    // ---------------------------
    // 4. Return working live URL
    // ---------------------------
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

// =========================
// START SERVER
// =========================
app.listen(3000, () => console.log("Backend running on port 3000"));
