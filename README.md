# 식당 POS V54 / 영수증 복귀·쪽지함 연결 보강

V54는 V42 UI 기준을 유지하면서 V52/V53 실행 파일 잔류 문제를 정리하고 영수증 인쇄 후 POS 복귀 버튼을 보강한 버전입니다.

## 주요 반영
- 화면/문서/실행 JS 버전 V54 통일
- 영수증 화면에 `POS로 돌아가기`, `다시 인쇄` 버튼 표시
- 인쇄 후 영수증 화면만 남아도 POS로 복귀 가능
- 우리매장 쪽지함 링크를 공통쪽지함 고객용 주소 구조로 연결 준비
- V52/V53 잔류 파일명 제거

## 업로드 파일
index.html, owner-inbox.html, assets/, manifest.webmanifest, sw.js, vercel.json, README.md, CHANGELOG.md, 배포메모.md
