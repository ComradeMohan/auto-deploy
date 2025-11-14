import express from "express";
import cors from "cors";
import fetch from "node-fetch";
import dotenv from "dotenv";
import JSZip from "jszip";
import fileUpload from "express-fileupload";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use(fileUpload());

const NETLIFY_TOKEN = process.env.NETLIFY_TOKEN;

// ---------------------------------------------------
// CLEAN SITE NAME + AUTO-INCREMENT IF TAKEN
// ---------------------------------------------------
async function createNetlifySite(username) {
  let baseName = `${username}-portfolio`.toLowerCase().replace(/[^a-z0-9-]/g, '-').substring(0, 40);
  let finalName = baseName;
  let attempt = 0;

  while (true) {
    try {
      const siteRes = await fetch("https://api.netlify.com/api/v1/sites", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${NETLIFY_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name: finalName }),
      });

      const site = await siteRes.json();

      if (site.id) return site; // success

      attempt++;
      finalName = `${baseName}-${attempt}`;
    } catch (err) {
      console.error("Site creation error:", err);
      throw err;
    }
  }
}

// ---------------------------------------------------
// CLEAN HTML BEFORE SAVING
// ---------------------------------------------------
function cleanHTML(html) {
  if (typeof html !== 'string') {
    html = html.toString('utf8');
  }
  
  return html
    .replace(/\\"/g, '"')
    .replace(/\\n/g, '\n')
    .replace(/\\t/g, '\t')
    .replace(/\\\\/g, '\\');
}

// ---------------------------------------------------
// MAIN DEPLOY ENDPOINT
// ---------------------------------------------------
app.post("/deploy", async (req, res) => {
  try {
    let { username, html } = req.body;

    if (!username) {
      return res.status(400).json({ error: "Username is required" });
    }

    // If frontend POSTs a FILE instead of html string
    if (!html && req.files?.portfolio) {
      html = req.files.portfolio.data.toString("utf8");
    }

    if (!html) {
      return res.status(400).json({ error: "HTML content is required" });
    }

    // CLEAN THE HTML
    const cleanedHTML = cleanHTML(html);

    // STEP 1 — Create Netlify Site
    console.log(`Creating site for user: ${username}`);
    const site = await createNetlifySite(username);
    const siteId = site.id;
    console.log(`Site created: ${siteId}`);

    // STEP 2 — Build ZIP with proper structure
    const zip = new JSZip();
    
    // Add index.html
    zip.file("index.html", cleanedHTML);
    
    // Add _headers file for correct MIME type
    zip.file("_headers", 
      "/*\n  Content-Type: text/html; charset=utf-8\n  X-Content-Type-Options: nosniff\n"
    );
    
    // Add netlify.toml for proper configuration
    zip.file("netlify.toml",
      `[build]\n  command = "echo 'Deployed!'\n  publish = "/"\n\n[[redirects]]\n  from = "/*"\n  to = "/index.html"\n  status = 200\n`
    );

    const zipBuffer = await zip.generateAsync({ type: "nodebuffer" });
    console.log(`ZIP created: ${zipBuffer.length} bytes`);

    // STEP 3 — Deploy ZIP to Netlify
    const deployRes = await fetch(
      `https://api.netlify.com/api/v1/sites/${siteId}/deploys`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${NETLIFY_TOKEN}`,
          "Content-Type": "application/zip",
        },
        body: zipBuffer,
      }
    );

    if (!deployRes.ok) {
      const error = await deployRes.text();
      console.error("Netlify deploy error:", error);
      return res.status(500).json({ error: `Netlify error: ${error}` });
    }

    const deploy = await deployRes.json();
    console.log(`Deploy created: ${deploy.id}`);

    // STEP 4 — Return success with final URL
    res.json({
      success: true,
      url: `https://${site.name}.netlify.app`,
      siteId,
      deployId: deploy.id,
      sslUrl: site.ssl_url,
    });

  } catch (error) {
    console.error("Deploy Error:", error.message);
    res.status(500).json({ 
      error: error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined 
    });
  }
});

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({ status: "ok", token: NETLIFY_TOKEN ? "✓" : "✗" });
});

// START SERVER
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Backend running on port ${PORT}`));
