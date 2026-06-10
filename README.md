# 식당 POS V74

V72 안정 화면을 유지하면서 생태한마리 `rest_000001` 전용 POS 접속 확인을 위해 restaurantId 인식과 구버전 데이터 보조 읽기를 보강한 버전입니다.

## 핵심 확인 주소

- `?restaurantId=rest_000001`
- `/#/?restaurantId=rest_000001`

restaurantId가 없으면 기존 기본값 `mom-restaurant`를 사용합니다.


## V74 - localStorage 용량 초과 방지
- rest_000001 외상장부(creditLedger)처럼 큰 데이터를 localStorage에 저장하다가 QuotaExceededError가 발생해 빈 화면이 되는 문제를 수정했습니다.
- localStorage 저장 실패 시 화면을 중단하지 않고 콘솔 경고만 남기도록 보강했습니다.
- restaurantId 접속 보강과 버전 표시를 V74로 통일했습니다.
