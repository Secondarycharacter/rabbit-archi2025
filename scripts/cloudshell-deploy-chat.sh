#!/usr/bin/env bash
# Cloud Shell에서 CI 링크 없이 채팅 Functions/규칙을 배포합니다.
# 사용: bash scripts/cloudshell-deploy-chat.sh
set -euo pipefail

PROJECT_ID="${1:-rabbit-archi2025-c40a6}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"

cd "$ROOT"

if [[ ! -f firebase.json ]]; then
  echo "firebase.json 이 없습니다. 이 스크립트는 저장소 루트에서 실행해야 합니다."
  exit 1
fi

echo "==> Cloud Shell ADC로 Firebase 로그인"
npx --yes firebase-tools@13 login --use-application-default

echo "==> Functions 의존성 설치"
npm install --prefix functions

echo "==> 배포: functions + firestore rules + indexes ($PROJECT_ID)"
npx --yes firebase-tools@13 deploy \
  --only functions,firestore:rules,firestore:indexes \
  --project "$PROJECT_ID"

echo "==> 완료"
