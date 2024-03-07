/*  by Naufal Taufiq Ridwan
    Github : https://github.com/n0l3r
    Don't remove credit.
*/

const fetch = require("node-fetch");
const chalk = require("chalk");
const fs = require("fs");
const puppeteer = require("puppeteer");
const { exit } = require("process");
const { resolve, parse } = require("path");
const path = require("path");
const { reject } = require("lodash");
const {Headers} = require('node-fetch');
const {ArgumentParser} = require('argparse');
const readline = require('readline');
const moment = require('moment')

// const { EOF } = require("dns");




const parser = new ArgumentParser({
    description: 'Node.js TikTok Downloader'
  });

parser.add_argument('-w', {action:'store_true',help:'Downloads Videos With Watermark'});
parser.add_argument('-s', {action:'store_true',help:'Only does a single iteration of link-gathering'});
parser.add_argument('--amount', {help:'Specify number of videos to download',type:'int'});

// -t txtfile -u url -m username  -w watermark included
group=parser.add_mutually_exclusive_group({required:true})

group.add_argument('-f', '--txt', { help: 'Download All Video URL\'s In A Text File' });
group.add_argument('-m', '--mass', { help: 'Mass Download Via Username eg.(@catpippi)' });
group.add_argument('-u','--url',{ help: 'Tiktok Url eg. (https://www.tiktok.com/@catpippi/video/7310806096568945962)' });


//adding useragent to avoid ip bans

const headers = new Headers();
headers.append('User-Agent', 'TikTok 26.2.0 rv:262018 (iPhone; iOS 14.4.2; en_US) Cronet');


const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));


async function writeLog(error_name,page,browser,error=undefined){
    const crash_log_path=path.join(__dirname,`crash_logs/${moment().format('YYYY-MM-DD_hh-mm-ss.SSS')}_${error_name}`)
    fs.mkdirSync(crash_log_path)
    if(error){
        fs.writeFile(`${crash_log_path}/crash.txt`, error.toString(), err => {
            if (err) {
            console.error(err);
            }
        });
    }

    await page.screenshot({
    "type": "png",
    "path": `${crash_log_path}/screenshot.png`,  
    "fullPage": true,  
    }).catch(() => {
        
    });
    
}


const generateUrlProfile = (username) => {
    var baseUrl = "https://www.tiktok.com/";
    if (username.includes("@")) {
        baseUrl = `${baseUrl}${username}`;
    } else {
        baseUrl = `${baseUrl}@${username}`;
    }
    return baseUrl;
};

const downloadMedia = async (item,username,skip) => {
    const folder =path.join(__dirname,`downloads/${username[0]}/`);

    if(!fs.existsSync(folder)){
        fs.mkdirSync(folder)
    }
    
    // check for slideshow
    if (item.images.length != 0) {
        console.log(chalk.green("[*] Downloading Sildeshow"));
        let index = 0;
        await item.images.forEach(image_url => {
            const fileName = `${item.id}_${index}.jpeg`;
            // check if file was already downloaded
            if (fs.existsSync(folder + fileName)) {
                if(skip){
                    console.log(chalk.yellow(`[!] File '${fileName}' already exists. Skipping`));
                    exit()
                }
                return;
            }
            index++;
            const downloadFile = fetch(image_url);
            
            downloadFile.then((res) => {
                
                if(res.status==404){

                    console.log(chalk.yellow(`[!] File '${fileName}' is corrupted or doesnt exist (404)`))
        
                }
                else{
                    const file = fs.createWriteStream(folder + fileName);
                    res.body.pipe(file)
                    file.on("finish", () => {
                        file.close()
                        resolve()
                    });
                    file.on("error", (err) => reject(err));
                }
            });
        });

        return;
    } else {
        const fileName = `${item.id}.mp4`;
        // check if file was already downloaded
        if (fs.existsSync(folder + fileName)) {
            if(skip){
                console.log(chalk.yellow(`[!] File '${fileName}' already exists. Skipping`));
                exit()
            }
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
    try {
        var res = JSON.parse(body);
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

    const data = {
        url: urlMedia,
        images: image_urls,
        id: idVideo
    }
    return data;
}

const getListVideoByUsername = async (username,snipe) => {

    var baseUrl = await generateUrlProfile(username)
  
    const browser = await puppeteer.launch({
        headless: false,
    })
    
    const page = await browser.newPage()
    // Time without image blocking Time elapsed is          101881.39950000122 101.88 seconds
    // Time with image blocking Time elapsed is             100231.26790000126 101.231 seconds
    // Time with image,css & font blocking Time elapsed is  103028.19510000199

    // || request.resourceType() === 'stylesheet' || request.resourceType()=='font'
    await page.setRequestInterception(true)
    page.on('request', (request) => {
    if (request.resourceType() === 'image') request.abort()
    else request.continue()
    })

    await loadCookie(page);
    page.setUserAgent(
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_14_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/85.0.4182.0 Safari/537.36"
      );
    await page.goto(baseUrl).catch(err =>{
         console.error(err)
         exit();
    });
    await page.keyboard.press('Escape')
    const delay_milliseconds=3000
    const delay_after_load=1000
    const num_refreshes=10
    
    //this loop refreshes the page num_refreshes times whilst trying to click a refresh button
    // after the refresh button dissapears the code with throw an error leading into the catch block meaning that it has loaded
    // the catch block will check if refresh button has dissapeared using truthy/fasly boolean checking
    // if the element is still there it means a true crash happened and a log needs to be created
    
    await page.keyboard.press('Escape')
    // I made the code wait to load instead of constantly refreshing should save me some money!
    try {
        // await page.reload()
        await sleep(delay_milliseconds)
    
        const xpathSelector = "//button[contains(text(),'Refresh')]"; // Replace with your XPath
        await page.evaluate(xpath => {
            const xpathResult = document.evaluate(xpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null);
            const element = xpathResult.singleNodeValue;
            if (element) {
                element.click()
            }
        }, xpathSelector);

        await sleep(delay_after_load)
    } 

    catch (error) {
            //the writelog code was here until I broke it down into a function
            await writeLog("element_error",page,browser,error)
            await browser.close()
        
    }
    

    // I need to add a catches on the page.keyboard.press
    await page.keyboard.press('Escape')
    var listVideo = []
    console.log(chalk.green("[*] Getting list video from: " + username))
    var loop = true
    var no_video_found=false
   
    while(loop) {
        listVideo = await page.evaluate(() => {
        const listVideo = document.querySelectorAll('a');
    
        const videoUrls2 = Array.from(listVideo).map(item => item.href)
            .filter(href => href.includes('/video/') || href.includes('/photo/'))
            .filter((value, index, self) => self.indexOf(value) === index).map(item=>item.replace('photo','video'));
        // https://www.tiktok.com/@daniellarsonwork24/photo/7320008509586738478
        // const slideShowUrls2 = Array.from(listVideo).map(item => item.href)
        //     .filter(href => href.includes('/photo/'))
        //     .filter((value, index, self) => self.indexOf(value) === index).map(item=>item.replace('photo','video'));
//return videoUrls2.concat(slideShowUrls2);
return videoUrls2;
        });
        if(snipe){
            loop=false
        }
        console.log(chalk.green(`[*] ${listVideo.length} video found`))
        previousHeight = await page.evaluate("document.body.scrollHeight").catch(() => {
            
        });
        await page.evaluate("window.scrollTo(0, document.body.scrollHeight)").catch(() => {
            // Just catching the error
        })
        // I may be able to consider a faster timeout due to images beings disabled                           
        await page.waitForFunction(`document.body.scrollHeight > ${previousHeight}`, {timeout: 10000})
        .catch(() => {
            console.log(chalk.red("[X] No more video found"));
            console.log(chalk.green(`[*] Total video found: ${listVideo.length}`))
            loop = false
            if(listVideo.length===0){
                no_video_found=true
            }
            
            
        });
        await new Promise((resolve) => setTimeout(resolve, 1000));
    } 

    if(no_video_found){
        await writeLog("no_video_found",page,browser)
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

const loadCookie = async (page) => {
    //could be useful in future so ill keep it
    const cookieJson = await fs.readFileSync(path.join(__dirname,'cookies.json'));
    const cookies = JSON.parse(cookieJson);
    await page.setCookie(...cookies);
}




(async () => {    
    // let results=await writeVideoAndReadVideosFromDB('daniellarsonwork24','https://www.tiktok.com/@daniellarsonwork24/video/99921218319966153571536174')
    // console.log(results)
    // exit()
    if(!fs.existsSync(path.join(__dirname,'downloads'))){
        fs.mkdirSync(path.join(__dirname,'downloads'))
    }
    if(!fs.existsSync(path.join(__dirname,'crash_logs'))){
        fs.mkdirSync(path.join(__dirname,'crash_logs'))
    }

    const args =parser.parse_args()
    
    // const choice = await getChoice();
    var listVideo = [];
    //choice.choice === "Mass Download (Username)"
    if (args.mass) {
        // const usernameInput = await getInput("Enter the username with @ (e.g. @username) : ");
        
        const username = args.mass
        listVideo = await getListVideoByUsername(username,args.s);
        if(listVideo.length === 0) {
            console.log(chalk.yellow("[!] Error: No video found"));
            exit();
        }
    } else if (args.txt) {
        var urls = [];
        // Get URL from file
        // const fileInput = await getInput("Enter the file path : ");
        const file = args.txt;

        if(!fs.existsSync(path.join(__dirname,'crash_logs',file))) {
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
        // const urlInput = await getInput("Enter the URL : ");
        //                  await getRedirectUrl(urlInput.input);
        const url = args.url
        listVideo.push(url);
    }

    console.log(chalk.green(`[!] Found ${listVideo.length} video`));

    let deleted_videos_count = 0;


    for(var i = 0; i < (args.amount?args.amount:listVideo.length); i++){
    
        console.log(chalk.green(`[*] Downloading video ${i+1} of ${listVideo.length}`));
        console.log(chalk.green(`[*] URL: ${listVideo[i]}`));
        // choice.type == "With Watermark"
        var data = await getVideo(listVideo[i], (args.w));
        // Data will be null if an account is private but I am not sure how to overcome this
        // check if video was deleted => data empty
        if (data == null) {
            console.log(chalk.yellow(`[!] Video ${i+1} was deleted!`));
            deleted_videos_count++;
            continue;
        }
        // This regex extracts usernames for folder naming and skipping
        const username=listVideo[i].match(/@([^\/]+)/)
        
       

        await downloadMedia(data,username,args.k).then(() => {
            console.log(chalk.green("[+] Downloaded successfully"));
        })
        .catch(err => {
            console.log(chalk.red("[X] Error: " + err));
        });
    }
    console.log(chalk.yellow(`[!] ${deleted_videos_count} of ${listVideo.length} videos were deleted!`));
    
    // await login("james","123123123",undefined)
})();
