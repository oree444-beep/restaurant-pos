# 식당 POS V43 / 우리매장 쪽지함 연동 후보

## 기준
- POS 최신 이전 기준: V42
- 이번 후보: V43
- 정적 배포 구조: `package.json` 없이 Vercel에서 바로 배포

## V43 주요 반영
- POS 접속 비밀번호 인증 화면 유지
  - 접속 화면에는 기본값 1234를 표시하지 않음
  - 인증된 기기는 저장, 등록 기기 초기화 가능
- `우리매장 쪽지함` 우선 사용 구조
  - 식당명 + 6자리 ID 표시 예: `생태한마리 우리매장 쪽지함 000001`
  - 식당별 `restaurantId + token + 전용 비밀번호` 구조
  - 사장님 핸드폰에서 `owner-inbox.html`로 판매통계/외상장부/요금안내 확인
- 문자 API는 발신번호 등록 문제가 있어 보류
  - 추후 식당별 발신번호 승인 완료 후 POS 문자 버튼 활성화
- 샘플/영업용 판매통계 강화
  - 기본형, 종합형, 세부재료분석형, 요일별 통계 리포트 예시
  - 재료 준비량 추천 예시
- 수기 내역 입력/수정 기능 추가
  - POS 사용법을 모르는 직원이 종이에 적어둔 내역을 저녁/다음날 입력 가능
  - 주문일, 결제일, 결제시간, 메뉴, 수량, 결제수단, 외상고객, 메모 저장
  - 수기입력 배지 표시 및 판매통계/외상장부 반영

## 업로드 파일
GitHub 루트에는 아래 파일만 올립니다.

```text
index.html
owner-inbox.html
assets/
vercel.json
README.md
CHANGELOG.md
배포메모.md
```

## Vercel 설정
```text
Framework Preset: Other
Build Command: 비우기
Output Directory: .
Install Command: 비우기
```
