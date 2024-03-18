/*  by Naufal Taufiq Ridwan
    Github : https://github.com/n0l3r

    Dockerized, Webapp/Server, and Cloud deployable by timmbobb
    Github : https://github.com/timmbobb

    Don't remove credit.
*/

// Dependencies
const express = require('express');
const bodyParser = require('body-parser');
const chalk = require("chalk");
const fetch = require("node-fetch");
const inquirer = require("inquirer");
const fs = require("fs");
const puppeteer = require("puppeteer");
const { exit } = require("process");
const { resolve } = require("path");
const { reject } = require("lodash");
const {Headers} = require('node-fetch');
const readline = require('readline');

//load inq module
inquirer.registerPrompt('fuzzypath', require('inquirer-fuzzy-path'))

//adding useragent to avoid ip bans
const headers = new Headers();
headers.append('User-Agent', 'TikTok 26.2.0 rv:262018 (iPhone; iOS 14.4.2; en_US) Cronet');

const getVideo = async (url, watermark) => {
    const idVideo = await getIdVideo(url);
    const API_URL = `https://api16-normal-c-useast2a.tiktokv.com/aweme/v1/feed/?aweme_id=${idVideo}`;
    
    const response = await fetch(API_URL, { method: "GET", headers: headers });
    const body = await response.text();

    let res;
    try {
        res = JSON.parse(body);
    } catch (err) {
        console.error("Error parsing response:", err);
        return null;
    }

    if (res.aweme_list[0].aweme_id !== idVideo) {
        return null;
    }

    let urlMedia = "";
    let image_urls = [];

    if (!!res.aweme_list[0].image_post_info) {
        res.aweme_list[0].image_post_info.images.forEach(element => {
            image_urls.push(element.display_image.url_list[1]);
        });
    } else {
        urlMedia = watermark ? res.aweme_list[0].video.download_addr.url_list[0] : res.aweme_list[0].video.play_addr.url_list[0];
    }

    return {
        url: urlMedia,
        images: image_urls,
        id: idVideo
    };
};

const getIdVideo = async (url) => {
    if(url.includes('/t/')) {
        url = await new Promise((resolve) => {
            require('follow-redirects').https.get(url, function(res) {
                return resolve(res.responseUrl)
            });
        })
    }
    const matching = url.includes("/video/")
    if(!matching){
        console.log(chalk.red("[X] Error: URL not found"));
        exit();
    }
    // Tiktok ID is usually 19 characters long and sits after /video/
    let idVideo = url.substring(url.indexOf("/video/") + 7, url.indexOf("/video/") + 26);
    return (idVideo.length > 19) ? idVideo.substring(0, idVideo.indexOf("?")) : idVideo;
}

// Initialize Express
const app = express();
const port = process.env.PORT || 8080; // Default port for Cloud Run

// Middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public')); // Serve static files

// Home page route
app.get('/', (req, res) => {
    res.sendFile('index.html', { root: __dirname });
});

// /download endpoint
// Endpoint to handle single video download
app.get('/download', async (req, res) => {
    const url = req.query.url;
    const withWatermark = req.query.watermark === "true";

    if (!url) {
        return res.status(400).send('URL is required');
    }

    try {
        const videoData = await getVideo(url, withWatermark);
        if (!videoData || !videoData.url) {
            return res.status(404).send('Video not found');
        }

        // Stream the video directly to the client
        const response = await fetch(videoData.url);

        if (!response.ok) {
            return res.status(500).send('Failed to fetch video');
        }

        // Set the appropriate content type
        res.setHeader('Content-Type', 'video/mp4');
        // Stream the video content to the client
        response.body.pipe(res);
    } catch (error) {
        console.error(chalk.red("[X] Error: " + error));
        res.status(500).send('Error processing your request');
    }
});

// Start the server
app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});
