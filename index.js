require("dotenv").config();
const { google } = require("googleapis");

const { fetchOriginalSnippet, downloadShort1080, fetchAutoTranscript, uploadToYouTube } = require("./utils/helpers");
const { generateMetaGemini } = require("./utils/ai-helpers");

const processShort = async (url) => {
	const timestamp = Date.now();
	const oauth2 = new google.auth.OAuth2(process.env.GOOGLE_CLIENT_ID, process.env.GOOGLE_CLIENT_SECRET);
	oauth2.setCredentials({ refresh_token: process.env.GOOGLE_REFRESH_TOKEN });

	// STEP 1
	console.log("1️⃣  Downloading video & fetching title, description & transcript...");
	const { title, description } = await fetchOriginalSnippet(oauth2, url);

	const videoLocation = await downloadShort1080(url, "short." + timestamp);

	const transcipt = await fetchAutoTranscript(url);

	// STEP 2
	console.log("2️⃣  Generating new title & description...");
	const meta = await generateMetaGemini(transcipt, title, description);

	// STEP 3
	console.log("3️⃣  Uploading to YouTube...");
	await uploadToYouTube(oauth2, videoLocation, meta);

	console.log("🎉 Done!");
};

// ──────────────────────────────────────────────────────────────
// Entry point
// ──────────────────────────────────────────────────────────────
if (require.main === module) {
	const url = process.argv[2];
	if (!url) {
		console.error("Usage: node index.js <YouTube-Shorts-URL>");
		process.exit(1);
	}
	processShort(url).catch((err) => {
		console.error("Error:", err);
		process.exit(1);
	});
}
