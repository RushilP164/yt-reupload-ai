const { google } = require("googleapis");
require("dotenv").config();

async function fetchCleanTrendingShorts({ keyword = "latest bollywood celebrity podcast ranveer", region = "IN", max = 15 }) {
	const oauth2 = new google.auth.OAuth2(process.env.GOOGLE_CLIENT_ID, process.env.GOOGLE_CLIENT_SECRET);
	oauth2.setCredentials({ refresh_token: process.env.GOOGLE_REFRESH_TOKEN });

	const youtube = google.youtube({ version: "v3", auth: oauth2 });

	// Step 1: Search videos matching topic
	const search = await youtube.search.list({
		part: ["id", "snippet"],
		q: keyword,
		type: "video",
		videoDuration: "short",
		maxResults: max,
		regionCode: region,
		order: "viewCount",
	});

	const videoIds = search.data.items.map((i) => i.id.videoId).join(",");

	// Step 2: Fetch full video info
	const details = await youtube.videos.list({
		part: ["snippet", "statistics", "contentDetails"],
		id: videoIds,
	});

	const cleanVideos = details.data.items.filter((video) => {
		const { title, channelTitle, description } = video.snippet;
		const views = parseInt(video.statistics.viewCount || 0, 10);
		const duration = video.contentDetails.duration;

		const isPopular = views > 10000;
		const isTrusted = !/tiktok|reels|clips|insta/i.test(channelTitle + title + description);

		return isPopular && isTrusted;
	});

	return cleanVideos.map((v) => ({
		title: v.snippet.title,
		channel: v.snippet.channelTitle,
		url: `https://www.youtube.com/watch?v=${v.id}`,
		views: v.statistics.viewCount,
		duration: v.contentDetails.duration,
	}));
}

fetchCleanTrendingShorts({ keyword: "latest bollywood celebrity podcast", region: "IN", max: 20 })
	.then((results) => {
		results.forEach((v, i) => {
			console.log(`${i + 1}. [${v.views} views] ${v.title}`);
			console.log("   ", v.url);
		});
	})
	.catch(console.error);
