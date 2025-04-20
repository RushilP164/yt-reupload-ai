const { google } = require("googleapis");
const { fetchVideoDetails } = require("./utils/helpers");
require("dotenv").config();

const canReupload = async (videoId) => {
	const video = await fetchVideoDetails(videoId);
	console.log(video);
	if (!video || !video.snippet || !video.status) return false;

	const title = (video.snippet.title || "").toLowerCase();
	const desc = (video.snippet.description || "").toLowerCase();
	const license = video.status.license || "";
	const channelTitle = (video.snippet.channelTitle || "").toLowerCase();

	// ✅ 1. Must be Creative Commons license
	const isCreativeCommons = license === "creativeCommon";

	// ✅ 2. Avoid reposts or scraped content
	const isRepost = /tiktok|reels|via|viral|clip|compilation|trending|shorts|insta/i.test(title + desc + channelTitle);

	// ✅ 3. Avoid obvious copyright-risky terms
	const isCopyrightRisk = /movie|song|scene|music|film|album|bgm|trailer/i.test(title + desc);

	// 🔍 4. Soft signals (optional, for logging/scoring)
	const isExplicitlyReusable = /reuse|public domain|creative commons/i.test(desc);
	const isTrustedBrand = /ted|gov|edu|nasa|creativecommons|free to reuse/i.test(channelTitle + desc);

	// // Final result
	// const isClean = !isRepost && !isCopyrightRisk;

	console.log({
		"Is Creative Commons (Mandatory)": isCreativeCommons,
		"IS Repost": isRepost,
		"Is Copyright Risk": isCopyrightRisk,
		"Is Explicitly Reusable (Optional)": isExplicitlyReusable,
		"Is Trusted Brand (Optional)": isTrustedBrand,
	});
};

canReupload(process.argv[2]);
