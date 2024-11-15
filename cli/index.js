/*  by Naufal Taufiq Ridwan
    Github : https://github.com/n0l3r
    Don't remove credit.
*/

const fetch = require("node-fetch");
const chalk = require("chalk");
const inquirer = require("inquirer");
const fs = require("fs");
const assert = require("node:assert");
//const playwright = require('playwright')
const { chromium, devices } = require("playwright");
const { exit } = require("process");
const { resolve } = require("path");
const { reject } = require("lodash");
const { Headers } = require("node-fetch");
const readline = require("readline");

//load inq module
inquirer.registerPrompt("fuzzypath", require("inquirer-fuzzy-path"));

//adding useragent to avoid ip bans
const headers = new Headers();

// Create a retry text filter:
const RETRY_FILE = "retry.txt";

// Create the file if it does not exist
if (!fs.existsSync(RETRY_FILE)) {
  fs.writeFileSync(RETRY_FILE, "");
}

// Function to read retry.txt and get the list of URLs
const getRetryUrls = () => {
  if (!fs.existsSync(RETRY_FILE)) return [];
  return fs.readFileSync(RETRY_FILE, "utf-8").split("\n").filter(Boolean);
};

// Function to add a URL to retry.txt if a rate limit is triggered
const logRetry = (url) => {
  fs.appendFileSync(RETRY_FILE, `${url}\n`);
};

// Function to remove a URL from retry.txt after a successful download
const removeFromRetry = (url) => {
  let retries = getRetryUrls();
  retries = retries.filter((retryUrl) => retryUrl !== url);
  fs.writeFileSync(RETRY_FILE, retries.join("\n"));
};

const getChoice = () =>
  new Promise((resolve, reject) => {
    inquirer
      .prompt([
        {
          type: "list",
          name: "choice",
          message: "Choose a option",
          choices: [
            "Mass Download (Username)",
            "Mass Download with (txt)",
            "Single Download (URL)",
          ],
        },
        {
          type: "list",
          name: "type",
          message: "Choose a option",
          choices: ["With Watermark", "Without Watermark"],
        },
      ])
      .then((res) => resolve(res))
      .catch((err) => reject(err));
  });

const getInput = (message) =>
  new Promise((resolve, reject) => {
    inquirer
      .prompt([
        {
          type: "input",
          name: "input",
          message: message,
        },
      ])
      .then((res) => {
        // Split input by comma and trim each URL
        const urls = res.input.split(",").map((url) => url.trim());
        resolve(urls);
      })
      .catch((err) => reject(err));
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
  if (!fs.existsSync(folder)) fs.mkdirSync(folder, { recrusive: true });
  // check for slideshow
  if (item.images.length != 0) {
    console.log(chalk.green("[*] Downloading Sildeshow"));

    let index = 0;
    item.images.forEach((image_url) => {
      const fileName = `${item.id}_${index}.jpeg`;
      // check if file was already downloaded
      if (fs.existsSync(folder + fileName)) {
        console.log(
          chalk.yellow(`[!] File '${fileName}' already exists. Skipping`)
        );
        return;
      }
      index++;
      const downloadFile = fetch(image_url);
      const file = fs.createWriteStream(folder + fileName);

      downloadFile.then((res) => {
        res.body.pipe(file);
        file.on("finish", () => {
          file.close();
          resolve();
        });
        file.on("error", (err) => reject(err));
      });
    });

    return;
  } else {
    const fileName = `${item.id}.mp4`;
    // check if file was already downloaded
    if (fs.existsSync(folder + fileName)) {
      console.log(
        chalk.yellow(`[!] File '${fileName}' already exists. Skipping`)
      );
      return;
    }
    const downloadFile = fetch(item.url);
    const file = fs.createWriteStream(folder + fileName);

    downloadFile.then((res) => {
      res.body.pipe(file);
      file.on("finish", () => {
        file.close();
        resolve();
      });
      file.on("error", (err) => reject(err));
    });
  }
};

// url contains the url, watermark is a bool that tells us what link to use
const getVideo = async (url, watermark) => {
  const idVideo = await getIdVideo(url);
  const API_URL = `https://api22-normal-c-alisg.tiktokv.com/aweme/v1/feed/?aweme_id=${idVideo}&iid=7318518857994389254&device_id=7318517321748022790&channel=googleplay&app_name=musical_ly&version_code=300904&device_platform=android&device_type=ASUS_Z01QD&version=9`;
  const request = await fetch(API_URL, {
    method: "OPTIONS",
    headers: headers,
  });
  const body = await request.text();

  let res;
  try {
    res = JSON.parse(body);
  } catch (err) {
    console.error("Error parsing JSON:", err);
    console.error("Response body:", body);

    if (body.includes("ratelimit triggered")) {
      console.error("Rate limit triggered. Logging URL to retry.txt");
      logRetry(url); // Log the URL for retry
      return null;
    }

    // Handle other non-JSON responses here if needed
    return null;
  }

  // Safeguard against missing properties
  if (
    !res.aweme_list ||
    res.aweme_list.length === 0 ||
    res.aweme_list[0].aweme_id !== idVideo
  ) {
    console.error("Error: Video not found or deleted.");
    return null;
  }

  let urlMedia = "";
  let image_urls = [];
  // check if video is slideshow
  if (!!res.aweme_list[0].image_post_info) {
    console.log(chalk.green("[*] Video is slideshow"));

    // get all image urls
    res.aweme_list[0].image_post_info.images.forEach((element) => {
      // url_list[0] contains a webp
      // url_list[1] contains a jpeg
      image_urls.push(element.display_image.url_list[1]);
    });
  } else if (res.aweme_list[0].video) {
    urlMedia = null;
    const video = res.aweme_list[0].video;
    if (watermark){
      if(video.download_addr && video.download_addr.url_list && video.download_addr.url_list.length > 0){
        urlMedia = video.download_addr.url_list[0];
      }
    }
    if(urlMedia === null){
      if(video.play_addr && video.play_addr.url_list && video.play_addr.url_list.length > 0){
        urlMedia = video.play_addr.url_list[0];
      } else {
        console.error(
          "Error: video download_addr or play_addr or their url_list is missing."
        );
      }
    }
  } else {
    console.error(
      "Error: video or image_post_info is missing in the aweme object."
      );
  }

  const data = {
    url: urlMedia,
    images: image_urls,
    id: idVideo,
  };
  return data;
};

const getListVideoByUsername = async (username) => {
  var baseUrl = await generateUrlProfile(username);
  const browser = await chromium.launch({
    headless: false,
  });
  const page = await browser.newPage();
  //page.userAgent(
  //"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_14_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/85.0.4182.0 Safari/537.36"
  //);
  await page.goto(baseUrl);
  var listVideo = [];
  console.log(chalk.green("[*] Getting list video from: " + username));
  var loop = true;
  while (loop) {
    listVideo = await page.evaluate(() => {
      const listVideo = document.querySelectorAll("a");
      const videoUrls2 = Array.from(listVideo)
        .map((item) => item.href)
        .filter((href) => href.includes("/video/"))
        .filter((value, index, self) => self.indexOf(value) === index);
      return videoUrls2;
    });
    console.log(chalk.green(`[*] ${listVideo.length} video found`));
    previousHeight = await page.evaluate("document.body.scrollHeight");
    await page.evaluate("window.scrollTo(0, document.body.scrollHeight)");
    await page
      .waitForFunction(`document.body.scrollHeight > ${previousHeight}`, {
        timeout: 10000,
      })
      .catch(() => {
        console.log(chalk.red("[X] No more video found"));
        console.log(chalk.green(`[*] Total video found: ${listVideo.length}`));
        loop = false;
      });
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  await browser.close();
  return listVideo;
};
const getRedirectUrl = async (url) => {
  if (url.includes("vm.tiktok.com") || url.includes("vt.tiktok.com")) {
    url = await fetch(url, {
      redirect: "follow",
      follow: 10,
    });
    url = url.url;
    console.log(chalk.green("[*] Redirecting to: " + url));
  }
  return url;
};

const getIdVideo = async (url) => {
  if (url.includes("/t/")) {
    url = await new Promise((resolve) => {
      require("follow-redirects").https.get(url, function (res) {
        return resolve(res.responseUrl);
      });
    });
  }
  const matching = url.includes("/video/");
  const matchingPhoto = url.includes("/photo/");
  let idVideo = url.substring(
    url.indexOf("/video/") + 7,
    url.indexOf("/video/") + 26
  );
  if (matchingPhoto)
    idVideo = url.substring(
      url.indexOf("/photo/") + 7,
      url.indexOf("/photo/") + 26
    );
  else if (!matching) {
    console.log(chalk.red("[X] Error: URL not found"));
    exit();
  }
  // Tiktok ID is usually 19 characters long and sits after /video/
  return idVideo.length > 19
    ? idVideo.substring(0, idVideo.indexOf("?"))
    : idVideo;
};

(async () => {
  const header =
    "\r\n /$$$$$$$$ /$$$$$$ /$$   /$$ /$$$$$$$$ /$$$$$$  /$$   /$$       /$$$$$$$   /$$$$$$  /$$      /$$ /$$   /$$ /$$        /$$$$$$   /$$$$$$  /$$$$$$$  /$$$$$$$$ /$$$$$$$ \r\n|__  $$__/|_  $$_/| $$  /$$/|__  $$__//$$__  $$| $$  /$$/      | $$__  $$ /$$__  $$| $$  /$ | $$| $$$ | $$| $$       /$$__  $$ /$$__  $$| $$__  $$| $$_____/| $$__  $$\r\n   | $$     | $$  | $$ /$$/    | $$  | $$  \\ $$| $$ /$$/       | $$  \\ $$| $$  \\ $$| $$ /$$$| $$| $$$$| $$| $$      | $$  \\ $$| $$  \\ $$| $$  \\ $$| $$      | $$  \\ $$\r\n   | $$     | $$  | $$$$$/     | $$  | $$  | $$| $$$$$/        | $$  | $$| $$  | $$| $$/$$ $$ $$| $$ $$ $$| $$      | $$  | $$| $$$$$$$$| $$  | $$| $$$$$   | $$$$$$$/\r\n   | $$     | $$  | $$  $$     | $$  | $$  | $$| $$  $$        | $$  | $$| $$  | $$| $$$$_  $$$$| $$  $$$$| $$      | $$  | $$| $$__  $$| $$  | $$| $$__/   | $$__  $$\r\n   | $$     | $$  | $$\\  $$    | $$  | $$  | $$| $$\\  $$       | $$  | $$| $$  | $$| $$$/ \\  $$$| $$\\  $$$| $$      | $$  | $$| $$  | $$| $$  | $$| $$      | $$  \\ $$\r\n   | $$    /$$$$$$| $$ \\  $$   | $$  |  $$$$$$/| $$ \\  $$      | $$$$$$$/|  $$$$$$/| $$/   \\  $$| $$ \\  $$| $$$$$$$$|  $$$$$$/| $$  | $$| $$$$$$$/| $$$$$$$$| $$  | $$\r\n   |__/   |______/|__/  \\__/   |__/   \\______/ |__/  \\__/      |_______/  \\______/ |__/     \\__/|__/  \\__/|________/ \\______/ |__/  |__/|_______/ |________/|__/  |__/\r\n\n by n0l3r (https://github.com/n0l3r)\n";
  console.log(chalk.blue(header));
  const choice = await getChoice();
  var listVideo = [];
  if (choice.choice === "Mass Download (Username)") {
    const usernameInput = await getInput(
      "Enter the username with @ (e.g. @username) : "
    );
    listVideo = await getListVideoByUsername(usernameInput);
  } else if (choice.choice === "Mass Download with (txt)") {
    // Get URL from file
    const fileInput = await inquirer.prompt([
      {
        type: "fuzzypath",
        name: "input",
        excludePath: (nodePath) =>
          nodePath.includes("node_modules") || nodePath.includes(".git"),
        // excludePath :: (String) -> Bool
        // excludePath to exclude some paths from the file-system scan
        excludeFilter: (nodePath) => !nodePath.endsWith(".txt"),
        // excludeFilter :: (String) -> Bool
        // excludeFilter to exclude some paths from the final list, e.g. '.'
        itemType: "file",
        // itemType :: 'any' | 'directory' | 'file'
        // specify the type of nodes to display
        // default value: 'any'
        // example: itemType: 'file' - hides directories from the item list
        rootPath: __dirname,
        // rootPath :: String
        // Root search directory
        message: "Select a target directory for your component:",
        default: "list.txt",
        suggestOnly: false,
        // suggestOnly :: Bool
        // Restrict prompt answer to available choices or use them as suggestions
        depthLimit: 5,
        // depthLimit :: integer >= 0
        // Limit the depth of sub-folders to scan
        // Defaults to infinite depth if undefined
      },
    ]);

    // await getInput("Enter the file path : ");
    const file = fileInput.input;

    if (!fs.existsSync(file)) {
      console.log(chalk.red("[X] Error: File not found"));
      return;
    }

    // read file line by line
    const rl = readline.createInterface({
      input: fs.createReadStream(file),
      crlfDelay: Infinity,
    });

    for await (const line of rl) {
      const url = await getRedirectUrl(line);
      listVideo.push(url);
    }
  } else {
    const urlInput = await getInput("Enter the URL: ");
    for (const url of urlInput) {
      listVideo.push(await getRedirectUrl(url));
    }
  }

  console.log(chalk.green(`[!] Found ${listVideo.length} video(s)`));

  // Process videos, retrying those that hit the rate limit
  const retryUrls = getRetryUrls();
  listVideo.push(...retryUrls);

  for (const videoUrl of listVideo) {
    console.log(chalk.green(`[*] Downloading video from: ${videoUrl}`));
    const data = await getVideo(videoUrl, choice.type === "With Watermark");
    // check if video was deleted => data empty
    if (data == null) {
      continue; // Skip if the video couldn't be retrieved
    }

    await downloadMedia(data)
      .then(() => {
        console.log(chalk.green("[+] Downloaded successfully"));
        removeFromRetry(videoUrl); // Remove from retry.txt if successful
      })
      .catch((err) => {
        console.log(chalk.red("[X] Error: " + err));
      });
  }

  console.log(chalk.green("All downloads complete."));
})();
