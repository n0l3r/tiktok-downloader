/*  by Naufal Taufiq Ridwan
    Github : https://github.com/n0l3r
    Don't remove credit.
*/

const fetch = require("node-fetch");
const chalk = require("chalk");
const inquirer = require("inquirer");
const cheerio = require("cheerio");
const fs = require("fs");
const { exit } = require("process");
const { resolve } = require("path");
const { reject } = require("lodash");

const getChoice = () => new Promise((resolve, reject) => {
    inquirer.prompt([
        {
            type: "list",
            name: "choice",
            message: "Choose a option",
            choices: ["Mass Download (Username)", "Mass Download (URL)", "Single Download (URL)"]
        },
        {
            type: "list",
            name: "type",
            message: "Choose a option",
            choices: ["With Watermark", "Without Watermark"]
        }
    ])
    .then(res => resolve(res))
    .catch(err => reject(err));
});

const getInput = (message) => new Promise((resolve, reject) => {
    inquirer.prompt([
        {
            type: "input",
            name: "input",
            message: message
        }
    ])
    .then(res => resolve(res))
    .catch(err => reject(err));
});

const generateUrlProfile = (username) => {
    var baseUrl = "https://www.tiktok.com/";
    if (username.includes("@")) {
        baseUrl = `${baseUrl}${username}`;
    } else {
        baseUrl = `${baseUrl}@${username}`;
    }
    return baseUrl;
};

const downloadMediaFromList = async (list) => {
    const folder = "downloads/"
    list.forEach((item) => {
        const fileName = `${item.id}.mp4`
        const downloadFile = fetch(item.url)
        const file = fs.createWriteStream(folder + fileName)
        
        console.log(chalk.green(`[+] Downloading ${fileName}`))

        downloadFile.then(res => {
            res.body.pipe(file)
            file.on("finish", () => {
                file.close()
                resolve()
            });
            file.on("error", (err) => reject(err));
        });
    });
}

const getVideoWM = async (idVideo) => {
    const API_URL = `https://api.tiktokv.com/aweme/v1/multi/aweme/detail/?aweme_ids=%5B${idVideo}%5b`;
    const request = await fetch(API_URL, {
        method: "GET"
    });
    const res = await request.json()
    const urlMedia = res.aweme_details[0].video.download_addr.url_list[0]
    const data = {
        url: urlMedia,
        id: idVideo
    }
    return data
}

const getVideoNoWM = async (idVideo) => {
    const API_URL = `https://api.tiktokv.com/aweme/v1/multi/aweme/detail/?aweme_ids=%5B${idVideo}%5b`;
    const request = await fetch(API_URL, {
        method: "GET"
    });
    const res = await request.json()
    const urlMedia = res.aweme_details[0].video.play_addr.url_list[0]
    const data = {
        url: urlMedia,
        id: idVideo
    }
    return data
}


const getListVideoByUsername = async (username) => {
    var baseUrl = await generateUrlProfile(username)
    const res = await fetch(baseUrl, {
        headers: {
        "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/83.0.4103.61 Safari/537.36",
        },
    });
    const body = await res.text();
    const status = await res.status;
    if(status !== 200) {
        console.log(chalk.red("[X] Error: Username not found"));
        exit();
    }
    const $ = cheerio.load(body);
    var listVideo = [];
    $("a").each((i, el) => {
        const url = $(el).attr("href");
        if (url.includes("/video/")) {
            listVideo.push(getIdVideo(url));
        }        
    });
    
    return listVideo
}
const getRedirectUrl = async (url) => {
    if(url.includes("vm.tiktok.com") || url.includes("vt.tiktok.com")) {
        url = await fetch(url, {
            redirect: "follow",
            follow: 10,
        });
        url = url.url;
        console.log(chalk.green("[*] Redirecting to: " + url));
    }
    return url;
}

const getIdVideo = (url) => {
    const matching = url.includes("/video/")
    if(!matching){
        console.log(chalk.red("[X] Error: URL not found"));
        exit();
    }
    const idVideo = url.substring(url.indexOf("/video/") + 7, url.length);
    return (idVideo.length > 19) ? idVideo.substring(0, idVideo.indexOf("?")) : idVideo;
}

(async () => {    
    const header = "\r\n \/$$$$$$$$ \/$$$$$$ \/$$   \/$$ \/$$$$$$$$ \/$$$$$$  \/$$   \/$$       \/$$$$$$$   \/$$$$$$  \/$$      \/$$ \/$$   \/$$ \/$$        \/$$$$$$   \/$$$$$$  \/$$$$$$$  \/$$$$$$$$ \/$$$$$$$ \r\n|__  $$__\/|_  $$_\/| $$  \/$$\/|__  $$__\/\/$$__  $$| $$  \/$$\/      | $$__  $$ \/$$__  $$| $$  \/$ | $$| $$$ | $$| $$       \/$$__  $$ \/$$__  $$| $$__  $$| $$_____\/| $$__  $$\r\n   | $$     | $$  | $$ \/$$\/    | $$  | $$  \\ $$| $$ \/$$\/       | $$  \\ $$| $$  \\ $$| $$ \/$$$| $$| $$$$| $$| $$      | $$  \\ $$| $$  \\ $$| $$  \\ $$| $$      | $$  \\ $$\r\n   | $$     | $$  | $$$$$\/     | $$  | $$  | $$| $$$$$\/        | $$  | $$| $$  | $$| $$\/$$ $$ $$| $$ $$ $$| $$      | $$  | $$| $$$$$$$$| $$  | $$| $$$$$   | $$$$$$$\/\r\n   | $$     | $$  | $$  $$     | $$  | $$  | $$| $$  $$        | $$  | $$| $$  | $$| $$$$_  $$$$| $$  $$$$| $$      | $$  | $$| $$__  $$| $$  | $$| $$__\/   | $$__  $$\r\n   | $$     | $$  | $$\\  $$    | $$  | $$  | $$| $$\\  $$       | $$  | $$| $$  | $$| $$$\/ \\  $$$| $$\\  $$$| $$      | $$  | $$| $$  | $$| $$  | $$| $$      | $$  \\ $$\r\n   | $$    \/$$$$$$| $$ \\  $$   | $$  |  $$$$$$\/| $$ \\  $$      | $$$$$$$\/|  $$$$$$\/| $$\/   \\  $$| $$ \\  $$| $$$$$$$$|  $$$$$$\/| $$  | $$| $$$$$$$\/| $$$$$$$$| $$  | $$\r\n   |__\/   |______\/|__\/  \\__\/   |__\/   \\______\/ |__\/  \\__\/      |_______\/  \\______\/ |__\/     \\__\/|__\/  \\__\/|________\/ \\______\/ |__\/  |__\/|_______\/ |________\/|__\/  |__\/\r\n\n by n0l3r (https://github.com/n0l3r)\n"
    console.log(chalk.blue(header))
    const choice = await getChoice();
    var listVideo = [];
    var listMedia = [];
    if (choice.choice === "Mass Download (Username)") {
        const usernameInput = await getInput("Enter the username with @ (e.g. @username) : ");
        const username = usernameInput.input;
        listVideo = await getListVideoByUsername(username);

        if(listVideo.length === 0) {
            console.log(chalk.yellow("[!] Error: No video found"));
            exit();
        }
    } else if (choice.choice === "Mass Download (URL)") {
        var urls = [];
        const count = await getInput("Enter the number of URL : "); 
        for(var i = 0; i < count.input; i++) {
            const urlInput = await getInput("Enter the URL : ");
            urls.push(urlInput.input);
        }

        for(var i = 0; i < urls.length; i++) {
            const url = await getRedirectUrl(urls[i]);
            const idVideo = await getIdVideo(url);
            listVideo.push(idVideo);
        }
    } else {
        const urlInput = await getInput("Enter the URL : ");
        const url = await getRedirectUrl(urlInput.input);
        const idVideo = await getIdVideo(url);
        listVideo.push(idVideo);
    }

    console.log(chalk.green(`[!] Found ${listVideo.length} video`));


    for(var i = 0; i < listVideo.length; i++){
        var data = (choice.type == "With Watermark") ? await getVideoWM(listVideo[i]) : await getVideoNoWM(listVideo[i]);
        listMedia.push(data);
    }

    downloadMediaFromList(listMedia)
        .then(() => {
            console.log(chalk.green("[+] Downloaded successfully"));
        })
        .catch(err => {
            console.log(chalk.red("[X] Error: " + err));
    });
    

})();