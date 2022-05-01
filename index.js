const fetch = require("node-fetch");
const chalk = require("chalk");
const readline = require("readline-sync");
const fs = require("fs");
const cheerio = require("cheerio");
const inquirer = require("inquirer");

const getVideoTiktokByUsername = (username) => new Promise((resolve, reject) => {
    var baseUrl = "https://www.tiktok.com/";
    if (username.includes("@")) {
        baseUrl = `${baseUrl}${username}`;
    } else {
        baseUrl = `${baseUrl}@${username}`;
    }

    fetch(baseUrl, {
        headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/83.0.4103.61 Safari/537.36"
        }
    })
    .then(res => res.text())
    .then(body => {
        const $ = cheerio.load(body)
        resolve(body);
    })
    .catch(err => reject(err));
});


const downloadVideo = (url, idVideo) => new Promise((resolve, reject) => {
    console.log(chalk.blue(`[*] Downloading (${idVideo})`));
    const res = fetch(url);
    res.then(res => {
        const folder = `downloads/`;
        const fileName = `download_${idVideo}.mp4`;
        const file = fs.createWriteStream(folder+fileName);
        res.body.pipe(file);
        file.on("finish", () => {
            file.close();
            resolve(fileName);
        });
    })
    .catch(err => reject(err));
});


const getVideoTiktok = (url) => new Promise((resolve, reject) => {
    const API_URL = `https://api.tiktokv.com/aweme/v1/multi/aweme/detail/?aweme_ids=%5B${url}%5b`;
    fetch(API_URL, {
        method: "GET",
    })
    .then(res => res.json())
    .then(res => resolve(res))
    .catch(err => reject(err))
});

const getChoice = () => new Promise((resolve, reject) => {
    inquirer.prompt([
        {
            type: "list",
            name: "choice",
            message: "Choose a option",
            choices: ["Mass Download (Username)", "Single Download (URL)", "Exit"]
        }
    ])
    .then(res => resolve(res))
    .catch(err => reject(err));
});

(async () => {
    try {
        var urls = [];
        console.log(chalk.magenta("Starting Tiktok Downloader..."));

        const choice = await getChoice();

        if(choice.choice == "Exit"){
            console.log(chalk.red("Exiting..."));
            return;
        }

        if(choice.choice == "Mass Download (Username)"){ 
            const username = readline.question(chalk.yellow("[*] Enter the profile username: "));
            const html = await getVideoTiktokByUsername(username);
            const $ = cheerio.load(html);
            $("a").each(function(i, elem){
                var url = $(this).attr("href");
                if (url.length >= 54){
                    if (!url.includes("business") && !url.includes("legal")) {
                        urls.push(url);
                    }
                }
            });
            if(urls.length === 0){
                console.log(chalk.red("[x] No videos found"));
                process.exit();
            } else{
                console.log(chalk.green(`[+] ${urls.length} videos found`));
            }
        } else{
            const url = readline.question(chalk.yellow("[+] Enter the URL of the video: "));

            if (!url) {
                console.log(chalk.red("[x] URL is required"));
                return;
            }
            urls.push(url);
        }

        urls.forEach(async (url) => {
            if(url.includes("vm.tiktok.com") || url.includes("vt.tiktok.com")){
                 var newUrl = await fetch(url, {
                    redirect: "follow",
                    follow: 1,
                });
                var idVideo = newUrl.url.split("/")[5].split("?", 1)[0];
            } else{
                var idVideo = url.split("/")[5].split("?", 1)[0];
            }
            const res = await getVideoTiktok(idVideo);
            const urlDownload = res.aweme_details[0].video.play_addr.url_list[0];
            await downloadVideo(urlDownload, idVideo);
            console.log(chalk.green(`[+] Done downloading (${idVideo})`));
        });
    } catch (error) {
        console.log(error);
    }

})();