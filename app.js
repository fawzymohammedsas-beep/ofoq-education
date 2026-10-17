
(() => {
  const OWNER_EMAIL = 'fawzymohammedsas@gmail.com';
  const firebaseConfig = window.OFOQ_FIREBASE_CONFIG || {};
  const firebaseConfigured = !!(
    firebaseConfig.apiKey &&
    firebaseConfig.projectId &&
    firebaseConfig.appId &&
    !String(firebaseConfig.apiKey).startsWith('PASTE_') &&
    !String(firebaseConfig.projectId).startsWith('PASTE_')
  );

  let auth = null, db = null, storage = null, firebaseEnabled = false;

  if (firebaseConfigured && window.firebase) {
    try {
      firebase.initializeApp(firebaseConfig);
      auth = firebase.auth();
      db = firebase.firestore();
      storage = firebase.storage();
      firebaseEnabled = true;
    } catch (err) {
      console.error('Firebase initialization failed', err);
    }
  }

  const WA_URL = 'https://wa.me/201024905914';
  const TG_URL = 'https://t.me/+201024905914';
  const $ = (s, root = document) => root.querySelector(s);
  const $$ = (s, root = document) => [...root.querySelectorAll(s)];

  const escapeHtml = value =>
    String(value ?? '').replace(/[&<>"']/g, c => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    }[c]));

  const sample = [
    {id:1,type:'course',title:'اللغة العربية',subject:'اللغة العربية',description:'شرح منظم للقواعد والنصوص والقراءة.',teacher:'معلّم أفق',icon:'أ',status:'منشور',created:Date.now()},
    {id:2,type:'course',title:'اللغة الإنجليزية',subject:'اللغة الإنجليزية',description:'تأسيس ومراجعة وتدريب على الأسئلة.',teacher:'معلّم أفق',icon:'EN',status:'منشور',created:Date.now()},
    {id:3,type:'course',title:'التاريخ',subject:'التاريخ',description:'افهم الأحداث واربط بينها واستعد للامتحان.',teacher:'معلّم أفق',icon:'⌛',status:'منشور',created:Date.now()},
    {id:4,type:'course',title:'الرياضيات',subject:'الرياضيات',description:'خطوات واضحة وتدريبات متنوعة.',teacher:'معلّم أفق',icon:'∑',status:'منشور',created:Date.now()},
    {id:5,type:'course',title:'الفيزياء',subject:'الفيزياء',description:'شرح المفاهيم والقوانين مع أمثلة تطبيقية.',teacher:'معلّم أفق',icon:'⚛',status:'منشور',created:Date.now()},
    {id:6,type:'course',title:'الكيمياء',subject:'الكيمياء',description:'مراجعة المفاهيم والتفاعلات والتدريبات.',teacher:'معلّم أفق',icon:'⚗',status:'منشور',created:Date.now()}
  ];

  let state = {
    user: null,
    view: 'home',
    adminTab: 'course',
    quizId: null,
    selectedAnswers: {},
    lastScore: null
  };

  let content = firebaseEnabled ? [] : loadContent();
  let toastTimer;

  function loadContent() {
    try {
      const saved = JSON.parse(localStorage.getItem('ofoq_content') || 'null');
      return Array.isArray(saved) ? saved : sample;
    } catch {
      return sample;
    }
  }

  function saveContent() {
    localStorage.setItem('ofoq_content', JSON.stringify(content));

    if (firebaseEnabled && auth && auth.currentUser && isOwner()) {
      syncCloudContent().catch(err => {
        console.error(err);
        toast('تم الحفظ محليًا، لكن تعذّر مزامنة المحتوى مع قاعدة البيانات. راجع إعدادات Firebase.');
      });
    }
  }

  async function syncCloudContent() {
    if (!firebaseEnabled || !auth.currentUser || !isOwner()) return;

    const ref = db.collection('content');
    const existing = await ref.get();
    const keep = new Set(content.map(x => String(x.id)));
    let batch = db.batch();
    let count = 0;

    existing.docs.forEach(doc => {
      if (!keep.has(doc.id)) {
        batch.delete(doc.ref);
        count++;
      }
    });

    for (const item of content) {
      batch.set(ref.doc(String(item.id)), item, {merge: true});
      count++;

      if (count >= 400) {
        await batch.commit();
        batch = db.batch();
        count = 0;
      }
    }

    if (count) await batch.commit();
  }

  async function loadCloudContent() {
    if (!firebaseEnabled || !auth.currentUser) return;

    const query = isOwner()
      ? db.collection('content')
      : db.collection('content').where('status', '==', 'منشور');

    const snap = await query.get();

    content = snap.docs.map(doc => ({
      ...doc.data(),
      id: doc.data().id ?? doc.id
    }));

    localStorage.setItem('ofoq_content', JSON.stringify(content));
  }

  function toast(message) {
    const el = $('#toast');
    if (!el) return;

    el.textContent = message;
    el.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove('show'), 3300);
  }

  function isOwner() {
    return (state.user?.email || '').toLowerCase() === OWNER_EMAIL;
  }

  async function login(email, name, firebaseUser = null) {
    state.user = {
      email: email.trim().toLowerCase(),
      name: name || email.split('@')[0],
      uid: firebaseUser?.uid || null
    };

    if (firebaseEnabled && firebaseUser) {
      try {
        await loadCloudContent();

        await db.collection('users').doc(firebaseUser.uid).set({
          uid: firebaseUser.uid,
          email: state.user.email,
          name: state.user.name,
          lastLogin: firebase.firestore.FieldValue.serverTimestamp()
        }, {merge: true});
      } catch (err) {
        console.error(err);
        toast('تعذّر تحميل بيانات المنصة. تأكد من نشر قواعد Firestore.');
      }
    }

    $('#login-screen').classList.add('hidden');
    $('#app-shell').classList.remove('hidden');
    $('#mini-name').textContent = state.user.name;
    $('#top-name').textContent = state.user.name;
    $('#mini-avatar').textContent = state.user.name.charAt(0).toUpperCase();
    $('#top-avatar').textContent = state.user.name.charAt(0).toUpperCase();
    $('#mini-role').textContent = isOwner() ? 'مالك المنصة' : 'طالب المنصة';
    $('#top-role').textContent = isOwner() ? 'المالك' : 'طالب';
    $('#admin-nav-wrap').classList.toggle('hidden', !isOwner());

    state.view = 'home';
    render();

    if (isOwner()) {
      toast(firebaseUser
        ? 'مرحبًا بمالك أُفُق. تم تسجيل الدخول بحساب Google.'
        : 'مرحبًا بمالك أُفُق — وضع العرض التجريبي مُفعّل.');
    } else {
      toast(firebaseUser
        ? 'أهلًا بك في أُفُق التعليمية.'
        : 'أهلًا بك في أُفُق التعليمية. هذه نسخة تجريبية.');
    }
  }

  function logout() {
    if (firebaseEnabled && auth && auth.currentUser) {
      auth.signOut().catch(console.error);
    }

    state.user = null;
    $('#app-shell').classList.add('hidden');
    $('#login-screen').classList.remove('hidden');
    $('#sidebar').classList.remove('open');
  }

  function contentOf(type) {
    return content.filter(x => x.type === type && x.status !== 'مسودة');
  }

  function iconFor(item) {
    return item.icon || ({
      course: '▤',
      lecture: '▷',
      file: '▧',
      exam: '✓'
    }[item.type] || '✦');
  }

  function typeLabel(type) {
    return ({
      course: 'كورس',
      lecture: 'محاضرة',
      file: 'ملف',
      exam: 'امتحان'
    }[type] || type);
  }

  function card(item) {
    const typ = item.type;

    return `<article class="course-card">
      <div class="course-cover">
        <span class="cover-tag">${escapeHtml(typeLabel(typ))}</span>
        <span class="subject-symbol">${escapeHtml(iconFor(item))}</span>
      </div>
      <div class="course-body">
        <h3>${escapeHtml(item.title)}</h3>
        <p>${escapeHtml(item.description || item.subject || 'محتوى تعليمي من منصة أفق.')}</p>
        <div class="course-meta">
          <span>${escapeHtml(item.subject || 'أفق التعليمية')}</span>
          <strong>${typ === 'exam' ? 'اختبار تفاعلي' : typ === 'file' ? 'مرفق تعليمي' : typ === 'lecture' ? 'درس تعليمي' : 'ابدأ التعلّم'}</strong>
        </div>
        <button class="primary-btn course-action" data-open-item="${item.id}">
          ${typ === 'exam' ? 'ابدأ الامتحان' : typ === 'file' ? 'عرض الملف' : typ === 'lecture' ? 'مشاهدة التفاصيل' : 'عرض الكورس'}
          <span>←</span>
        </button>
      </div>
    </article>`;
  }

  function empty(title, desc, icon = '✦') {
    return `<div class="empty-state">
      <div class="empty-icon">${icon}</div>
      <strong>${escapeHtml(title)}</strong>
      <p>${escapeHtml(desc)}</p>
    </div>`;
  }

  function heading(title, desc, action = '') {
    return `<div class="section-heading">
      <div><h2>${title}</h2><p>${desc}</p></div>
      ${action}
    </div>`;
  }

  function listRow(item, admin = false) {
    const label = item.type === 'file'
      ? (item.fileName || 'ملف مرفق')
      : item.type === 'exam'
        ? 'امتحان'
        : item.type === 'lecture'
          ? 'محاضرة'
          : 'كورس';

    return `<div class="list-row">
      <div class="list-icon">${escapeHtml(iconFor(item))}</div>
      <div class="list-info">
        <strong>${escapeHtml(item.title)}</strong>
        <p>${escapeHtml(item.subject || label)} • ${escapeHtml(item.description || 'محتوى تعليمي')}</p>
      </div>
      <div class="list-end">
        <span class="badge ${item.status === 'مسودة' ? 'gray' : 'blue'}">${escapeHtml(item.status || 'منشور')}</span>
        ${admin
          ? `<button class="secondary-btn small-btn" data-edit-item="${item.id}">تعديل</button>
             <button class="danger-btn small-btn" data-delete-item="${item.id}">حذف</button>`
          : `<button class="secondary-btn small-btn" data-open-item="${item.id}">فتح</button>`}
      </div>
    </div>`;
  }

  function render() {
    if (!state.user) return;

    const names = {
      home: 'الرئيسية',
      courses: 'الكورسات والمواد',
      lectures: 'المحاضرات',
      files: 'الملفات والمذكرات',
      exams: 'الامتحانات',
      honor: 'لوحة الشرف',
      certificates: 'شهاداتي',
      admin: 'لوحة تحكم المالك'
    };

    $('#crumb-current').textContent = names[state.view] || 'الرئيسية';

    $$('.nav-item').forEach(b => {
      b.classList.toggle('active', b.dataset.view === state.view);
    });

    const root = $('#view-root');

    const views = {
      home: homeView,
      courses: () => collectionView('course', 'الكورسات والمواد', 'كل المواد والكورسات المنشورة في أفق.'),
      lectures: () => collectionView('lecture', 'المحاضرات', 'تابع المحاضرات المنشورة حسب المادة.'),
      files: () => collectionView('file', 'الملفات والمذكرات', 'ملفات وملحقات تعليمية منظمة للطلاب.'),
      exams: () => collectionView('exam', 'الامتحانات', 'اختبر فهمك وتابع نتائج محاولاتك.'),
      honor: honorView,
      certificates: certificatesView,
      admin: adminView
    };

    root.innerHTML = (views[state.view] || homeView)();
  }

  function homeView() {
    const courses = contentOf('course');
    const lectures = contentOf('lecture');
    const files = contentOf('file');
    const exams = contentOf('exam');

    return `<section class="welcome-banner">
      <div class="welcome-copy">
        <div class="eyebrow"><span class="pulse"></span> أُفُق التعليمية • OFOQ</div>
        <h2>أهلًا بك في <span class="gradient-text">أُفُقك الجديد</span></h2>
        <p>كل خطوة بتقربك من هدفك. ابدأ بمحاضرة، راجع ملفاتك، واختبر مستواك بثقة.</p>
        <button class="primary-btn" data-goto="courses">اكتشف المواد والكورسات <span>←</span></button>
      </div>
      <img class="banner-emblem" src="assets/ofoq-logo.png" alt="شعار أفق">
    </section>

    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-top"><span class="stat-icon">▤</span><span class="stat-trend">متاح</span></div>
        <div class="stat-value">${courses.length}</div>
        <div class="stat-label">الكورسات والمواد</div>
        <div class="progress-track"><div class="progress-fill" style="width:${Math.min(100, courses.length * 12)}%"></div></div>
      </div>
      <div class="stat-card">
        <div class="stat-top"><span class="stat-icon">▷</span><span class="badge blue">محتوى</span></div>
        <div class="stat-value">${lectures.length}</div>
        <div class="stat-label">المحاضرات المنشورة</div>
        <div class="progress-track"><div class="progress-fill" style="width:${Math.min(100, lectures.length * 15)}%"></div></div>
      </div>
      <div class="stat-card">
        <div class="stat-top"><span class="stat-icon">▧</span><span class="badge blue">ملفات</span></div>
        <div class="stat-value">${files.length}</div>
        <div class="stat-label">الملفات والمذكرات</div>
        <div class="progress-track"><div class="progress-fill" style="width:${Math.min(100, files.length * 15)}%"></div></div>
      </div>
      <div class="stat-card">
        <div class="stat-top"><span class="stat-icon">✓</span><span class="badge blue">تدريب</span></div>
        <div class="stat-value">${exams.length}</div>
        <div class="stat-label">الامتحانات</div>
        <div class="progress-track"><div class="progress-fill" style="width:${Math.min(100, exams.length * 15)}%"></div></div>
      </div>
    </div>

    <section class="content-section">
      ${heading('ابدأ رحلتك التعليمية', 'اختار القسم اللي محتاجه وابدأ من دلوقتي.')}
      <div class="quick-grid">
        <button class="quick-card" data-goto="courses"><span>▤</span><strong>المواد والكورسات</strong><small>اكتشف المحتوى التعليمي</small></button>
        <button class="quick-card" data-goto="lectures"><span>▷</span><strong>المحاضرات</strong><small>تابع دروسك</small></button>
        <button class="quick-card" data-goto="files"><span>▧</span><strong>الملفات والمذكرات</strong><small>راجع ملفاتك</small></button>
        <button class="quick-card" data-goto="exams"><span>✓</span><strong>الامتحانات</strong><small>اختبر مستواك</small></button>
      </div>
    </section>

    <section class="content-section">
      ${heading('أحدث الكورسات', 'محتوى يساعدك على التقدم خطوة بخطوة.', `<button class="secondary-btn" data-goto="courses">عرض الكل ←</button>`)}
      <div class="course-grid">${courses.length ? courses.slice(0, 3).map(card).join('') : empty('لسه مفيش كورسات', 'سيتم عرض الكورسات هنا عند نشرها.')}</div>
    </section>`;
  }

  function collectionView(type, title, desc) {
    const items = contentOf(type);

    return `<section class="content-section">
      ${heading(title, desc)}
      <div class="course-grid">
        ${items.length ? items.map(card).join('') : empty('المحتوى لسه بيتجهز', 'ارجع قريبًا لمشاهدة المحتوى الجديد.')}
      </div>
    </section>`;
  }

  function honorView() {
    return `<section class="content-section">
      ${heading('لوحة الشرف', 'كل إنجاز صغير هو خطوة كبيرة للأمام.')}
      ${empty('لوحة الشرف قريبًا', 'سيتم عرض أسماء الطلاب المتميزين هنا.', '★')}
    </section>`;
  }

  function certificatesView() {
    return `<section class="content-section">
      ${heading('شهاداتي', 'تابع شهاداتك وإنجازاتك التعليمية.')}
      ${empty('لا توجد شهادات حتى الآن', 'ستظهر الشهادات هنا عند إتاحتها.', '🏆')}
    </section>`;
  }

  function adminView() {
    if (!isOwner()) {
      return empty('غير مصرح بالدخول', 'هذه الصفحة مخصصة لمالك المنصة.');
    }

    const tabs = [
      ['course', 'كورس'],
      ['lecture', 'محاضرة'],
      ['file', 'ملف'],
      ['exam', 'امتحان']
    ];

    return `<section class="content-section">
      ${heading('لوحة تحكم المالك', 'أضف المحتوى التعليمي ونظّمه للطلاب.')}
      <div class="admin-tabs">
        ${tabs.map(([key, label]) => `<button class="secondary-btn ${state.adminTab === key ? 'active' : ''}" data-admin-tab="${key}">إضافة ${label}</button>`).join('')}
      </div>
      ${itemForm(state.adminTab)}
      <div class="admin-list">
        <h3>المحتوى الحالي</h3>
        <div class="list-stack">
          ${content.length ? content.map(item => listRow(item, true)).join('') : empty('لا يوجد محتوى', 'ابدأ بإضافة أول عنصر تعليمي.')}
        </div>
      </div>
    </section>`;
  }

  function itemForm(type) {
    return `<form id="content-form" class="content-form">
      <div class="form-grid">
        <div class="field">
          <label for="item-title">العنوان</label>
          <input id="item-title" name="title" required placeholder="عنوان المحتوى">
        </div>
        <div class="field">
          <label for="item-subject">المادة</label>
          <input id="item-subject" name="subject" placeholder="مثال: التاريخ">
        </div>
        <div class="field full">
          <label for="item-description">الوصف</label>
          <textarea id="item-description" name="description" rows="3" placeholder="وصف مختصر للمحتوى"></textarea>
        </div>
        <div class="field">
          <label for="item-status">حالة المحتوى</label>
          <select id="item-status" name="status">
            <option value="منشور">منشور</option>
            <option value="مسودة">مسودة</option>
          </select>
        </div>
        ${type === 'lecture' ? `<div class="field"><label for="item-url">رابط المحاضرة</label><input id="item-url" name="url" type="url" placeholder="https://..."></div>` : ''}
        ${type === 'file' ? `<div class="field full"><label for="item-file">رفع ملف</label><input id="item-file" name="file" type="file" accept=".pdf,.doc,.docx,.ppt,.pptx,.jpg,.png"></div>` : ''}
        ${type === 'exam' ? `
          <div class="field full"><label for="item-question">السؤال الأول (اختياري)</label><input id="item-question" name="question" placeholder="مثال: ما المقصود بـ..."></div>
          <div class="field"><label for="item-a">الاختيار أ</label><input id="item-a" name="a" placeholder="الاختيار الأول"></div>
          <div class="field"><label for="item-b">الاختيار ب</label><input id="item-b" name="b" placeholder="الاختيار الثاني"></div>
          <div class="field"><label for="item-c">الاختيار ج</label><input id="item-c" name="c" placeholder="الاختيار الثالث"></div>
          <div class="field"><label for="item-correct">الإجابة الصحيحة</label><select id="item-correct" name="correct"><option value="0">الاختيار أ</option><option value="1">الاختيار ب</option><option value="2">الاختيار ج</option></select></div>
        ` : ''}
      </div>
      <div class="form-actions">
        <button class="primary-btn" type="submit">＋ حفظ ${type === 'course' ? 'الكورس' : type === 'lecture' ? 'المحاضرة' : type === 'file' ? 'الملف' : 'الامتحان'} ونشره</button>
        <button class="secondary-btn" type="reset">مسح الحقول</button>
      </div>
    </form>`;
  }

  function openModal(html) {
    $('#modal-content').innerHTML = html;
    $('#modal-backdrop').classList.remove('hidden');
  }

  function closeModal() {
    $('#modal-backdrop').classList.add('hidden');
  }

  function openItem(id) {
    const item = content.find(x => x.id === Number(id));
    if (!item) return;

    if (item.type === 'exam') {
      openExam(item);
      return;
    }

    let inner = '';

    if (item.type === 'lecture' && item.url) {
      inner = `<div class="video-placeholder">
        <div style="font-size:38px;color:#74c6ff">▷</div>
        <p>رابط المحاضرة</p>
        <a class="primary-btn" href="${escapeHtml(item.url)}" target="_blank" rel="noopener">فتح المحاضرة ↗</a>
      </div>`;
    } else if (item.type === 'file') {
      inner = item.fileUrl
        ? `<div class="video-placeholder">
            <div style="font-size:38px;color:#74c6ff">▧</div>
            <p>${escapeHtml(item.fileName || 'ملف تعليمي')}</p>
            <a class="primary-btn" href="${escapeHtml(item.fileUrl)}" target="_blank" rel="noopener">فتح / تنزيل الملف ↗</a>
          </div>`
        : `<div class="empty-state">
            <div class="empty-icon">▧</div>
            <strong>${escapeHtml(item.fileName || 'ملف تعليمي')}</strong>
            <p>${item.fileName ? 'اسم الملف محفوظ في المعاينة فقط؛ فعّل Firebase Storage لرفع الملف فعليًا.' : 'لم يتم ربط ملف بهذا العنصر.'}</p>
          </div>`;
    } else if (item.type === 'course') {
      const related = content.filter(x =>
        x.subject === item.title &&
        x.status !== 'مسودة' &&
        x.id !== item.id
      );

      inner = related.length
        ? `<div class="list-stack">${related.map(x => listRow(x)).join('')}</div>`
        : empty('محتوى الكورس قيد الإضافة', 'سيتم عرض محاضرات وملفات وامتحانات هذا الكورس هنا عند إضافتها.', '▷');
    }

    openModal(`<div class="eyebrow">مكتبة أفق التعليمية</div>
      <h2 style="margin-top:10px">${escapeHtml(item.title)}</h2>
      <p>${escapeHtml(item.description || 'محتوى تعليمي من أفق.')}</p>${inner}`);
  }

  function openExam(item) {
    if (!item.question) {
      openModal(`<h2>${escapeHtml(item.title)}</h2><p>لم يضف مالك المنصة أسئلة لهذا الامتحان بعد.</p>`);
      return;
    }

    state.quizId = item.id;
    state.selectedAnswers = {};

    openModal(`<div class="eyebrow">اختبر معلوماتك</div>
      <h2 style="margin-top:10px">${escapeHtml(item.title)}</h2>
      <p>نسخة تجريبية — سؤال واحد.</p>
      <form id="quiz-form">
        <h3 class="quiz-question">${escapeHtml(item.question)}</h3>
        ${[item.a, item.b, item.c].map((a, i) =>
          `<label class="quiz-option"><input type="radio" name="answer" value="${i}" required> ${escapeHtml(a || `الاختيار ${['أ','ب','ج'][i]}`)}</label>`
        ).join('')}
        <button class="primary-btn" style="margin-top:13px;width:100%" type="submit">تأكيد الإجابة</button>
      </form>`);
  }

  function bindEvents() {
    document.addEventListener('click', e => {
      const nav = e.target.closest('[data-view]');
      if (nav) {
        state.view = nav.dataset.view;
        $('#sidebar').classList.remove('open');
        render();
        return;
      }

      const goto = e.target.closest('[data-goto]');
      if (goto) {
        state.view = goto.dataset.goto;
        render();
        return;
      }

      const tab = e.target.closest('[data-admin-tab]');
      if (tab) {
        state.adminTab = tab.dataset.adminTab;
        render();
        return;
      }

      const open = e.target.closest('[data-open-item]');
      if (open) {
        openItem(open.dataset.openItem);
        return;
      }

      const del = e.target.closest('[data-delete-item]');
      if (del) {
        if (!isOwner()) return toast('غير مصرح.');

        const item = content.find(x => x.id === Number(del.dataset.deleteItem));

        if (item && confirm(`هل تريد حذف «${item.title}»؟`)) {
          content = content.filter(x => x.id !== item.id);
          saveContent();
          render();
          toast('تم حذف العنصر من بيانات العرض التجريبي.');
        }
        return;
      }

      const edit = e.target.closest('[data-edit-item]');
      if (edit) {
        const item = content.find(x => x.id === Number(edit.dataset.editItem));

        if (item) {
          state.adminTab = item.type;
          render();

          $('#item-title').value = item.title;
          $('#item-subject').value = item.subject || '';
          $('#item-description').value = item.description || '';

          toast('عدّل البيانات ثم احفظها كعنصر جديد في هذه النسخة التجريبية.');
        }
        return;
      }
    });

    $('#preview-login').addEventListener('click', () => openModal(`
      <h2>الدخول إلى النسخة التجريبية</h2>
      <p>اكتب بريدًا للتجربة. لا يتم الاتصال بخدمة تسجيل Google في هذه النسخة.</p>
      <form id="demo-login-form">
        <div class="field">
          <label for="demo-email">البريد الإلكتروني</label>
          <input id="demo-email" type="email" required placeholder="name@example.com">
        </div>
        <div class="field" style="margin-top:12px">
          <label for="demo-name">الاسم الظاهر</label>
          <input id="demo-name" placeholder="طالب أفق">
        </div>
        <button class="primary-btn" style="width:100%;margin-top:15px" type="submit">دخول للمعاينة ←</button>
      </form>
      <p class="setup-note" style="text-align:right">استخدم بريد المالك المحدد لعرض لوحة الإدارة. هذه صلاحية محاكاة محلية فقط وليست حماية حقيقية.</p>
    `));

    $('#google-login').addEventListener('click', async () => {
      if (!firebaseEnabled) {
        openModal(`
          <h2>تفعيل تسجيل Google</h2>
          <p>الموقع مجهّز للربط، لكن بيانات مشروع Firebase لم تُضف بعد. افتح ملف <b>firebase-config.js</b> وضع إعدادات مشروعك، ثم فعّل Google من Authentication وانشر قواعد الأمان الموجودة في الحزمة.</p>
          <button class="primary-btn" id="google-info-ok" style="width:100%">حسنًا</button>
        `);
        return;
      }

      try {
      await auth.signInWithRedirect(new firebase.auth.GoogleAuthProvider());
      } catch (err) {
        console.error('Google sign-in error:', err);
        toast('تعذّر بدء تسجيل الدخول. تحقق من اتصال الإنترنت وإعدادات Firebase.');
      }
    });

  if (firebaseEnabled) {
  $('#preview-login').classList.add('hidden');

  auth.onAuthStateChanged(user => {
    if (user) {
      login(user.email || '', user.displayName || user.email, user);
    } else if (state.user?.uid) {
      state.user = null;
      $('#app-shell').classList.add('hidden');
      $('#login-screen').classList.remove('hidden');
    }
  });
} 
        

    $('#modal-close').addEventListener('click', closeModal);

    $('#modal-backdrop').addEventListener('click', e => {
      if (e.target.id === 'modal-backdrop') closeModal();
    });

    document.addEventListener('submit', async e => {
      e.preventDefault();

      if (e.target.id === 'demo-login-form') {
        const email = $('#demo-email').value;
        const name = $('#demo-name').value.trim() || email.split('@')[0];

        closeModal();
        login(email, name);
      }

      if (e.target.id === 'content-form') {
        if (!isOwner()) return toast('غير مصرح بإضافة المحتوى.');

        const fd = new FormData(e.target);
        const file = fd.get('file');

        const item = {
          id: Date.now(),
          type: state.adminTab,
          title: String(fd.get('title')).trim(),
          subject: String(fd.get('subject') || '').trim(),
          description: String(fd.get('description') || '').trim(),
          status: String(fd.get('status') || 'منشور'),
          created: Date.now(),
          icon: ({course:'▤', lecture:'▷', file:'▧', exam:'✓'}[state.adminTab]),
          url: String(fd.get('url') || '').trim(),
          fileName: file && file.name ? file.name : '',
          fileUrl: '',
          question: String(fd.get('question') || '').trim(),
          a: String(fd.get('a') || '').trim(),
          b: String(fd.get('b') || '').trim(),
          c: String(fd.get('c') || '').trim(),
          correct: Number(fd.get('correct') || 0)
        };

        if (file && file.name && firebaseEnabled && auth.currentUser && storage && state.adminTab === 'file') {
          try {
            const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
            const fileRef = storage.ref('course-files/' + Date.now() + '-' + safeName);

            await fileRef.put(file);
            item.fileUrl = await fileRef.getDownloadURL();
          } catch (err) {
            console.error(err);
            return toast('فشل رفع الملف. تحقق من قواعد Firebase Storage وحجم الملف.');
          }
        }

        content.push(item);
        saveContent();
        render();

        toast(firebaseEnabled && auth.currentUser
          ? 'تم حفظ المحتوى ومزامنته مع المنصة.'
          : 'تم حفظ العنصر في هذا المتصفح فقط؛ فعّل Firebase للمزامنة بين الطلاب.');
      }

      if (e.target.id === 'quiz-form') {
        const item = content.find(x => x.id === state.quizId);
        if (!item) return;

        const answer = Number(new FormData(e.target).get('answer'));
        const correct = answer === Number(item.correct);

        state.lastScore = correct ? 100 : 0;

        openModal(`
          <div class="eyebrow">نتيجة الامتحان التجريبي</div>
          <div class="result-score">${correct ? '100%' : '0%'}</div>
          <h2>${correct ? 'إجابة صحيحة، أحسنت!' : 'حاول مرة أخرى'}</h2>
          <p>${correct ? 'واصل التقدم، كل إجابة صحيحة خطوة للأمام.' : 'راجع الدرس ثم أعد المحاولة.'}</p>
          <button class="primary-btn" id="finish-quiz" style="width:100%">إنهاء</button>
        `);
      }
    });

    $('#modal-content').addEventListener('click', e => {
      if (e.target.id === 'google-info-ok') closeModal();
      if (e.target.id === 'finish-quiz') closeModal();
    });

    $('#logout').addEventListener('click', logout);

    $('#sidebar-support').addEventListener('click', () => openModal(`
      <h2>تواصل مع دعم أفق</h2>
      <p>اختار وسيلة التواصل المناسبة. رقم التواصل: 01024905914</p>
      <div class="form-actions">
        <a class="primary-btn" href="${WA_URL}" target="_blank" rel="noopener">التواصل عبر واتساب ↗</a>
        <a class="secondary-btn" href="${TG_URL}" target="_blank" rel="noopener">التواصل عبر تليجرام ↗</a>
      </div>
      <p class="setup-note">رابط تليجرام المرتبط برقم الهاتف قد لا يعمل مع كل الحسابات؛ يفضّل استبداله باسم مستخدم أو رابط حساب مباشر.</p>
    `));

    $('#open-menu').addEventListener('click', () => $('#sidebar').classList.add('open'));
    $('#close-menu').addEventListener('click', () => $('#sidebar').classList.remove('open'));
  }

  bindEvents();
})();
