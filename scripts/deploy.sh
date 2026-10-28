#!/bin/sh
set -eu
cd "$(dirname "$0")/.."
PROJECT_ID="${1:-}"
REGION="${REGION:-asia-southeast1}"
SERVICE="${SERVICE:-melody-to-tab}"
BUILD_ACCOUNT="melody-build@${PROJECT_ID}.iam.gserviceaccount.com"
if [ -z "$PROJECT_ID" ]; then echo '用法: scripts/deploy.sh GOOGLE_CLOUD_PROJECT_ID' >&2; exit 1; fi
GCLOUD="${GCLOUD:-gcloud}"
"$GCLOUD" services enable run.googleapis.com cloudbuild.googleapis.com artifactregistry.googleapis.com iam.googleapis.com --project "$PROJECT_ID"
if ! "$GCLOUD" iam service-accounts describe "$BUILD_ACCOUNT" --project "$PROJECT_ID" >/dev/null 2>&1; then
  "$GCLOUD" iam service-accounts create melody-build --project "$PROJECT_ID" --display-name='Melody to TAB build'
fi
"$GCLOUD" projects add-iam-policy-binding "$PROJECT_ID" --member="serviceAccount:$BUILD_ACCOUNT" --role=roles/run.builder --condition=None --quiet --format=none
"$GCLOUD" run deploy "$SERVICE" --source cloud --build-service-account "projects/$PROJECT_ID/serviceAccounts/$BUILD_ACCOUNT" --project "$PROJECT_ID" --region "$REGION" --no-allow-unauthenticated --cpu 4 --memory 16Gi --timeout 1800 --concurrency 1 --max-instances 1 --min-instances 0 --quiet
SERVICE_URL=$("$GCLOUD" run services describe "$SERVICE" --project "$PROJECT_ID" --region "$REGION" --format='value(status.url)')
printf '\n部署完成。启动应用时设置：\nexport CLOUD_RUN_URL=%s\n' "$SERVICE_URL"
