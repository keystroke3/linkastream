// const http = require('http')
const express = require("express");
const ytde = require("youtube-dl-exec");
const fs = require("fs");
const app = express();
const dotenv = require("dotenv");
const {promisify, isRegExp} = require('util')


dotenv.config();
const PORT = process.env.PORT;
const ENV = process.env.NODE_ENV;
// ENV = 'prod'
const REDIS_PORT = process.env.REDIS_PORT;
const REDIS_EXP = process.env.REDIS_EXP;

const redis = require('redis')
const client = redis.createClient({host:'127.0.0.1', port:REDIS_PORT })

const GET_ASYNC	= promisify(client.get).bind(client)
const SET_ASYNC	= promisify(client.set).bind(client)

app.use(express.static("public"));
let m3ulink = "";
app.set("view-engine", "ejs");


async function Search(url) {
	if (!url) {
		return { fail: 1, code: 6 };
	}
	try {
		if (ENV == "prod") {
			m3ulink = await ytde(url, { getUrl: true });
		} else {
			m3ulink =
				"https://manifest.googlevideo.com/api/manifest/hls_playlist/expire/1623553182/ei/PiDFYKedE-WcmLAPud6cqAs/ip/105.162.21.192/id/lu_BJKxqGnk.1/itag/96/source/yt_live_broadcast/requiressl/yes/ratebypass/yes/live/1/sgoap/gir%3Dyes%3Bitag%3D140/sgovp/gir%3Dyes%3Bitag%3D137/hls_chunk_host/r5---sn-n545gpjvh-ocvz.googlevideo.com/playlist_duration/30/manifest_duration/30/vprv/1/playlist_type/DVR/initcwndbps/3300/mh/Fr/mm/44/mn/sn-n545gpjvh-ocvz/ms/lva/mv/m/mvi/5/pl/22/dover/11/keepalive/yes/fexp/24001373,24007246/beids/9466587/mt/1623531385/sparams/expire,ei,ip,id,itag,source,requiressl,ratebypass,live,sgoap,sgovp,playlist_duration,manifest_duration,vprv,playlist_type/sig/AOq0QJ8wRQIhAKRH2vqtKkmUYYake7AWr35pFV3CZ4j_VEm2s54bD1G0AiAXBNmFfD_UgBuh1S4GXKN6kJQD8vA69zrP1yAQl08GRA%3D%3D/lsparams/hls_chunk_host,initcwndbps,mh,mm,mn,ms,mv,mvi,pl/lsig/AG3C_xAwRQIgeFLAKRN-amvz6eSrwdhiqw2jMRqclLn6xXkABsPsfckCIQC7BGGBp0kS3v5qV31yMSVJlKJFr_QiEBZv2y3ygtyxrw%3D%3D/playlist/index.m3u8";
		}
		if (url && url.includes("youtu")) {
			var start = m3ulink.indexOf("expire/");
			var ei = m3ulink.indexOf("/ei");
			epoch = Number(m3ulink.substring(start, ei).split("/")[1]);
			expires = new Date(epoch * 1000);
		} else {
			expires = 'none'
		}
		data = {m3ulink:m3ulink, expires:expires.toString()}
		const saveSearch = await SET_ASYNC(url, JSON.stringify(data), 'ex',REDIS_EXP)
		return {
			fail: 0,
			data:data
		};
	} catch (err) {
		if (!err.stderr){
			return { fail: 1, code: 0 };
		}
		if (err.stderr.includes("429")) {
			return { fail: 1, code: 1 };
		} else if (err.stderr.includes("Unsupported") || err.stderr.includes("not known")) {
			return { fail: 1, code: 2 };
		} else if (err.stderr.includes("said")) {
			message = err.stderr.split(":").slice(1).join();
			return { fail: 1, code: 3, message: message };
		} else if (err.stderr.includes("proxy")) {
			return { fail: 1, code: 4 };
		} else if (err.stderr.includes("offline")) {
			return { fail: 1, code: 5 };
		} else if (err.stderr.includes("Not Found")) {
			return { fail: 1, code: 7 };
		} else {
            console.log(err)
            return {fail: 1, code:0}
        } 

	}
}

async function Show(req, res, headless = false, json = false) {
	data = await GET_ASYNC(req.query.url)
	if (data){
		data = JSON.parse(data)
		console.log('using cached data', req.query.url )
		search = ''
	}else{
		console.log('fetching new data', req.query.url)
		search = await Search(req.query.url)
        try{
        if (!search.fail){
		data = search.data
        }} catch(err){
        return res.status(500).send('unknown server error')}
	}
	if (!search.fail) {
		if (headless) {
			if (json) {
				return res.json({ m3ulink: data.m3ulink });
			}
			return res.redirect(302, data.m3ulink);
		}

		url = req.query.url;
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
		function message() {
			switch (search.code) {
				case 0:
					return "Failed due to unknown error. Error has been logged";
				case 1:
					return "Too many requests. Please try again later";
				case 2:
					return "Invalid link or platform is unsupported. Please check the link or refer to Supported sites";
				case 3:
					return data.message;
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
		message_text = message();

		if (headless) {
			if (json) {
				return res.status(400).json({ code: search.code, error: message_text });
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

app.use(function (req, res, next) {
	// res.status(404).render("404.ejs", { title: "404" });
	return res.status(404)
});

app.listen(PORT);
