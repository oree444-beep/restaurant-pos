# 식당 POS 고객용 V83

## 변경사항
- restaurantId + posToken 접속 구조를 준비했습니다.
- posToken이 저장된 식당은 토큰이 맞아야 데이터가 로드됩니다.
- restaurantId 뒤에 자동으로 /가 붙어도 값이 오염되지 않게 정리했습니다.
- 기존 레거시 식당은 종합관리 V45에서 posToken 저장 전까지 임시 허용됩니다.

---

# 변경기록

## V82 - 기본 배포판 초기화
- 생태한마리 등 특정 테스트 매장명 제거
- 메뉴/카테고리 기본 샘플 데이터 제거
- 기본 restaurantId를 restaurant-template로 분리
- 기존 localStorage 전역 데이터 자동 이관 중지
- 화면 버전 V82로 통일
- 공통쪽지함 고객용 링크 유지

# 식당 POS 변경기록

## V82 - 2026-07-01
- POS 안의 임시 쪽지함 기능을 확장하지 않고 공통쪽지함 고객용 대표주소로 연결.
- 고객용 링크 구조: `https://teamhr-common-inbox.vercel.app?inboxId=pos_rest_000001&token=demo_pos_token`
- 우리매장 쪽지함 열기, 쪽지함 주소 복사, 쪽지함 QR 보기 반영.
- 기존 `owner-inbox.html`은 공통쪽지함 리다이렉트 페이지로 변경.

## V81
- 결제 버튼 고정 및 수기 간편입력 수정 기준 안정판.
