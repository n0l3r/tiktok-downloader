/*  by Naufal Taufiq Ridwan
    Github : https://github.com/n0l3r
    Don't remove credit.
*/

const fetch = require("node-fetch");
const chalk = require("chalk");
const inquirer = require("inquirer");
const fs = require("fs");
const puppeteer = require("puppeteer");
const { exit } = require("process");
const { resolve } = require("path");
const { reject } = require("lodash");
const {Headers} = require('node-fetch');
const readline = require('readline');


//adding useragent to avoid ip bans
const headers = new Headers();
headers.append('User-Agent', 'TikTok 26.2.0 rv:262018 (iPhone; iOS 14.4.2; en_US) Cronet');

function writeFile(conteudo, nomeArquivo) {
    try {
        fs.writeFileSync(nomeArquivo, conteudo);
        console.log(`Arquivo '${nomeArquivo}' criado com sucesso.`);
      } catch (err) {
        console.error('Ocorreu um erro ao criar o arquivo:', err);
      }
  }

const getChoice = () => new Promise((resolve, reject) => {
    inquirer.prompt([
        {
            type: "list",
            name: "choice",
            message: "Choose a option",
            choices: ["Mass Download (Username)", "Mass Download with (txt)", "Single Download (URL)"]
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

const downloadMedia = async (item) => {
    const folder = "downloads/";

    // check for slideshow
    if (item.images.length != 0) {
        console.log(chalk.green("[*] Downloading Sildeshow"));

        let index = 0;
        item.images.forEach(image_url => {
            const fileName = `${item.id}_${index}.jpeg`;
            // check if file was already downloaded
            if (fs.existsSync(folder + fileName)) {
                console.log(chalk.yellow(`[!] File '${fileName}' already exists. Skipping`));
                return;
            }
            index++;
            const downloadFile = fetch(image_url);
            const file = fs.createWriteStream(folder + fileName);
            
            downloadFile.then(res => {
                res.body.pipe(file)
                file.on("finish", () => {
                    file.close()
                    resolve()
                });
                file.on("error", (err) => reject(err));
            });
        });

        return;
    } else {
        const fileName = `${item.id}.mp4`;
        // check if file was already downloaded
        if (fs.existsSync(folder + fileName)) {
            console.log(chalk.yellow(`[!] File '${fileName}' already exists. Skipping`));
            return;
        }
        const downloadFile = fetch(item.url);
        const file = fs.createWriteStream(folder + fileName);
        
        downloadFile.then(res => {
            res.body.pipe(file)
            file.on("finish", () => {
                file.close()
                resolve()
            });
            file.on("error", (err) => reject(err));
        });
    }
}
// url contains the url, watermark is a bool that tells us what link to use
const getVideo = async (url, watermark) => {
    const idVideo = await getIdVideo(url)
    const API_URL = `https://api16-normal-c-useast1a.tiktokv.com/aweme/v1/feed/?aweme_id=${idVideo}`;
    const request = await fetch(API_URL, {
        method: "GET",
        headers : headers
    });
    const body = await request.text();
    let res;
    try {
        res = JSON.parse(body);
    } catch (err) {
        console.error("Error:", err);
        console.error("Response body:", body);
    }

    // check if video was deleted
    if (res.aweme_list[0].aweme_id != idVideo) {
        return null;
    }

    let urlMedia = "";

    let image_urls = []
    let description = ""
    let created_at = 0;
    let statistics;
    let duration;
    let extra;
    // check if video is slideshow
    if (!!res.aweme_list[0].image_post_info) {
        console.log(chalk.green("[*] Video is slideshow"));

        // get all image urls
        res.aweme_list[0].image_post_info.images.forEach(element => {
            // url_list[0] contains a webp
            // url_list[1] contains a jpeg
            image_urls.push(element.display_image.url_list[1]);
        });

       
    } else {
        // download_addr vs play_addr
        urlMedia = (watermark) ? res.aweme_list[0].video.download_addr.url_list[0] : res.aweme_list[0].video.play_addr.url_list[0];
    }
    description = res.aweme_list[0].desc;
    created_at = res.aweme_list[0].create_time;
    statistics = res.aweme_list[0].statistics;
    duration = res.aweme_list[0].duration;
    extra = res.aweme_list[0].original_client_text;
    const data = {
        url: urlMedia,
        images: image_urls,
        id: idVideo,
        description,
        created_at,
        statistics,
        duration,
        extra,
    }
    return data;
}

const getListVideoByUsername = async (username) => {
    var baseUrl = await generateUrlProfile(username)
    const browser = await puppeteer.launch({
        headless: false,
    })
    const page = await browser.newPage()
    page.setUserAgent(
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_14_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/85.0.4182.0 Safari/537.36"
      );
    await page.goto(baseUrl)
    var listVideo = []
    console.log(chalk.green("[*] Getting list video from: " + username))
    var loop = true
    while(loop) {
        listVideo = await page.evaluate(() => {
            const listVideo = document.querySelectorAll('a');
            const videoUrls2 = Array.from(listVideo).map(item => item.href)
            .filter(href => href.includes('/video/'))
            .filter((value, index, self) => self.indexOf(value) === index);
            return videoUrls2;
        });
        console.log(chalk.green(`[*] ${listVideo.length} video found`))
        previousHeight = await page.evaluate("document.body.scrollHeight");
        await page.evaluate("window.scrollTo(0, document.body.scrollHeight)")
        await page.waitForFunction(`document.body.scrollHeight > ${previousHeight}`, {timeout: 10000})
        .catch(() => {
            console.log(chalk.red("[X] No more video found"));
            console.log(chalk.green(`[*] Total video found: ${listVideo.length}`))
            loop = false
        });
        await new Promise((resolve) => setTimeout(resolve, 1000));
    }
    await browser.close()
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
    // Tiktok ID is usually 19 characters long and sits after /video/
    let idVideo = url.substring(url.indexOf("/video/") + 7, url.indexOf("/video/") + 26);
    return (idVideo.length > 19) ? idVideo.substring(0, idVideo.indexOf("?")) : idVideo;
}

function daysSinceTo(startDate, endDate) {
    const diferencaEmMilissegundos = endDate - startDate;
    const diasDiferenca = Math.floor(diferencaEmMilissegundos / (1000 * 60 * 60 * 24));
  
    return diasDiferenca;
}
  
  
(async () => {    
    const header = "\r\n \/$$$$$$$$ \/$$$$$$ \/$$   \/$$ \/$$$$$$$$ \/$$$$$$  \/$$   \/$$       \/$$$$$$$   \/$$$$$$  \/$$      \/$$ \/$$   \/$$ \/$$        \/$$$$$$   \/$$$$$$  \/$$$$$$$  \/$$$$$$$$ \/$$$$$$$ \r\n|__  $$__\/|_  $$_\/| $$  \/$$\/|__  $$__\/\/$$__  $$| $$  \/$$\/      | $$__  $$ \/$$__  $$| $$  \/$ | $$| $$$ | $$| $$       \/$$__  $$ \/$$__  $$| $$__  $$| $$_____\/| $$__  $$\r\n   | $$     | $$  | $$ \/$$\/    | $$  | $$  \\ $$| $$ \/$$\/       | $$  \\ $$| $$  \\ $$| $$ \/$$$| $$| $$$$| $$| $$      | $$  \\ $$| $$  \\ $$| $$  \\ $$| $$      | $$  \\ $$\r\n   | $$     | $$  | $$$$$\/     | $$  | $$  | $$| $$$$$\/        | $$  | $$| $$  | $$| $$\/$$ $$ $$| $$ $$ $$| $$      | $$  | $$| $$$$$$$$| $$  | $$| $$$$$   | $$$$$$$\/\r\n   | $$     | $$  | $$  $$     | $$  | $$  | $$| $$  $$        | $$  | $$| $$  | $$| $$$$_  $$$$| $$  $$$$| $$      | $$  | $$| $$__  $$| $$  | $$| $$__\/   | $$__  $$\r\n   | $$     | $$  | $$\\  $$    | $$  | $$  | $$| $$\\  $$       | $$  | $$| $$  | $$| $$$\/ \\  $$$| $$\\  $$$| $$      | $$  | $$| $$  | $$| $$  | $$| $$      | $$  \\ $$\r\n   | $$    \/$$$$$$| $$ \\  $$   | $$  |  $$$$$$\/| $$ \\  $$      | $$$$$$$\/|  $$$$$$\/| $$\/   \\  $$| $$ \\  $$| $$$$$$$$|  $$$$$$\/| $$  | $$| $$$$$$$\/| $$$$$$$$| $$  | $$\r\n   |__\/   |______\/|__\/  \\__\/   |__\/   \\______\/ |__\/  \\__\/      |_______\/  \\______\/ |__\/     \\__\/|__\/  \\__\/|________\/ \\______\/ |__\/  |__\/|_______\/ |________\/|__\/  |__\/\r\n\n by n0l3r (https://github.com/n0l3r)\n"
    console.log(chalk.blue(header))
    let _username;
    const choice = await getChoice();
    var listVideo = [];
    if (choice.choice === "Mass Download (Username)") {
        const usernameInput = await getInput("Enter the username with @ (e.g. @username) : ");
        const username = usernameInput.input;
        _username = username;
        listVideo = await getListVideoByUsername(username);
        if(listVideo.length === 0) {
            console.log(chalk.yellow("[!] Error: No video found"));
            exit();
        }
    } else if (choice.choice === "Mass Download with (txt)") {
        var urls = [];
        // Get URL from file
        const fileInput = await getInput("Enter the file path : ");
        const file = fileInput.input;

        if(!fs.existsSync(file)) {
            console.log(chalk.red("[X] Error: File not found"));
            exit();
        }

        // read file line by line
        const rl = readline.createInterface({
            input: fs.createReadStream(file),
            crlfDelay: Infinity
        });

        for await (const line of rl) {
            if (urls.includes(line)) {
                console.log(chalk.yellow(`[!] Skipping duplicate entry: ${line}`));
                continue;
            }
            urls.push(line);
            console.log(chalk.green(`[*] Found URL: ${line}`));
        }
        

        for(var i = 0; i < urls.length; i++) {
            const url = await getRedirectUrl(urls[i]);
            listVideo.push(url);
        }
    } else {
        const urlInput = await getInput("Enter the URL : ");
        const url = await getRedirectUrl(urlInput.input);
        listVideo.push(url);
    }

    console.log(chalk.green(`[!] Found ${listVideo.length} video`));

    let deleted_videos_count = 0;
    const retrodata = {
        all_video_count: listVideo.length,
        all_video_duration_secs: 0,
        date_first_video: undefined,
        all_video_count_2023: 0,
        all_video_duration_2023_secs: 0,
        all_statistics: {
            comment_count: 0,
            digg_count: 0,
            download_count: 0,
            play_count: 0,
            share_count: 0,
            forward_count: 0,
            lose_count: 0,
            lose_comment_count: 0,
            whatsapp_share_count: 0,
            collect_count: 0
        },
        all_statistics_2023: {
            comment_count: 0,
            digg_count: 0,
            download_count: 0,
            play_count: 0,
            share_count: 0,
            forward_count: 0,
            lose_count: 0,
            lose_comment_count: 0,
            whatsapp_share_count: 0,
            collect_count: 0
        },
        best_statistics_2023: {
            comment_count: {
                value: 0,
                video_ids: [],
            },
            digg_count: {
                value: 0,
                video_ids: [],
            },
            download_count: {
                value: 0,
                video_ids: [],
            },
            play_count: {
                value: 0,
                video_ids: [],
            },
            share_count: {
                value: 0,
                video_ids: [],
            },
            forward_count: {
                value: 0,
                video_ids: [],
            },
            lose_count: {
                value: 0,
                video_ids: [],
            },
            lose_comment_count: {
                value: 0,
                video_ids: [],
            },
            whatsapp_share_count: {
                value: 0,
                video_ids: [],
            },
            collect_count: {
                value: 0,
                video_ids: [],
            }
        },
        best_statistics: {
            comment_count: {
                value: 0,
                video_ids: [],
            },
            digg_count: {
                value: 0,
                video_ids: [],
            },
            download_count: {
                value: 0,
                video_ids: [],
            },
            play_count: {
                value: 0,
                video_ids: [],
            },
            share_count: {
                value: 0,
                video_ids: [],
            },
            forward_count: {
                value: 0,
                video_ids: [],
            },
            lose_count: {
                value: 0,
                video_ids: [],
            },
            lose_comment_count: {
                value: 0,
                video_ids: [],
            },
            whatsapp_share_count: {
                value: 0,
                video_ids: [],
            },
            collect_count: {
                value: 0,
                video_ids: [],
            }
        },
        duration_media_secs: 0,
        duration_media_secs_2023: 0,
        longest_video_secs: {
            duration: 0,
            video_ids: undefined,
        },
        longest_video_secs_2023: {
            duration: 0,
            video_ids: undefined,
        },
        videos_per_day: 0,
        videos_per_day_2023: 0,
        tags_count: {
            _: 0
        },
        tags_count_2023: {
            _: 0
        }
    }

    function orderTags(tags) {
        // Convertendo o objeto em um array de arrays [chave, valor]
        const entries = Object.entries(tags);

        // Ordenando o array com base nos valores em ordem decrescente
        const ordenado = entries.sort((a, b) => b[1] - a[1]);

        // Convertendo o array ordenado de volta para objeto
        const tagsOrdenadas = Object.fromEntries(ordenado);
        return tagsOrdenadas
    }
    function getNewLongestVideo(longestVideo, data) {
        if (longestVideo.duration < data.duration){
            return {
                duration: data.duration,
                video_ids: [data.id] 
            }
        } else if (longestVideo.duration ===  data.duration) {
            return {
                duration: longestVideo.duration,
                video_ids: [...longestVideo.video_ids, data.id]
            }

        }
        return longestVideo;
    }
    function getNewTagCount(tags_count, data) {
        if (data.extra && data.extra.text_extra) {
            const tags = data.extra.text_extra.map(i => i.hashtag_name)
            return tags.reduce((acc, tag) => {
                console.log('acc, tag', acc, tag)
                if (acc[tag]) {
                    acc[tag] = acc[tag] + 1;
                } else {
                    acc[tag] = 1;
                }
                return acc;
            }, tags_count)
        }
        return tags_count;
    }

    function writeIfIsEqualOrIsBest(_retrodata, _key, data){
        const nOb = {
            [_key]: {
                value: 0,
                video_ids: [],
            }
        }
        if(_retrodata[_key].value <  data.statistics[_key]) {
            nOb[_key].video_ids = [data.id];
            nOb[_key].value  =  data.statistics[_key];
            return nOb;
        } else if (_retrodata[_key].value ===  data.statistics[_key] && _retrodata[_key].value != 0) {
            nOb[_key].value = _retrodata[_key].value;
            nOb[_key].video_ids = [..._retrodata[_key].video_ids, data.id];
            return nOb;
        }
        return {
            [_key]: _retrodata[_key],
        }
    }
    function getNewBestStatistics(statisticsData, data) {
        return {
            ...writeIfIsEqualOrIsBest(statisticsData, 'comment_count', data),
            ...writeIfIsEqualOrIsBest(statisticsData, 'digg_count', data),
            ...writeIfIsEqualOrIsBest(statisticsData, 'download_count', data),
            ...writeIfIsEqualOrIsBest(statisticsData, 'play_count', data),
            ...writeIfIsEqualOrIsBest(statisticsData, 'share_count', data),
            ...writeIfIsEqualOrIsBest(statisticsData, 'forward_count', data),
            ...writeIfIsEqualOrIsBest(statisticsData, 'lose_count', data),
            ...writeIfIsEqualOrIsBest(statisticsData, 'lose_comment_count', data),
            ...writeIfIsEqualOrIsBest(statisticsData, 'whatsapp_share_count', data),
            ...writeIfIsEqualOrIsBest(statisticsData, 'collect_count',  data),
        }
    }
    const listRawData = [];
    for(var i = 0; i < listVideo.length; i++){
        console.log(chalk.green(`[*] Downloading video ${i+1} of ${listVideo.length}`));
        console.log(chalk.green(`[*] URL: ${listVideo[i]}`));
        var data = await getVideo(listVideo[i], (choice.type == "With Watermark"));
        
        listRawData.push(data)
        // check if video was deleted => data empty
        if (data == null) {
            console.log(chalk.yellow(`[!] Video ${i+1} was deleted!`));
            deleted_videos_count++;
            continue;
        }
        const created_date = new Date(data.created_at *1000);

        
        retrodata.all_video_duration_secs = retrodata.all_video_duration_secs + (data.duration / 1000); 
        retrodata.all_statistics.comment_count = retrodata.all_statistics.comment_count + data.statistics.comment_count;
        retrodata.all_statistics.digg_count = retrodata.all_statistics.digg_count + data.statistics.digg_count;
        retrodata.all_statistics.download_count = retrodata.all_statistics.download_count + data.statistics.download_count;
        retrodata.all_statistics.play_count = retrodata.all_statistics.play_count + data.statistics.play_count;
        retrodata.all_statistics.share_count = retrodata.all_statistics.share_count + data.statistics.share_count;
        retrodata.all_statistics.forward_count = retrodata.all_statistics.forward_count + data.statistics.forward_count;
        retrodata.all_statistics.lose_count = retrodata.all_statistics.lose_count + data.statistics.lose_count;
        retrodata.all_statistics.lose_comment_count = retrodata.all_statistics.lose_comment_count + data.statistics.lose_comment_count;
        retrodata.all_statistics.whatsapp_share_count = retrodata.all_statistics.whatsapp_share_count + data.statistics.whatsapp_share_count;
        retrodata.all_statistics.collect_count = retrodata.all_statistics.collect_count + data.statistics.collect_count;
        retrodata.best_statistics = getNewBestStatistics(retrodata.best_statistics, data)
        retrodata.tags_count = orderTags(getNewTagCount(retrodata.tags_count, data))
        retrodata.longest_video_secs = getNewLongestVideo(retrodata.longest_video_secs, data)
        if (created_date.getFullYear() == 2023) {
            retrodata.all_video_count_2023 = retrodata.all_video_count_2023 + 1;
            retrodata.all_video_duration_2023_secs = retrodata.all_video_duration_2023_secs + (data.duration / 1000);

            retrodata.all_statistics_2023.comment_count = retrodata.all_statistics_2023.comment_count + data.statistics.comment_count;
            retrodata.all_statistics_2023.digg_count = retrodata.all_statistics_2023.digg_count + data.statistics.digg_count;
            retrodata.all_statistics_2023.download_count = retrodata.all_statistics_2023.download_count + data.statistics.download_count;
            retrodata.all_statistics_2023.play_count = retrodata.all_statistics_2023.play_count + data.statistics.play_count;
            retrodata.all_statistics_2023.share_count = retrodata.all_statistics_2023.share_count + data.statistics.share_count;
            retrodata.all_statistics_2023.forward_count = retrodata.all_statistics_2023.forward_count + data.statistics.forward_count;
            retrodata.all_statistics_2023.lose_count = retrodata.all_statistics_2023.lose_count + data.statistics.lose_count;
            retrodata.all_statistics_2023.lose_comment_count = retrodata.all_statistics_2023.lose_comment_count + data.statistics.lose_comment_count;
            retrodata.all_statistics_2023.whatsapp_share_count = retrodata.all_statistics_2023.whatsapp_share_count + data.statistics.whatsapp_share_count;
            retrodata.all_statistics_2023.collect_count = retrodata.all_statistics_2023.collect_count + data.statistics.collect_count;
            retrodata.best_statistics_2023 = getNewBestStatistics(retrodata.best_statistics_2023, data)
            retrodata.tags_count_2023 = orderTags(getNewTagCount(retrodata.tags_count_2023, data))
            
            retrodata.longest_video_secs_2023 = getNewLongestVideo(retrodata.longest_video_secs_2023, data)
       
        }

        if (false) {
            downloadMedia(data).then(() => {
                console.log(chalk.green("[+] Downloaded successfully"));
            }).catch(err => {
                console.log(chalk.red("[X] Error: " + err));
            });
        }

    }
    retrodata.duration_media_secs = retrodata.all_video_duration_secs / retrodata.all_video_count;
    retrodata.duration_media_secs_2023 = retrodata.all_video_duration_2023_secs /retrodata.all_video_count_2023;

    retrodata.videos_per_day_2023 = retrodata.all_video_count_2023 / daysSinceTo(new Date(2023, 0, 1), new Date())
    writeFile(JSON.stringify(listRawData, null, 2), _username.slice(1)+'.rawlist.json');
    writeFile(JSON.stringify(retrodata, null, 2), _username.slice(1)+'.result.json');
    console.log(chalk.yellow(`[!] ${deleted_videos_count} of ${listVideo.length} videos were deleted!`));
})();
