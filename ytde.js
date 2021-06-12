// const http = require('http')
const express = require("express");
const ytde = require("youtube-dl-exec");
const fs = require("fs");
const app = express();
const dotenv = require("dotenv");
const { reverse } = require("dns");
const { url } = require("inspector");
dotenv.config();
const port = process.env.PORT;
const env = process.env.NODE_ENV;

// const readQueries = fs.readFileSync("stats.json", "utf8");
// const queries_data = JSON.parse(readQueries);
// let queries = queries_data.queries;

app.use(express.static("public"));
let m3ulink = "";
app.set("view-engine", "ejs");

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

function countQueries() {
	queries += 1;
	queries_data.queries = queries;
	fs.writeFileSync("stats.json", JSON.stringify(queries_data));
}

app.get("/search", async (req, res) => {
	url = req.query.url;
	if (!url) {
		// res.send("No url provided");
		res.render("index.ejs", {
			results: "false",
			message: "No link provided",
			expires: "none",
			title: "home",
		});
	} else if (url.includes("youtu")) {
		res.render("index.ejs", {
			results: "false",
			message: "Sorry, requests for youtube streams cannot be handled at the moment. Please try again later",
			expires: "none",
			title: "home",
		});
	} else {
		try {
			if (env == "prod") {
				m3ulink = await ytde(url, { getUrl: true });
			} else {
				m3ulink =
					"https://edge305.stream.highwebmedia.com/live-hls/amlst:ms_seductive-sd-1fde6507b56d2ace0e9fd009ad03e980e9ce21681856bbdc2e0073a4c7c4425e_trns_h264/chunklist_w108457715_b5128000_t64RlBTOjMwLjA=.m3u8";
				// m3ulink =
				// "https://manifest.googlevideo.com/api/manifest/hls_playlist/expire/1622143964/ei/fJ-vYNONCc3sW_uNtIgD/ip/105.162.25.171/id/nA9UZF-SZoQ.3/itag/300/source/yt_live_broadcast/requiressl/yes/ratebypass/yes/live/1/sgoap/gir%3Dyes%3Bitag%3D140/sgovp/gir%3Dyes%3Bitag%3D298/hls_chunk_host/r3---sn-n545gpjvh-ocvz.googlevideo.com/playlist_duration/30/manifest_duration/30/vprv/1/playlist_type/DVR/initcwndbps/2970/mh/j6/mm/44/mn/sn-n545gpjvh-ocvz/ms/lva/mv/m/mvi/3/pl/21/dover/11/keepalive/yes/fexp/24001373,24007246/mt/1622122110/sparams/expire,ei,ip,id,itag,source,requiressl,ratebypass,live,sgoap,sgovp,playlist_duration,manifest_duration,vprv,playlist_type/sig/AOq0QJ8wRAIgM1YeWpumdT3Gg8zUyu_bxtw8c8trY_mtsPAVRzCMGBQCIDT2nfSs6_rLqyjZu_X1zEYsc72b1E_j5Fq63bLcYX0o/lsparams/hls_chunk_host,initcwndbps,mh,mm,mn,ms,mv,mvi,pl/lsig/AG3C_xAwRgIhAJ_6z8P35MAf_t2ImJwI-G1j3oQZU4O-Dlg6WtHpRTKIAiEAoeh2MjPg1X513CkjdNwBk5D8TWCEJ7Uk4gxa0E4r_F0%3D/playlist/index.m3u8";
			}
			message_text = "";
			if (url.includes("youtu")) {
				var start = m3ulink.indexOf("expire/");
				var ei = m3ulink.indexOf("/ei");
				var epoch = Number(m3ulink.substring(start, ei).split("/")[1]);
				expires = new Date(epoch * 1000);
			} else {
				expires = "none";
			}

			res.render("index.ejs", {
				results: "true",
				message: message_text,
				m3ulink: m3ulink,
				sourcelink: url,
				expires: expires,
				title: "home",
				queries: "none",
			});
		} catch (error) {
			message_text = "Could not get stream link. Please check the url or supported sites";
			res.render("index.ejs", { results: "false", message: message_text, title: "home", expires: "none" });
		}
	}
});

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
	// if (env == "prod") {
	// 	res.send("Section under construction. Check back soon.");
	// } else {
	res.render("history.ejs", { title: "history" });
	// }
});
app.get("/headless", async (req, res) => {
	const url = req.query.url
	if (!url) {
		res.status(400).send("no url provided");
	} else if (url.includes("youtu")) {
		res.status(500).send("Sorry, Youtube stream requests cannot be handled at the moment");
	} else {
		try {
			m3ulink = await ytde(url, { getUrl: true });
			if (req.query.json == "true") {
				res.json({ m3ulink: m3ulink });
			} else {
				res.redirect(302, m3ulink);
			}
		} catch (error) {
			if (req.query.json == "true") {
				res.status(400).json({ error: "unable to locate video link" });
			} else {
				res.status(400).send("Unable to locate video link. Incorrect url or service not supported");
			}
		}
	}
});

app.get("/iptv-query", (req, res) => {
	res.send("use /headless?url=url");
});

app.use(function (req, res, next) {
	res.status(404).render("404.ejs", { title: "404" });
});

app.listen(port);
