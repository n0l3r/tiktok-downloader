# TikTok Downloader Deployment Guide

This guide will walk you through deploying the TikTok Downloader project using Docker and Google Cloud. Please follow the steps carefully to ensure a successful deployment.

## Prerequisites (Skip 2 & 3 if you are running this in the Google Cloud Shell Console)
1. **Google Cloud Account:** Make sure you have a Google Cloud account. If you don't have one, you can sign up [here](https://cloud.google.com/).
2. **Google Cloud SDK:** If you are running this locally on your machine instead of developing it on the Cloud Shell Editor provided by Google, install the Google Cloud SDK following the instructions [here](https://cloud.google.com/sdk/docs/install).
3. **Docker:** Ensure Docker is installed on your machine. You can download it from [here](https://www.docker.com/products/docker-desktop).

## Steps

### 1. Create a Google Cloud Project
If you don't already have a Google Cloud project, create one from the [Google Cloud Console](https://console.cloud.google.com/). Note down the project ID.

### 2. Enable Artifact Registry for Project
You will need to enable Google's artifact registry for this to work. [Artifact Registry](https://cloud.google.com/artifact-registry).

### 3. Clone the TikTok Downloader Repository
Clone the TikTok Downloader repository to your google cloud shell (or local gcloud cli) using the following command:
```bash
git clone https://github.com/n0l3r/tiktok-downloader.git
cd tiktok-downloader
```

### 4. Navigate to the Web-Server Directory
Change your directory to the `web-server` folder within the cloned repository:
```bash
cd web-server
```

### 5. Run the Deployment Script
Execute the `deploy.sh` script. This script will guide you through selecting your Google Cloud project and the service to deploy. If you don't have an existing service, it will allow you to create one.
```bash
./deploy.sh
```

### 6. Follow the Script Prompts
The script will build your Docker image, push it to Google's Artifact Registry, and then deploy it to Google Cloud Run. Follow any prompts provided by the script.

### 7. Access Your Deployed Service
Once the deployment is successful, the script will output a URL. You can use this URL to access your deployed TikTok Downloader service.

## Troubleshooting
- **Google Cloud Permissions:** Make sure you have the necessary permissions to create and deploy to Google Cloud Run and Artifact Registry in your Google Cloud project.


## Notes
- Keep your Google Cloud project ID and service name handy as they are required for various steps in the deployment process.
- The deployment script assumes you're running it from the `web-server` directory within the cloned repository.

By following these steps, you should be able to deploy the TikTok Downloader service to Google Cloud Run successfully. If you encounter any issues, refer to the respective documentation for Docker, Google Cloud SDK, or Google Cloud Run for more detailed troubleshooting steps.
