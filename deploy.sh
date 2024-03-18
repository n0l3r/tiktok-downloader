#!/bin/bash

# Set the project ID and service name
PROJECT_ID="projecttiktok"
SERVICE_NAME="tiktok-downloader"
IMAGE_NAME="gcr.io/$PROJECT_ID/$SERVICE_NAME"

# Build the Docker image
echo "Building Docker image..."
docker build -t $IMAGE_NAME .

# Push the image to Google Container Registry
echo "Pushing the image to Google Container Registry..."
docker push $IMAGE_NAME

# Deploy to Cloud Run
echo "Deploying to Google Cloud Run..."
gcloud run deploy $SERVICE_NAME --image $IMAGE_NAME --platform managed

echo "Deployment completed."
