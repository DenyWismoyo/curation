#!/bin/bash
# Setup Cloud Monitoring Alerts for Firebase Functions
# This script configures alert policies to notify via email if critical functions fail.

# Check if arguments are provided
if [ -z "$1" ] || [ -z "$2" ]; then
  echo "Usage: ./setup-alerts.sh [PROJECT_ID] [NOTIFICATION_EMAIL]"
  echo "Example: ./setup-alerts.sh my-firebase-project alerts@mydomain.com"
  exit 1
fi

PROJECT_ID=$1
EMAIL=$2

echo "Configuring Cloud Monitoring alerts for project: $PROJECT_ID"
echo "Notifications will be sent to: $EMAIL"

# 1. Create a notification channel for the email address
echo "Creating notification channel..."
CHANNEL_JSON=$(cat <<EOF
{
  "type": "email",
  "displayName": "Admin Email Channel",
  "labels": {
    "email_address": "$EMAIL"
  }
}
EOF
)

# We use grep and awk to extract the generated channel name from the output.
CHANNEL_NAME=$(gcloud alpha monitoring channels create --channel-content="$CHANNEL_JSON" --project="$PROJECT_ID" --format="value(name)")

if [ -z "$CHANNEL_NAME" ]; then
  echo "Failed to create notification channel. Ensure you have the right permissions and have enabled the Monitoring API."
  exit 1
fi
echo "Notification channel created: $CHANNEL_NAME"

# 2. Alert for cryptoCronAgent (Trigger if there is any execution error)
echo "Creating alert policy for cryptoCronAgent..."
POLICY_CRON_JSON=$(cat <<EOF
{
  "displayName": "Alert: cryptoCronAgent Failure",
  "userLabels": {},
  "conditions": [
    {
      "displayName": "Function execution error count > 0",
      "conditionThreshold": {
        "filter": "resource.type = \"cloud_function\" AND resource.labels.function_name = \"cryptoCronAgent\" AND metric.type = \"cloudfunctions.googleapis.com/function/execution_count\" AND metric.labels.status = \"error\"",
        "aggregations": [
          {
            "alignmentPeriod": "300s",
            "crossSeriesReducer": "REDUCE_SUM",
            "perSeriesAligner": "ALIGN_SUM"
          }
        ],
        "comparison": "COMPARISON_GT",
        "duration": "0s",
        "trigger": {
          "count": 1
        },
        "thresholdValue": 0
      }
    }
  ],
  "combiner": "OR",
  "enabled": true,
  "notificationChannels": [
    "$CHANNEL_NAME"
  ],
  "documentation": {
    "content": "The critical background job 'cryptoCronAgent' failed to execute properly. Please check the Firebase Functions logs immediately.",
    "mimeType": "text/markdown"
  }
}
EOF
)
gcloud alpha monitoring policies create --policy-from-file=<(echo "$POLICY_CRON_JSON") --project="$PROJECT_ID"

# 3. Alert for mayarWebhook (Trigger if there is any execution error)
echo "Creating alert policy for mayarWebhook..."
POLICY_WEBHOOK_JSON=$(cat <<EOF
{
  "displayName": "Alert: mayarWebhook Failure",
  "userLabels": {},
  "conditions": [
    {
      "displayName": "Function execution error count > 0",
      "conditionThreshold": {
        "filter": "resource.type = \"cloud_function\" AND resource.labels.function_name = \"mayarWebhook\" AND metric.type = \"cloudfunctions.googleapis.com/function/execution_count\" AND metric.labels.status = \"error\"",
        "aggregations": [
          {
            "alignmentPeriod": "300s",
            "crossSeriesReducer": "REDUCE_SUM",
            "perSeriesAligner": "ALIGN_SUM"
          }
        ],
        "comparison": "COMPARISON_GT",
        "duration": "0s",
        "trigger": {
          "count": 1
        },
        "thresholdValue": 0
      }
    }
  ],
  "combiner": "OR",
  "enabled": true,
  "notificationChannels": [
    "$CHANNEL_NAME"
  ],
  "documentation": {
    "content": "The payment webhook 'mayarWebhook' experienced an error. This might cause users to not receive their quotas after paying. Please investigate the Firebase Functions logs.",
    "mimeType": "text/markdown"
  }
}
EOF
)
gcloud alpha monitoring policies create --policy-from-file=<(echo "$POLICY_WEBHOOK_JSON") --project="$PROJECT_ID"

echo "Setup complete! Alerts have been configured."
