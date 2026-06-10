# POS V74 변경사항

- V72 기존 화면/기능 유지
- URL의 restaurantId 인식 보강
  - ?restaurantId=rest_000001
  - /?restaurantId=rest_000001
  - #/?restaurantId=rest_000001
- restaurants/{restaurantId}/menus 보조 읽기 추가
- salesHistory / creditLedger 구버전 컬렉션 보조 읽기 추가
- 화면이 빈 상태로 멈추는 경우 오류 안내 패널 표시
- 현재 접속 식당 ID 배지 표시
- 상단 보조 스크립트 / 브라우저 타이틀바 버전 표시를 V74으로 통일


## V74 - localStorage 용량 초과 방지
- rest_000001 외상장부(creditLedger)처럼 큰 데이터를 localStorage에 저장하다가 QuotaExceededError가 발생해 빈 화면이 되는 문제를 수정했습니다.
- localStorage 저장 실패 시 화면을 중단하지 않고 콘솔 경고만 남기도록 보강했습니다.
- restaurantId 접속 보강과 버전 표시를 V74로 통일했습니다.
