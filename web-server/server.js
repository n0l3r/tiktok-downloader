/*  by Naufal Taufiq Ridwan
    Github : https://github.com/n0l3r

    Dockerized, Webapp/Server, and Cloud deployable by timmbobb
    Github : https://github.com/timmbobb

    Uses yt-dlp as a temporary fix

    Don't remove credit.
*/

const express = require('express');
const { exec } = require('child_process');
const { spawn } = require('child_process');
const fetch = require('node-fetch');
const app = express();
const port = process.env.PORT || 8080;

// Middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

// Home page route
app.get('/', (req, res) => {
    res.sendFile('server.html', { root: __dirname });
});

app.get('/download', (req, res) => {
    const url = req.query.url;

    if (!url) {
        return res.status(400).send('URL is required');
    }

    // Try streaming using yt-dlp as a Python module
    const ytDlpCommandStream = `python3 /usr/src/app/yt-dlp/yt_dlp/__main__.py -g "${url}"`;
    exec(ytDlpCommandStream, (error, stdout, stderr) => {
        if (error || !stdout.trim()) {
            fallbackDownloadMethod(url, res);
        } else {
            // If streaming is successful, check if the URL can be accessed
            const videoUrl = stdout.trim();
            fetch(videoUrl).then(response => {
                if (response.ok) {
                    res.setHeader('Content-Type', 'video/mp4');
                    response.body.pipe(res);
                } else {
                    console.log('Streaming URL not accessible, falling back to download method');
                    fallbackDownloadMethod(url, res);
                }
            }).catch(fetchError => {
                console.error('Error while fetching the video:', fetchError);
                fallbackDownloadMethod(url, res);
            });
        }
    });
});

function fallbackDownloadMethod(url, res) {
    // If streaming fails, fallback to downloading using yt-dlp as a Python module
    const ytDlpProcess = spawn('python3', ['/usr/src/app/yt-dlp/yt_dlp/__main__.py', '-f', '0', '-o', '-', url]);

    res.setHeader('Content-Type', 'video/mp4');

    ytDlpProcess.stdout.on('data', (chunk) => {
        res.write(chunk);
    });

    ytDlpProcess.stdout.on('end', () => {
        res.end();
    });

    ytDlpProcess.stderr.on('data', (data) => {
        console.error(`stderr: ${data}`);
    });

    ytDlpProcess.on('error', (error) => {
        console.error('Failed to start yt-dlp process:', error);
        res.status(500).send('Failed to download video');
    });
}

// Start the server
app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});