// ESLint 설정 파일은 ES Module 문법 사용 (이 파일만)
import js from "@eslint/js";

export default [
    js.configs.recommended,
    {
        languageOptions: {
            ecmaVersion: 2022,
            sourceType: "script",
            globals: {
                // 브라우저 환경 - 기본
                window: "readonly",
                document: "readonly",
                console: "readonly",
                alert: "readonly",
                confirm: "readonly",
                location: "readonly",
                // 로컬 스토리지
                localStorage: "readonly",
                sessionStorage: "readonly",
                // 타이머 함수
                setTimeout: "readonly",
                setInterval: "readonly",
                clearTimeout: "readonly",
                clearInterval: "readonly",
                // 애니메이션
                requestAnimationFrame: "readonly",
                cancelAnimationFrame: "readonly",
                // 네트워크
                fetch: "readonly",
                XMLHttpRequest: "readonly",
                // 파일 API
                File: "readonly",
                FileReader: "readonly",
                Blob: "readonly",
                // URL API
                URL: "readonly",
                URLSearchParams: "readonly",
                // 기타 브라우저 API
                Image: "readonly",
                FormData: "readonly",
                indexedDB: "readonly",
                // 외부 라이브러리 (전역으로 로드됨)
                Dropzone: "readonly",
                Swal: "readonly",
                // 프로젝트 전역 변수들
                isManagerOverlayOpen: "writable",
                showLocationSelectUI: "writable",
                showGridIcons: "writable",
                showMainScreenForm: "writable",
                initializeColorPickers: "writable",
                extractProjectPath: "writable",
                showImageCropEditor: "writable",
                loadProjectFromDB: "writable",
                saveProjectToDB: "writable",
                deleteProjectFromDB: "writable",
                updateProjectList: "writable",
                updateIconImage: "writable",
                updateAllMainIconImages: "writable",
                updateAllIcons: "writable",
                showManagerUI: "writable",
                checkProjectScreenPosition: "writable",
                displayMainGridProject: "writable",
                updateMarqueeText: "writable",
                croppedImages: "writable",
                projectScreen: "writable",
                container: "writable"
            }
        },
        rules: {
            "no-unused-vars": "warn",
            "no-undef": "error",
            "no-console": "off",
            "no-debugger": "warn",
            "no-duplicate-imports": "error",
            "prefer-const": "warn",
            "no-var": "warn",
            "no-redeclare": "warn"  // 전역 변수 재선언을 경고로만 표시
        }
    },
    {
        ignores: ["node_modules/**", "projects/**", "eslint.config.js"]
    }
];

