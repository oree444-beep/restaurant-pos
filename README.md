# 식당 POS V73

V72 안정 화면을 유지하면서 생태한마리 `rest_000001` 전용 POS 접속 확인을 위해 restaurantId 인식과 구버전 데이터 보조 읽기를 보강한 버전입니다.

## 핵심 확인 주소

- `?restaurantId=rest_000001`
- `/#/?restaurantId=rest_000001`

restaurantId가 없으면 기존 기본값 `mom-restaurant`를 사용합니다.
