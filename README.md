# 식당 POS 기본판 V82

신규 식당 배포용 초기세팅 버전입니다. 특정 매장명, 샘플 메뉴, 카테고리 기본값을 제거하고 관리자모드에서 새 식당 정보를 입력하기 쉽도록 정리했습니다.

# 식당 POS V82

이번 버전은 POS 안에 임시 쪽지함을 중복 구현하지 않고 공통쪽지함 고객용 링크로 연결하는 버전입니다.

- 고객용 대표주소: `https://teamhr-common-inbox.vercel.app`
- 기본 테스트 링크: `https://teamhr-common-inbox.vercel.app?inboxId=pos_rest_000001&token=demo_pos_token`
- 실제 운영에서는 식당별 `inboxId`와 랜덤 `token`을 부여합니다.

쪽지 응대, 답변, 설문 관리는 공통쪽지함 관리자에서만 진행합니다.
