<h1 style="align: center;">Tiktok Downloader</h1>

<h1>Changes From Original Branch</h1>
I added command line arguments, added a way to load cookies to sign in and finally made the mass download work again but its subject to breaking due to element changes

<h2>Installation</h2>
run in your terminal:

```
git clone https://github.com/n0l3r/tiktok-downloader.git
cd tiktok-downloader
npm i
node index [-h] [-w] (-t TXT | -m MASS | -u URL)
```

<h2>Saving Your Cookies (Important!)</h2>

```
node cookieLoader.js
```

After this you should go to TikTok login and after youve logged in press enter
What this does is it saves your cookies so that when you run the bot on a mass download you dont get the sign-in popup


<h2>Usage</h2>
<h3>Mass Download by Username</h3>
use the -m option with an account name

```
node .\index.js -m "@username"
```

```
node .\index.js -m username
```

<br>
<h3>Mass Download by list url (txt)</h3>
use the -t option with a text file of tiktok video url's

```
node .\index.js -t list.txt
```

<br>
<h3>Download by url</h3>
use the -u option with a tiktok video url

```
node .\index.js -u https://www.tiktok.com/@username/video/7301135759841447210
```

<h3>Watermarked videos!</h3>
add -w to the end of the call to download with watermark by default it will download without watermark

```
node .\index.js -u https://www.tiktok.com/@username/video/7301135759841447210 -w
```



