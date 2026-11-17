// Firebase 웹 앱 공개 설정. 교사 비밀번호나 서비스 계정 비밀키는 넣지 않습니다.
window.BUS_FIREBASE_CONFIG = {
  apiKey: 'AIzaSyDP_cDv2_Wi3CNy_w1O7ESvQFQBc02kH8g',
  authDomain: 'busseatdb.firebaseapp.com',
  projectId: 'busseatdb',
  storageBucket: 'busseatdb.firebasestorage.app',
  messagingSenderId: '493968356447',
  appId: '1:493968356447:web:34a69757b754f0ac8517ea',
  measurementId: 'G-FCNR1R6NDP'
};
// 새 여행은 새로운 ID로 추가하면 과거 기록을 보존합니다.
window.BUS_TRIPS = [{ id: 'trip-2026', name: '2026 수학여행' }];
window.BUS_CLASSES = ['1', '2', '3', '4', '5', '6'];
