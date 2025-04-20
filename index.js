require("dotenv").config();
const { google } = require("googleapis");

const { fetchOriginalSnippet, downloadShort1080, fetchAutoTranscript, uploadToYouTube } = require("./utils/helpers");
const { generateMetaGemini } = require("./utils/ai-helpers");

const processShort = async (videoId) => {
	const timestamp = Date.now();
	const url = `https://www.youtube.com/watch?v=${videoId}`;
	const oauth2 = new google.auth.OAuth2(process.env.GOOGLE_CLIENT_ID, process.env.GOOGLE_CLIENT_SECRET);
	oauth2.setCredentials({ refresh_token: process.env.GOOGLE_REFRESH_TOKEN });

	// STEP 1
	console.log("1️⃣  Downloading video & fetching title, description & transcript...");
	const { title, description } = await fetchOriginalSnippet(oauth2, videoId);

	const videoLocation = await downloadShort1080(url, "short." + timestamp);

	const transcipt = await fetchAutoTranscript(videoId);

	// STEP 2
	console.log("2️⃣  Generating new title & description...");
	const meta = await generateMetaGemini(transcipt, title, description);

	// STEP 3
	// console.log("3️⃣  Uploading to YouTube...");
	// await uploadToYouTube(oauth2, videoLocation, meta);

	console.log("🎉 Done!");
};

const videoId = process.argv[2];
if (!videoId) {
	console.error("Error: Please provide valid url");
	process.exit(1);
}

processShort(videoId).catch((err) => {
	console.error("Error:", err);
	process.exit(1);
});
