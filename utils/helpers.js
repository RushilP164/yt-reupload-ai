const fs = require("fs");
const { google } = require("googleapis");
const youtubedl = require("youtube-dl-exec");
const { YoutubeTranscript } = require("youtube-transcript");
const ffmpeg = require("fluent-ffmpeg");
const ffmpegPath = require("ffmpeg-static");
ffmpeg.setFfmpegPath(ffmpegPath);

const extractVideoId = (url) => {
	const m = url.match(/(?:v=|\/shorts\/|\.be\/)([A-Za-z0-9_-]{11})/);
	if (!m) throw new Error("Invalid YouTube URL");
	return m[1];
};

const fetchOriginalSnippet = async (oauth2Client, videoId) => {
	const youtube = google.youtube({ version: "v3", auth: oauth2Client });
	const res = await youtube.videos.list({
		part: ["snippet"],
		id: [videoId],
	});
	if (!res.data.items || res.data.items.length === 0) {
		throw new Error("Video not found or not accessible");
	}
	const { title, description } = res.data.items[0].snippet;
	return { title, description };
};

const fetchAutoTranscript = async (videoId) => {
	try {
		// this will give you an array of { text, duration, offset }
		const lines = await YoutubeTranscript.fetchTranscript(videoId);

		// join into one big string
		let text = "";
		const languages = [];
		lines.forEach((l) => {
			text += l.text;
			languages.push(l.lang);
		});
		console.log("🚀 Transcript fetched:", text);
		return { text, languages: Array.from(new Set(languages)) };
	} catch (error) {
		console.error("❌ No transcript available");
		return { text: "", languages: [] };
	}
};

const downloadShort1080 = async (url, basename = "short") => {
	try {
		const rawVideo = `${basename}.video.mp4`;
		const rawAudio = `${basename}.audio.m4a`;
		const output = `${basename}.mp4`;

		// 1) Download the video‐only stream (<=1080p)
		await youtubedl(url, {
			output: rawVideo,
			format: "bestvideo[height<=1080]",
		});

		// 2) Download the audio‐only stream
		await youtubedl(url, {
			output: rawAudio,
			format: "bestaudio",
		});

		// 3) Merge with ffmpeg-static
		await new Promise((resolve, reject) => {
			ffmpeg()
				.input(rawVideo)
				.input(rawAudio)
				.outputOptions("-c copy") // no re‑encoding
				.save(output)
				.on("end", resolve)
				.on("error", reject);
		});

		// Clean up temp files
		fs.unlinkSync(rawVideo);
		fs.unlinkSync(rawAudio);

		console.log(`🚀 Video Downloaded at ${output}`);
		return output;
	} catch (error) {
		throw new Error("❌ Video download failed");
	}
};

const uploadToYouTube = async (oauth2Client, videoPath, { title, description, tags }) => {
	const youtube = google.youtube({ version: "v3", auth: oauth2Client });
	const res = await youtube.videos.insert({
		part: ["snippet", "status"],
		requestBody: {
			snippet: {
				title,
				description,
				tags: tags.map((tag) => (tag.startsWith("#") ? tag.replace("#", "") : tag)),
				categoryId: "24", // Entertainment
			},
			status: { privacyStatus: "private" },
		},
		media: { body: fs.createReadStream(videoPath) },
	});

	console.log("Uploaded video ID:", res.data.id);
	return res.data.id;
};

const fetchVideoDetails = async (videoId) => {
	const oauth2 = new google.auth.OAuth2(process.env.GOOGLE_CLIENT_ID, process.env.GOOGLE_CLIENT_SECRET);
	oauth2.setCredentials({ refresh_token: process.env.GOOGLE_REFRESH_TOKEN });

	const youtube = google.youtube({ version: "v3", auth: oauth2 });

	const res = await youtube.videos.list({
		part: ["snippet", "status"],
		id: videoId,
	});

	if (!res.data.items.length) {
		throw new Error("Video not found");
	}

	return res.data.items[0]; // full video object
};

module.exports = { extractVideoId, fetchOriginalSnippet, fetchAutoTranscript, downloadShort1080, uploadToYouTube, fetchVideoDetails };
