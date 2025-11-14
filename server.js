import express from "express";
import cors from "cors";
import fetch from "node-fetch";
import dotenv from "dotenv";
dotenv.config();

const app = express();
app.use(cors());
app.use(express.json({ limit: "5mb" }));

const NETLIFY_TOKEN = process.env.NETLIFY_TOKEN;

app.post("/deploy", async (req, res) => {
  try {
    const { username, html } = req.body;
    if (!username || !html) {
      return res.status(400).json({ error: "Missing username or html" });
    }

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
      return res.status(500).json({ error: "Failed to create Netlify site", site });
    }

    const siteId = site.id;
    const htmlBuffer = Buffer.from(html, "utf8");

    const deployRes = await fetch(
      `https://api.netlify.com/api/v1/sites/${siteId}/deploys`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${NETLIFY_TOKEN}`,
          "Content-Type": "application/zip",
        },
        body: htmlBuffer
      }
    );

    const deploy = await deployRes.json();

    return res.json({
      success: true,
      url: site.ssl_url,
      siteId,
      deployId: deploy.id
    });

  } catch (error) {
    console.error("Deploy error:", error);
    res.status(500).json({ error: error.message });
  }
});

app.listen(3000, () => console.log("Backend running on port 3000"));
