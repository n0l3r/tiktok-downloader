#!/bin/bash

# Function to fetch and select a service interactively
select_service() {
  # Fetch the current project ID
  PROJECT_ID=$(gcloud config get-value project)

  echo "Project ID: $PROJECT_ID"

  # Fetch the list of services
  SERVICES=$(gcloud run services list --format="value(NAME)")

  # Present a selection menu for services
  echo "Please select a service:"
  select SERVICE_NAME in $SERVICES; do
    if [ -n "$SERVICE_NAME" ]; then
      # Convert service name to lowercase
      SERVICE_NAME=$(echo $SERVICE_NAME | tr '[:upper:]' '[:lower:]')

      # Write to .env file
      echo "PROJECT_ID=$PROJECT_ID" > .env
      echo "SERVICE_NAME=$SERVICE_NAME" >> .env
      echo "Environment variables saved to .env file."
      break
    else
      echo "Invalid selection. Please try again."
    fi
  done

  # Export the selected service name
  export SERVICE_NAME
}

# Load the environment variables or select service if not set
if [ -f .env ]; then
    export $(cat .env | xargs)
else
    echo "No .env file found. Selecting service..."
    select_service
fi

## Image name must be lowercase
IMAGE_NAME="gcr.io/$PROJECT_ID/$SERVICE_NAME"

gcloud auth configure-docker

# Ensure we are in the tiktok-downloader directory
cd ..

# Build the Docker image
echo "Building Docker image from the tiktok-downloader directory..."
docker build -f web-server/Dockerfile -t $IMAGE_NAME .

# Check if Docker build was successful
if [ $? -ne 0 ]; then
    echo "Docker build failed."
    exit 1
fi

# Push the image to Google Container Registry
echo "Pushing the image to Google Container Registry..."
docker push $IMAGE_NAME

# Check if Docker push was successful
if [ $? -ne 0 ]; then
    echo "Docker push failed."
    exit 1
fi

# Deploy to Cloud Run
echo "Deploying to Google Cloud Run..."

gcloud run deploy $SERVICE_NAME --image $IMAGE_NAME --platform managed

# Check if Cloud Run deployment was successful
if [ $? -ne 0 ]; then
    echo "Cloud Run deployment failed."
    exit 1
fi

echo "Deployment completed."
