const fetch = require('node-fetch');
const chalk = require('chalk');
const readline = require('readline-sync');
const fs = require('fs');

const downloadVideo = (url, idVideo) => new Promise((resolve, reject) => {
    console.log(chalk.blue(`[*] Downloading (${idVideo})`));
    const res = fetch(url);
    res.then(res => {
        const folder = `downloads/`;
        const fileName = `download_${idVideo}.mp4`;
        const file = fs.createWriteStream(folder+fileName);
        res.body.pipe(file);
        file.on('finish', () => {
            file.close();
            resolve(fileName);
        });
    });
});


const getVideoTiktok = (url) => new Promise((resolve, reject) => {
    const API_URL = `https://api.tiktokv.com/aweme/v1/multi/aweme/detail/?aweme_ids=%5B${url}%5b`;
    console.log(chalk.blue(`[*] Fetching ${url}`));
    fetch(API_URL, {
        method: 'GET',
    })
    .then(res => res.json())
    .then(res => resolve(res))
    .catch(err => reject(err))
    console.log(chalk.blue(`[*] Removing watermark`));
    console.log(chalk.blue(`[*] Done fetching ${url}`));
});


(async () => {
    try {
        console.log(chalk.yellow("[+] Starting Tiktok Downloader..."));
        const url = readline.question(chalk.yellow("[+] Enter the URL of the video: "));

        if (!url) {
            console.log(chalk.red("[-] URL is required"));
            return;
        }
        
        if (url.includes("vm.tiktok.com") || url.includes("vt.tiktok.com")) {
             var newUrl = await fetch(url, {
                redirect: 'follow',
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

    } catch (error) {
        console.log(error);
    }

})();