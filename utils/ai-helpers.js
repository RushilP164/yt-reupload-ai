const generateMetaGemini = async (transcript, originalTitle, originalDesc) => {
	// ToDo: improve prompt to avoid manual effort
	let transciptDetails = "";
	if (transcript.languages.length) {
		const langsText = transcript.languages.join(", ");
		transciptDetails = `Transcript is available in following languages codes: ${langsText}`;
	}
	const prompt = `
You are a YouTube Shorts & Video SEO expert. Your task is to generate the youtube's improved title & description for given details along with proper hashtags.
You are given video transcript, original title & original description.
${transciptDetails}
Output *only* a raw JSON object EXACTLY matching this schema & without any additional text:

{
  "new_title": "<punchy title, max 100 chars, with original & new hashtags>",
  "new_description": "<full description, max 1000 chars, with original & new hashtags>",
  "hash_tags": "<all hash_tags which are used in new_title & new_description>"
}

Instructions:
- Use the Original Title & Description to pull any character names or context that the transcript alone might miss.
- Fuse that with the transcript to craft an engaging new title & description.
- Title should be max 100 characters. 3-7 total hashtags in Title.
- Use all the required hashtags in description. 2 lines of space between text & hashtags.
- Description's hash tags should be started with #staytunedwithrd
- Keep in mind that, we are re-uploading someone's video. So description should be like we are promoting original video.
- Do not keep any links in description.
- All hash tags used in title & description should be listed in hash_tags array.


- Output MUST BE a VALID RAW JSON OBJECT IN A GIVEN FORMAT WHICH CAN BE PARSED in JS.
- Output only a raw JSON string — no markdown, no json fences, no extra text.
- Do not include raw newlines or tabs — use \\\\n and \\\\t instead (escaped backslash).
- Output must begin with { and end with }.

Transcript:
"""${transcript.text}"""

Original Title: "${originalTitle}"
Original Description: "${originalDesc}"
`;

	console.log(prompt);
	// Send to Gemini via the Generative Language API
	const apiKey = process.env.GEMINI_API_KEY;
	const url = `https://generativelanguage.googleapis.com/v1/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

	const res = await fetch(url, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
	});

	const body = await res.text();

	if (!res.ok) {
		throw new Error(`Gemini Flash error ${res.status}:\n${body}`);
	}

	let parsed;
	try {
		parsed = JSON.parse(body);
	} catch (e) {
		throw new Error("Malformed JSON from Gemini:\n" + body);
	}

	// Extract the first candidate
	const cand = parsed.candidates?.[0];
	if (!cand) {
		throw new Error("No `candidates[0]` in response:\n" + JSON.stringify(parsed));
	}

	// ToDo: verify this
	// Pull out the text—sometimes it's `.content`, or `.output`, or nested deeper
	let candidateText;
	if (typeof cand === "string") {
		candidateText = cand;
	} else if (typeof cand.content === "string") {
		candidateText = cand.content;
	} else if (typeof cand.output === "string") {
		candidateText = cand.output;
	} else {
		// fallback: stringify the entire candidate object
		candidateText = JSON.stringify(cand);
	}

	// Now run your JSON‐block regex on the string:
	const jsonMatch = candidateText.match(/^\{[\s\S]*\}$/m);
	if (!jsonMatch) {
		throw new Error("No pure JSON found in reply:\n" + candidateText);
	}

	// Parse as clean JSON
	const resp = JSON.parse(jsonMatch[0]);
	const raw = resp.content.parts[0].text;

	// Strip the ```json fences
	const inside = raw
		.replace(/^```json\s*/, "") // remove leading ```json
		.replace(/\s*```$/, "") // remove trailing ```
		.trim();

	// Parse as JSON
	let meta;
	try {
		meta = JSON.parse(inside);
	} catch (err) {
		console.error("Failed to parse JSON:", inside);
		throw err;
	}

	// Now you can safely access new_title
	console.log("🚀 New title is:", meta.new_title);
	console.log("🚀 New description is:", meta.new_description);
	console.log("🚀 Used Hashtags are:", meta.hash_tags);
	return { title: meta.new_title, description: meta.new_description, tags: meta.hash_tags };
};

module.exports = { generateMetaGemini };
