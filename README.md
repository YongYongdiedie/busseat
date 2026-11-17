# 우리 버스 — Firebase 반별 저장 버전

GitHub Pages에서 실행하며 Firebase Authentication + Cloud Firestore를 사용합니다. 기존 저장소에는 Firebase 코드가 없었습니다. 이 버전은 연결 기능과 보안 규칙을 추가한 것입니다. **busseatdb 프로젝트의 웹 설정을 적용했습니다.** 학생용 익명 인증 성공을 확인했습니다. Firestore 규칙과 교사 UID 등록은 별도로 적용해야 합니다.

## 제공 기능

- 1~6반별 현재 좌석 배치, 버스 이름, 번호판, 사진 저장
- 학생: 별도 로그인 입력 없이 익명 인증으로 최신 좌석표 조회, 실시간 반영, 내 번호 찾기
- 교사: 이메일·비밀번호 로그인, Firebase에 등록한 교사 UID만 수정·공유 저장
- 저장할 때마다 일시, 저장자 UID, 메모, 전체 좌석표를 변경 불가 기록으로 보존
- 과거 기록 불러오기 → 반에 저장하면 새 기록 생성
- 동시 수정 시 저장 버전 비교로 덮어쓰기 방지
- 반별 임시 편집 복원, 파일 백업·불러오기, 인쇄/PDF

## 1. Firebase 프로젝트와 웹 앱 만들기

https://console.firebase.google.com/ 에서 프로젝트를 선택하거나 만듭니다. 제공해 주신 busseatdb 웹 앱 설정은 `firebase-config.js`에 이미 적용했습니다. 아래 설정 예시는 다른 프로젝트로 변경할 때만 참고하세요.

```js
window.BUS_FIREBASE_CONFIG = {
  apiKey: 'Firebase에서 받은 값',
  authDomain: '프로젝트.firebaseapp.com',
  projectId: '프로젝트-ID',
  appId: 'Firebase에서 받은 값'
};
```

웹 설정은 클라이언트용입니다. 서비스 계정 JSON·비밀키·교사 비밀번호는 코드에 넣지 않습니다.

## 2. Authentication 설정

- Authentication → Sign-in method에서 **Anonymous(익명)** 와 **Email/Password(이메일/비밀번호)** 를 활성화합니다.
- Settings → Authorized domains에 `yongyongdiedie.github.io`를 추가합니다. `https://`와 `/busseat/`는 붙이지 않습니다.
- Users에서 교사 계정을 만들고 생성된 UID를 복사합니다. 앱에는 회원가입 기능이 없습니다.

## 3. Firestore 만들기와 교사 권한 등록

- Cloud Firestore의 기본 `(default)` 데이터베이스를 만듭니다. Standard edition / production mode를 사용합니다.
- Rules 탭에 동봉한 `firestore.rules` 전체를 붙여 넣고 Publish합니다.
- Data 탭에서 컬렉션 `busEditors`를 만듭니다.
- 문서 ID를 교사 계정의 **UID와 정확히 동일하게** 지정합니다.
- `enabled` 필드를 **boolean true**로 추가합니다. 문자열 "true"가 아닙니다.
- 다른 교사도 UID별 문서를 추가하면 됩니다. 교사는 모든 반을 관리합니다.

기존 Firebase 프로젝트의 규칙이 있다면 전체를 덮어쓰지 말고 이 앱의 경로를 기존 규칙에 합쳐야 합니다. 광범위한 allow write 규칙이 이미 있다면 새 제한 규칙으로 상쇄할 수 없으므로 함께 검토하세요.

`busEditors` 쓰기 권한은 앱에 없으며 Firebase Console에서만 관리합니다. 학생은 익명 인증으로 현재 배치를 읽고, 이전 기록은 교사만 읽습니다. **앱 주소를 아는 방문자는 현재 배치·번호판·사진을 볼 수 있습니다.** 학교 구성원만 읽게 제한하는 로그인 방식은 별도 설정이 필요합니다.

## 4. 사진·좌석 인덱스 제외

사진은 600,000자 이하 JPEG로 압축해 Firestore 문서에 저장합니다. Cloud Storage는 사용하지 않습니다. Firestore의 Indexes → Single field에서 컬렉션 그룹 `classes`, `history` 각각의 필드 경로 `state`를 인덱스 제외로 설정합니다. 하위 사진과 좌석 데이터는 검색하지 않으므로 인덱싱이 필요 없습니다.

Firebase CLI를 사용하는 경우 동봉된 firebase.json 및 firestore.indexes.json으로 배포할 수 있습니다:

```sh
firebase deploy --only firestore:rules,firestore:indexes --project YOUR_PROJECT_ID
```

실제 프로젝트에 적용하기 전에 기존 규칙·인덱스와 병합하세요. 기록마다 사진까지 보관하므로 기록 수에 따라 저장 용량과 읽기·쓰기 사용량이 증가합니다. 기록은 15개씩 불러옵니다.

## 5. GitHub에 업로드

ZIP을 풀어 아래 웹 파일을 저장소 최상위에 업로드·교체합니다:

- index.html
- style.css
- core.js
- app.js
- image-export.js
- cloud.js
- firebase-config.js (실제 웹 설정 입력 후)
- .nojekyll

firestore.rules, firestore.indexes.json, firebase.json, README.md도 저장소에 보관할 수 있지만 GitHub에 올리는 것만으로 Firebase 규칙이 적용되지는 않습니다. 위 Firebase 설정·규칙 배포를 반드시 별도로 진행합니다.

이미 GitHub Pages가 켜져 있다면 커밋 후 배포가 완료될 때까지 기다립니다. 기존 앱의 주소는 유지됩니다.

## 사용 흐름

1. 학생은 여행과 반을 선택합니다. 교사는 로그인합니다.
2. 교사는 반을 선택한 후 좌석·버스 정보를 수정합니다.
3. ‘반에 저장 · 기록 남기기’를 눌러 공유합니다. 로컬 임시 저장만으로는 학생에게 공유되지 않습니다.
4. 학생 화면은 현재 반의 저장된 배치를 실시간으로 받습니다.
5. ‘이전 기록 보기’에서 복원할 배치를 불러오고 다시 반에 저장합니다. 예전 기록은 유지됩니다.

기존 로컬 버전의 내용을 옮기려면 먼저 기존 앱에서 파일 저장을 한 후, Firebase 버전에서 교사 로그인 → 반 선택 → 파일 불러오기 → 반에 저장 순서로 진행하세요. 여러 반에 같은 예전 자료를 자동으로 복사하지 않습니다.

## 반·여행별 링크와 데이터 경로

- 1반: https://yongyongdiedie.github.io/busseat/?trip=trip-2026&class=1
- 2반: https://yongyongdiedie.github.io/busseat/?trip=trip-2026&class=2

기존 수학여행 앱에서 위 주소를 반별 링크로 걸 수 있습니다. firebase-config.js의 BUS_TRIPS에 새 여행 ID를 추가하면 과거 여행을 보존하면서 새 여행을 시작합니다. 기존 여행 ID를 재사용하면 기존 기록에 이어집니다.

```
busEditors/{교사 UID}                       enabled: true
trips/{여행 ID}/classes/{반}                현재 배치 + revision
trips/{여행 ID}/classes/{반}/history/{기록}   저장 시점의 전체 배치
```

## 검증 범위

JavaScript 구문 및 모의 Firebase 환경에서 교사·학생 권한 분기, 반별 데이터 분리, 현재 배치와 기록의 일괄 저장, 버전 증가, 동시 저장 충돌 시 편집 유지, 설정 없는 로컬 모드를 확인했습니다. 로컬 브라우저에서 수정본 실행, 제외 좌석·랜덤 배치, 새로고침 후 저장 유지, JavaScript 오류 없음, 390px 모바일에서 가로 넘침 없음을 확인했습니다. 실제 SDK 로딩 및 학생용 익명 인증 성공을 확인했습니다. PNG와 JPG 다운로드도 확인했습니다. **교사 로그인, Firestore 읽기·쓰기, 보안 규칙 실증 검증은 아직 완료하지 못했습니다.** 프로젝트 설정 후 교사 저장, 학생 조회, 학생 쓰기 거부, 다른 기기 반영을 확인해야 합니다.

공식 문서:
- https://firebase.google.com/docs/web/alt-setup
- https://firebase.google.com/docs/firestore/security/get-started
- https://firebase.google.com/docs/firestore/manage-data/transactions

## PNG / JPG 저장

저장 & 공유 카드에서 PNG 저장 또는 JPG 저장을 누르면 현재 화면의 좌석표를 이미지로 내려받습니다. 버스 이름, 반, 번호판, 등록 사진, 45석 번호 및 제외 X가 포함됩니다. 학생 조회 모드에서도 사용할 수 있습니다. 이미지 저장은 Firebase에 새 기록을 만들지 않습니다. 교사가 아직 공유하지 않은 편집도 현재 화면 기준으로 포함됩니다. 사진이 없는 이미지는 1000×1790, 사진 포함 이미지는 1000×2110 픽셀입니다.
