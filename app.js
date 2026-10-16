(() => {
  const OWNER_EMAIL = 'fawzymohammedsas@gmail.com';
  const firebaseConfig = window.OFOQ_FIREBASE_CONFIG || {};
  const firebaseConfigured = !!(firebaseConfig.apiKey && firebaseConfig.projectId && firebaseConfig.appId && !String(firebaseConfig.apiKey).startsWith('PASTE_') && !String(firebaseConfig.projectId).startsWith('PASTE_'));
  let auth = null, db = null, storage = null, firebaseEnabled = false;
  if (firebaseConfigured && window.firebase) {
    try { firebase.initializeApp(firebaseConfig); auth=firebase.auth(); db=firebase.firestore(); storage=firebase.storage(); firebaseEnabled=true; } catch (err) { console.error('Firebase initialization failed', err); }
  }
  const WA_URL = 'https://wa.me/201024905914';
  const TG_URL = 'https://t.me/+201024905914';
  const $ = (s, root=document) => root.querySelector(s);
  const $$ = (s, root=document) => [...root.querySelectorAll(s)];
  const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const sample = [
    {id:1,type:'course',title:'اللغة العربية',subject:'اللغة العربية',description:'شرح منظم للقواعد والنصوص والقراءة.',teacher:'معلّم أفق',icon:'أ',status:'منشور',created:Date.now()},
    {id:2,type:'course',title:'اللغة الإنجليزية',subject:'اللغة الإنجليزية',description:'تأسيس ومراجعة وتدريب على الأسئلة.',teacher:'معلّم أفق',icon:'EN',status:'منشور',created:Date.now()},
    {id:3,type:'course',title:'التاريخ',subject:'التاريخ',description:'افهم الأحداث واربط بينها واستعد للامتحان.',teacher:'معلّم أفق',icon:'⌛',status:'منشور',created:Date.now()},
    {id:4,type:'course',title:'الرياضيات',subject:'الرياضيات',description:'خطوات واضحة وتدريبات متنوعة.',teacher:'معلّم أفق',icon:'∑',status:'منشور',created:Date.now()},
    {id:5,type:'course',title:'الفيزياء',subject:'الفيزياء',description:'شرح المفاهيم والقوانين مع أم
