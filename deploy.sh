#!/bin/bash

# Configuration
SERVICE_NAME="nexa-os"
REGION="us-central1"

# Get Project ID
PROJECT_ID=$(gcloud config get-value project)

if [ -z "$PROJECT_ID" ]; then
    echo "Error: No Google Cloud Project ID found. Please run 'gcloud config set project [PROJECT_ID]' first."
    exit 1
fi

IMAGE_TAG="gcr.io/$PROJECT_ID/$SERVICE_NAME:latest"

echo "🚀 Starting deployment for $SERVICE_NAME to project $PROJECT_ID..."

# Build the image
echo "📦 Building Docker image..."
docker build -t $IMAGE_TAG .

# Push the image
echo "📤 Pushing image to Google Container Registry..."
docker push $IMAGE_TAG

# Deploy to Cloud Run
echo "🚀 Deploying to Cloud Run..."
gcloud run deploy $SERVICE_NAME \
    --image $IMAGE_TAG \
    --region $REGION \
    --platform managed \
    --allow-unauthenticated

echo "✅ Deployment complete!"
