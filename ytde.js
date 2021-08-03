// const http = require('http')
const express = require("express");
const ytde = require("youtube-dl-exec");
const fs = require("fs");
const app = express();
const path = require("path");
const dotenv = require("dotenv");
const { promisify, isRegExp } = require("util");

dotenv.config();
const PORT = process.env.PORT;
// const ENV = process.env.NODE_ENV;
ENV = "prod";
const REDIS_PORT = process.env.REDIS_PORT;
const REDIS_EXP = process.env.REDIS_EXP;
const SERVICE_DOWN = process.env.SERVICE_DOWN;
const redis = require("redis");
const { stderr, title } = require("process");
const client = redis.createClient({ host: "127.0.0.1", port: REDIS_PORT });

const GET_ASYNC = promisify(client.get).bind(client);
const SET_ASYNC = promisify(client.set).bind(client);

app.use(express.static("public"));
let m3ulink = "";
app.set("view-engine", "ejs");

async function Search(url, host) {
	if (!url) {
		return { fail: 1, code: 6 };
	}
	if (url.includes(".m3u") || url.includes("googlevideo")) {
		console.error(`DENIED:\n + ${url}`);
		return { fail: 1, code: 2 };
	}
	try {
		if (ENV == "prod") {
			m3ulink = await ytde(url, { getUrl: true });
		} else {
			m3ulink =
				"https://manifest.googlevideo.com/api/manifest/hls_playlist/expire/1623553182/ei/PiDFYKedE-WcmLAPud6cqAs/ip/105.162.21.192/id/lu_BJKxqGnk.1/itag/96/source/yt_live_broadcast/requiressl/yes/ratebypass/yes/live/1/sgoap/gir%3Dyes%3Bitag%3D140/sgovp/gir%3Dyes%3Bitag%3D137/hls_chunk_host/r5---sn-n545gpjvh-ocvz.googlevideo.com/playlist_duration/30/manifest_duration/30/vprv/1/playlist_type/DVR/initcwndbps/3300/mh/Fr/mm/44/mn/sn-n545gpjvh-ocvz/ms/lva/mv/m/mvi/5/pl/22/dover/11/keepalive/yes/fexp/24001373,24007246/beids/9466587/mt/1623531385/sparams/expire,ei,ip,id,itag,source,requiressl,ratebypass,live,sgoap,sgovp,playlist_duration,manifest_duration,vprv,playlist_type/sig/AOq0QJ8wRQIhAKRH2vqtKkmUYYake7AWr35pFV3CZ4j_VEm2s54bD1G0AiAXBNmFfD_UgBuh1S4GXKN6kJQD8vA69zrP1yAQl08GRA%3D%3D/lsparams/hls_chunk_host,initcwndbps,mh,mm,mn,ms,mv,mvi,pl/lsig/AG3C_xAwRQIgeFLAKRN-amvz6eSrwdhiqw2jMRqclLn6xXkABsPsfckCIQC7BGGBp0kS3v5qV31yMSVJlKJFr_QiEBZv2y3ygtyxrw%3D%3D/playlist/index.m3u8";
		}
		if (url && url.includes("youtu") && !url.includes("m.you")) {
			var start = m3ulink.indexOf("expire/");
			var ei = m3ulink.indexOf("/ei");
			epoch = Number(m3ulink.substring(start, ei).split("/")[1]);
			expires = new Date(epoch * 1000);
		} else {
			expires = "none";
		}
		data = { m3ulink: m3ulink, expires: expires.toString() };
		const saveSearch = await SET_ASYNC(url, JSON.stringify(data), "ex", REDIS_EXP);
		return {
			fail: 0,
			data: data,
		};
	} catch (err) {
		console.error(new Date() + "Problem url \n" + url);
		console.error(err);
		if (!err.stderr) {
			return { fail: 1, code: 0 };
		} else if (err.stderr.includes("proxy")) {
			const setGeoLocked = await SET_ASYNC(url, JSON.stringify({ code: 4 }));
			return { fail: 1, code: 4 };
		} else if (err.stderr.includes("429")) {
			const setTooMany = await SET_ASYNC(host, "true", "ex", 600);
			return { fail: 1, code: 1 };
		} else if (
			err.stderr.includes("Unsupported") ||
			err.stderr.includes("not known") ||
			err.stderr.includes("valid URL")
		) {
			return { fail: 1, code: 2 };
		} else if (err.stderr.includes("said")) {
			message = err.stderr.split(":").slice(1).join();
			data = { fail: 1, code: 3, message: message };
			const setSaid = await SET_ASYNC(url, JSON.stringify(data), "EX", 900);
			return data;
		} else if (err.stderr.includes("offline") || err.stderr.includes("a few moments")) {
			const setOfflin = await SET_ASYNC(url, JSON.stringify({ code: 5 }, "EX", 900));
			return { fail: 1, code: 5 };
		} else if (err.stderr.includes("Not found") || err.stderr.includes("404")) {
			const setNotFound = await SET_ASYNC(url, JSON.stringify({ code: 7 }));
			return { fail: 1, code: 7 };
		} else {
			return { fail: 1, code: 0 };
		}
	}
}

function extractHostname(url, tld) {
	let hostname;

	//find & remove protocol (http, ftp, etc.) and get hostname
	if (url.indexOf("://") > -1) {
		hostname = url.split("/")[2];
	} else {
		hostname = url.split("/")[0];
	}

	//find & remove port number
	hostname = hostname.split(":")[0];

	//find & remove "?"
	hostname = hostname.split("?")[0];

	if (tld) {
		let hostnames = hostname.split(".");
		hostname = hostnames[hostnames.length - 2] + "." + hostnames[hostnames.length - 1];
	}

	return hostname;
}

function message(code) {
	switch (code) {
		case 0:
			return "Failed due to unknown error. Error has been logged";
		case 1:
			return "Too many requests. Please try again later";
		case 2:
			return "Invalid link or platform is unsupported. Please check the link or refer to Supported sites";
		case 3:
			return code.message;
		case 4:
			return "Sorry, the stream is not available in the server region";
		case 5:
			return "The stream is offline";
		case 6:
			return "No url provided";
		case 7:
			return "Stream or channel does not exist";
	}
}

async function Show(req, res, headless = false, json = false) {
	url = req.query.url;
	host = extractHostname(url);
	data = await GET_ASYNC(url);
	tooMany = await GET_ASYNC(host);
	try {
		if (data) {
			data = JSON.parse(data);
			if (!data.code) {
				console.log("using cached data");
				search = "";
			} else if (tooMany) {
				console.error(`${new Date()}STALLING: too many requests for ${host}`);
				console.error(`STALLING: ${url}`);
				error = { fail: 1, code: 1 };
				throw error;
			} else {
				throw { code: data.code };
			}
		} else {
			console.log("fetching new data");
			search = await Search(url, host);
			try {
				if (!search.fail) {
					data = search.data;
				}
			} catch (err) {
				return res.status(500).send("unknown server error");
			}
		}
		if (!search.fail) {
			if (headless) {
				if (json) {
					return res.json({ m3ulink: data.m3ulink });
				}
				return res.redirect(302, data.m3ulink);
			}

			message_text = "";
			res.render("index.ejs", {
				results: "true",
				message: message_text,
				m3ulink: data.m3ulink,
				sourcelink: url,
				expires: data.expires,
				title: "home",
				queries: "none",
			});
		} else {
			throw search;
		}
	} catch (error) {
		console.log(error);
		message_text = message(error.code);
		console.error(new Date() + "\n" + url + "\n" + message_text);
		if (headless) {
			if (json) {
				return res.status(400).json({ code: error.code, error: message_text });
			}
			return res.status(400).send(message_text);
		}

		res.render("index.ejs", {
			results: "false",
			message: message_text,
			expires: "none",
			title: "home",
			queries: "none",
		});
	}
}

if (SERVICE_DOWN === true) {
	app.get("/", (req, res) => {
		res.render("503.ejs", {
			title: "Service Down",
		});
	});
	app.get("/search", async (req, res) => {
		res.render("503.ejs", {
			title: "Service Down",
		});
	});

	app.get("/headless", async (req, res) => {
		res.send("Service down for maintainance. We will be back soon");
	});
} else {
	app.get("/", (req, res) => {
		message_text = "";
		res.render("index.ejs", {
			results: "false",
			message: message_text,
			expires: "none",
			title: "home",
			queries: "none",
		});
	});
	app.get("/search", async (req, res) => {
		Show(req, res);
	});

	app.get("/headless", async (req, res) => {
		req.query.json ? (json = true) : (json = false);
		Show(req, res, (headless = true), (json = json));
	});
}

app.get("/supported", (req, res) => {
	const readFileLines = (filename) => fs.readFileSync(filename).toString("UTF8").split("\n");
	let arr = readFileLines("ytd-list");
	res.render("supported.ejs", { sites: arr, title: "supported" });
});

app.get("/donate", (req, res) => {
	message_text = "";
	res.render("donate.ejs", { results: "false", message: message_text, expires: "none", title: "donate" });
});

app.get("/about", (req, res) => {
	res.render("about.ejs", { title: "about" });
});

app.get("/faq", (req, res) => {
	res.render("faq.ejs", { title: "faq" });
});

app.get("/cutepuppy", (req, res) => {
	res.render("cutepuppy.ejs", { title: "cutepuppy" });
});

app.get("/history", (req, res) => {
	res.render("history.ejs", { title: "history" });
});

app.get("/iptv-query", (req, res) => {
	res.send("use /headless?url=url");
});

app.get("/ads.txt", (req, res) => {
	fs.readFile("public/ads.txt", "uft8", (err, data) => {
		if (err) {
			console.error(err);
			res.send(500);
		}
		res.send(data);
	});
});

app.use(function (req, res, next) {
	// res.status(404).render("404.ejs", { title: "404" });
	return res.status(404);
});

app.listen(PORT);
