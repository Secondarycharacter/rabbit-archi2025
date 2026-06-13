# Metaverse Architecture Tour

Babylon.js 기반의 단일 플레이어 1인칭 건축 투어 프로토타입입니다.

## 실행

```bash
npm run start:metaverse
```

브라우저에서 `http://127.0.0.1:8081` 또는 터미널에 표시되는 주소로 접속합니다.

## 파일 구조

- `index.html`: 메타버스 투어 화면
- `model-viewer.html`: GLB 파일 단독 확인용 뷰어
- `styles/main.css`: HUD와 디버그 패널 스타일
- `src/first-person-tour.js`: 빌딩 모델 로딩, 오빗뷰, 투어모드, 충돌, 디버그 로직
- `assets/models/Jinju.glb`: 진주 프로젝트 모델
- `assets/models/Angji.glb`: 앵지 프로젝트 둘러보기 모델
- `assets/models/Angji_tour.glb`: 앵지 프로젝트 투어모드 모델
- `assets/models/Chungju.glb`: 충주 프로젝트 모델
- `assets/models/Geochang.glb`: 거창 프로젝트 모델

## 조작

- 마우스 드래그: 초기 오빗뷰에서 모델 회전
- 마우스 휠: 줌인, 초기 시작 거리 이상 줌아웃 제한
- `Click to Play`: 1인칭 투어모드 시작
- `W A S D` 또는 방향키: 이동
- 마우스 이동: 투어모드 시선 회전
- `Shift`: 빠르게 이동
- `F`: 오빗뷰로 돌아가기
- `R`: 투어 시작 위치로 리셋

## 디버그

화면 우측 상단 `Debug` 버튼으로 모델 크기, 카메라 좌표, 활성 카메라, 입력 상태를 확인할 수 있습니다. `Input` 항목에는 키 입력 횟수, 마지막 키, 마우스 이동, 포인터락 상태, 충돌로 이동이 막혔는지 여부가 표시됩니다. `Copy Debug`를 누르면 현재 상태를 복사할 수 있습니다.
