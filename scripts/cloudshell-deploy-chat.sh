#!/usr/bin/env bash
# Spark(무료) 플랜: Firestore 규칙만 배포합니다. Cloud Functions는 사용하지 않습니다.
set -euo pipefail

PROJECT_ID="${1:-rabbit-archi2025-c40a6}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"

cd "$ROOT"

if [[ ! -f firebase.json ]]; then
  echo "firebase.json 이 없습니다. 이 스크립트는 저장소 루트에서 실행해야 합니다."
  exit 1
fi

echo "==> 배포: firestore rules + indexes ($PROJECT_ID)"
npx --yes -p firebase-tools@13 firebase deploy \
  --only firestore:rules,firestore:indexes \
  --project "$PROJECT_ID" \
  --non-interactive

echo "==> 완료"
