# 식당 POS V56 / 주방 테스트 전송 확인 버전

V56은 V55 영수증 인쇄 분리 기준을 유지하면서 관리자모드에 주방 테스트 전송과 주방 화면 확인 기능을 보강한 정적 배포 버전입니다.

## 포함 파일
- index.html
- kitchen-display.html
- owner-inbox.html
- assets/
- manifest.webmanifest
- sw.js
- vercel.json

## 주요 반영
- 주방기기 연결 테스트 전송 버튼 추가
- 주방 화면 열기/주소 복사 보강
- 영수증 보기와 인쇄하기 분리 유지
- POS로 돌아가기 버튼 유지

## 배포
Vercel 정적 배포: Framework Other / Build Command 빈칸 / Output Directory .
