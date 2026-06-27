/* i18n.js — interface-language catalog + lookup.
   SEPARATE from the Qur'an-meaning translations in data/translations.json:
   this only translates the app's chrome (buttons, menus, labels, toasts).
   The Arabic Qur'an text is never touched by anything here.

   Catalog is key-major: each id maps to {en,fr,es,ur,ar}. t() falls back to
   English, then to the raw key. Placeholders use {name} / {n} style. */
(function (BA) {
  // languages offered for the UI (autonyms — each shown in its own script)
  const LANGS = [
    ['en', 'English'],
    ['fr', 'Français'],
    ['es', 'Español'],
    ['ur', 'اردو'],
    ['ar', 'العربية'],
  ];
  const META = {
    en: { dir: 'ltr' }, fr: { dir: 'ltr' }, es: { dir: 'ltr' },
    ur: { dir: 'rtl' }, ar: { dir: 'rtl' },
  };

  // ── string catalog ────────────────────────────────────────────────────────
  const S = {
    // app / boot
    'app.title':        { en: 'Al-Baqarah · Hifz', fr: 'Al-Baqara · Hifz', es: 'Al-Baqara · Hifz', ur: 'البقرہ · حفظ', ar: 'البقرة · حفظ' },
    'app.appInstalled': { en: 'App installed ✓', fr: 'Application installée ✓', es: 'App instalada ✓', ur: 'ایپ انسٹال ہوگئی ✓', ar: 'تم تثبيت التطبيق ✓' },
    'app.couldNotLoadTranslation': { en: 'Could not load translation', fr: 'Impossible de charger la traduction', es: 'No se pudo cargar la traducción', ur: 'ترجمہ لوڈ نہ ہوسکا', ar: 'تعذّر تحميل الترجمة' },
    'app.dataLoadError': {
      en: 'Could not load the Qur’an data. If you opened the file directly, please serve the folder over HTTP (e.g. <code>python3 -m http.server</code>).',
      fr: 'Impossible de charger les données du Coran. Si vous avez ouvert le fichier directement, servez le dossier via HTTP (ex. <code>python3 -m http.server</code>).',
      es: 'No se pudieron cargar los datos del Corán. Si abriste el archivo directamente, sirve la carpeta por HTTP (p. ej. <code>python3 -m http.server</code>).',
      ur: 'قرآن کا ڈیٹا لوڈ نہ ہوسکا۔ اگر آپ نے فائل براہِ راست کھولی ہے تو فولڈر کو HTTP پر سرو کریں (مثلاً <code>python3 -m http.server</code>)۔',
      ar: 'تعذّر تحميل بيانات القرآن. إن فتحت الملف مباشرة، فقدّم المجلد عبر HTTP (مثل <code>python3 -m http.server</code>).' },

    // nav / sidebar
    'nav.home':     { en: 'Home', fr: 'Accueil', es: 'Inicio', ur: 'ہوم', ar: 'الرئيسية' },
    'nav.listen':   { en: 'Listen & Loop', fr: 'Écouter & Boucler', es: 'Escuchar y repetir', ur: 'سنیں اور دہرائیں', ar: 'الاستماع والتكرار' },
    'nav.memorize': { en: 'Memorize', fr: 'Mémoriser', es: 'Memorizar', ur: 'حفظ کریں', ar: 'الحفظ' },
    'nav.test':     { en: 'Test', fr: 'Tester', es: 'Evaluar', ur: 'ٹیسٹ', ar: 'اختبار' },
    'nav.progress': { en: 'Progress', fr: 'Progression', es: 'Progreso', ur: 'پیش رفت', ar: 'التقدّم' },
    'nav.settings': { en: 'Settings', fr: 'Réglages', es: 'Ajustes', ur: 'سیٹنگز', ar: 'الإعدادات' },
    'nav.mountError': { en: 'Something went wrong loading this view.', fr: 'Une erreur s’est produite lors du chargement.', es: 'Algo salió mal al cargar esta vista.', ur: 'یہ ویو لوڈ کرنے میں مسئلہ ہوا۔', ar: 'حدث خطأ أثناء تحميل هذا العرض.' },
    'group.start':    { en: 'Start', fr: 'Démarrer', es: 'Comenzar', ur: 'آغاز', ar: 'البداية' },
    'group.memorize': { en: 'Memorize', fr: 'Mémoriser', es: 'Memorizar', ur: 'حفظ', ar: 'الحفظ' },
    'group.you':      { en: 'You', fr: 'Vous', es: 'Tú', ur: 'آپ', ar: 'أنت' },

    // top bar / aria / player
    'topbar.reading':  { en: 'Reading', fr: 'Lecture', es: 'Lectura', ur: 'قراءت', ar: 'الرواية' },
    'aria.menu':       { en: 'Menu', fr: 'Menu', es: 'Menú', ur: 'مینو', ar: 'القائمة' },
    'aria.theme':      { en: 'Toggle dark mode', fr: 'Basculer le mode sombre', es: 'Alternar modo oscuro', ur: 'ڈارک موڈ ٹوگل کریں', ar: 'تبديل الوضع الداكن' },
    'aria.streak':     { en: 'Daily streak', fr: 'Série quotidienne', es: 'Racha diaria', ur: 'روزانہ سلسلہ', ar: 'التتابع اليومي' },
    'aria.prev':       { en: 'Previous ayah', fr: 'Verset précédent', es: 'Aleya anterior', ur: 'پچھلی آیت', ar: 'الآية السابقة' },
    'aria.playpause':  { en: 'Play / pause', fr: 'Lecture / pause', es: 'Reproducir / pausar', ur: 'چلائیں / وقفہ', ar: 'تشغيل / إيقاف مؤقت' },
    'aria.next':       { en: 'Next ayah', fr: 'Verset suivant', es: 'Aleya siguiente', ur: 'اگلی آیت', ar: 'الآية التالية' },
    'aria.stop':       { en: 'Stop', fr: 'Arrêter', es: 'Detener', ur: 'روکیں', ar: 'إيقاف' },
    'player.buffering':{ en: 'buffering…', fr: 'mise en mémoire…', es: 'cargando…', ur: 'بفرنگ…', ar: 'جارٍ التحميل…' },
    'player.surah':    { en: 'Surah Al-Baqarah', fr: 'Sourate Al-Baqara', es: 'Sura Al-Baqara', ur: 'سورہ البقرہ', ar: 'سورة البقرة' },

    // common
    'common.ayah':        { en: 'Ayah {n}', fr: 'Verset {n}', es: 'Aleya {n}', ur: 'آیت {n}', ar: 'الآية {n}' },
    'common.ayahOf':      { en: 'Ayah {n} / {total}', fr: 'Verset {n} / {total}', es: 'Aleya {n} / {total}', ur: 'آیت {n} / {total}', ar: 'الآية {n} / {total}' },
    'common.reciter':     { en: 'Reciter', fr: 'Récitateur', es: 'Recitador', ur: 'قاری', ar: 'القارئ' },
    'common.translation': { en: 'Translation', fr: 'Traduction', es: 'Traducción', ur: 'ترجمہ', ar: 'الترجمة' },
    'common.language':    { en: 'Language', fr: 'Langue', es: 'Idioma', ur: 'زبان', ar: 'اللغة' },
    'lang.arabicOnly':    { en: 'Arabic only', fr: 'Arabe seul', es: 'Solo árabe', ur: 'صرف عربی', ar: 'العربية فقط' },
    'common.speed':       { en: 'Speed', fr: 'Vitesse', es: 'Velocidad', ur: 'رفتار', ar: 'السرعة' },
    'common.stop':        { en: '■ Stop', fr: '■ Arrêter', es: '■ Detener', ur: '■ روکیں', ar: '■ إيقاف' },

    // status words (interpolated into toasts/pills)
    'statusWord.unseen':   { en: 'unseen', fr: 'non vu', es: 'sin ver', ur: 'نہ دیکھی', ar: 'لم تُرَ' },
    'statusWord.learning': { en: 'learning', fr: 'en cours', es: 'aprendiendo', ur: 'سیکھ رہے', ar: 'قيد الحفظ' },
    'statusWord.solid':    { en: 'solid', fr: 'solide', es: 'firme', ur: 'پختہ', ar: 'راسخة' },
    'statusWord.mastered': { en: 'mastered', fr: 'maîtrisé', es: 'dominado', ur: 'مکمل', ar: 'متقَنة' },

    // hide levels (reveal.js)
    'level.full':         { en: 'Full', fr: 'Complet', es: 'Completo', ur: 'مکمل', ar: 'كامل' },
    'level.hideLast':     { en: 'Hide last', fr: 'Masquer le dernier', es: 'Ocultar último', ur: 'آخری چھپائیں', ar: 'إخفاء الأخيرة' },
    'level.hideHalf':     { en: 'Hide half', fr: 'Masquer la moitié', es: 'Ocultar mitad', ur: 'آدھا چھپائیں', ar: 'إخفاء النصف' },
    'level.firstLetters': { en: 'First letters', fr: 'Premières lettres', es: 'Primeras letras', ur: 'پہلے حروف', ar: 'أوائل الحروف' },
    'level.blank':        { en: 'Blank', fr: 'Vide', es: 'Vacío', ur: 'خالی', ar: 'فارغ' },

    // home
    'home.title':         { en: 'Memorize Surah Al-Baqarah', fr: 'Mémoriser la sourate Al-Baqara', es: 'Memoriza la sura Al-Baqara', ur: 'سورہ البقرہ حفظ کریں', ar: 'احفظ سورة البقرة' },
    'home.ayatPill':      { en: '286 ayāt', fr: '286 versets', es: '286 aleyas', ur: '286 آیات', ar: '286 آية' },
    'home.continueLabel': { en: 'Continue where you left off', fr: 'Reprenez où vous vous êtes arrêté', es: 'Continúa donde lo dejaste', ur: 'جہاں چھوڑا تھا وہیں سے جاری رکھیں', ar: 'تابع من حيث توقفت' },
    'home.continue':      { en: '▶ Continue', fr: '▶ Continuer', es: '▶ Continuar', ur: '▶ جاری رکھیں', ar: '▶ متابعة' },
    'home.listen':        { en: '🔁 Listen', fr: '🔁 Écouter', es: '🔁 Escuchar', ur: '🔁 سنیں', ar: '🔁 استماع' },
    'home.memorized':     { en: 'Memorized', fr: 'Mémorisé', es: 'Memorizado', ur: 'حفظ شدہ', ar: 'محفوظ' },
    'home.streakLabel':   { en: 'Day streak · best {n}', fr: 'Jours d’affilée · record {n}', es: 'Días seguidos · récord {n}', ur: 'لگاتار دن · بہترین {n}', ar: 'أيام متتالية · الأفضل {n}' },
    'home.mastered':      { en: 'Mastered', fr: 'Maîtrisé', es: 'Dominado', ur: 'مکمل', ar: 'متقَن' },
    'home.inProgress':    { en: 'In progress', fr: 'En cours', es: 'En progreso', ur: 'جاری', ar: 'قيد التقدم' },
    'home.howTitle':      { en: 'How to use it', fr: 'Comment l’utiliser', es: 'Cómo usarlo', ur: 'استعمال کیسے کریں', ar: 'كيفية الاستخدام' },
    'home.how1': {
      en: '<b>Listen &amp; Loop</b> — pick a range (e.g. 1–5), set repeats, and let it loop. Listen-and-repeat is the backbone of ḥifẓ.',
      fr: '<b>Écouter &amp; Boucler</b> — choisissez une plage (ex. 1–5), définissez les répétitions et laissez boucler. Écouter-et-répéter est la base du ḥifẓ.',
      es: '<b>Escuchar y repetir</b> — elige un rango (p. ej. 1–5), ajusta las repeticiones y déjalo en bucle. Escuchar y repetir es la base del ḥifẓ.',
      ur: '<b>سنیں اور دہرائیں</b> — ایک حد منتخب کریں (مثلاً 1–5)، تکرار مقرر کریں اور لوپ چلنے دیں۔ سن کر دہرانا حفظ کی بنیاد ہے۔',
      ar: '<b>الاستماع والتكرار</b> — اختر نطاقًا (مثلاً 1–5)، حدّد عدد التكرارات ودعه يُعيد. الاستماع والترديد هو أساس الحفظ.' },
    'home.how2': {
      en: '<b>Memorize</b> — hide the words gradually (last word → half → first letters → blank), peek when stuck, mark each ayah.',
      fr: '<b>Mémoriser</b> — masquez les mots progressivement (dernier mot → moitié → premières lettres → vide), jetez un œil si besoin, marquez chaque verset.',
      es: '<b>Memorizar</b> — oculta las palabras gradualmente (última palabra → mitad → primeras letras → vacío), echa un vistazo si te atascas, marca cada aleya.',
      ur: '<b>حفظ کریں</b> — الفاظ بتدریج چھپائیں (آخری لفظ → آدھا → پہلے حروف → خالی)، اٹکنے پر جھانکیں، ہر آیت کو نشان زد کریں۔',
      ar: '<b>الحفظ</b> — أخفِ الكلمات تدريجيًا (آخر كلمة → النصف → أوائل الحروف → فارغ)، واطّلع عند التعثر، وعلّم كل آية.' },
    'home.how3': {
      en: '<b>Test</b> — fill the blanks and recall the next ayah.',
      fr: '<b>Tester</b> — comblez les blancs et retrouvez le verset suivant.',
      es: '<b>Evaluar</b> — completa los espacios y recuerda la siguiente aleya.',
      ur: '<b>ٹیسٹ</b> — خالی جگہیں پُر کریں اور اگلی آیت یاد کریں۔',
      ar: '<b>الاختبار</b> — املأ الفراغات وتذكّر الآية التالية.' },
    'home.how4': {
      en: 'Switch <b>Reading</b> (Ḥafṣ / Warsh) at the top — text <i>and</i> audio change together.',
      fr: 'Changez de <b>Lecture</b> (Ḥafṣ / Warsh) en haut — le texte <i>et</i> l’audio changent ensemble.',
      es: 'Cambia la <b>Lectura</b> (Ḥafṣ / Warsh) arriba — el texto <i>y</i> el audio cambian juntos.',
      ur: 'اوپر سے <b>قراءت</b> (حفص / ورش) تبدیل کریں — متن <i>اور</i> آڈیو ایک ساتھ بدلتے ہیں۔',
      ar: 'بدّل <b>الرواية</b> (حفص / ورش) من الأعلى — يتغير النص <i>و</i>الصوت معًا.' },
    'home.creditsTitle':  { en: 'Sources & credits', fr: 'Sources et crédits', es: 'Fuentes y créditos', ur: 'ذرائع و کریڈٹس', ar: 'المصادر والشكر' },
    'home.credits1': {
      en: 'Ḥafṣ text — <b>Tanzil Project</b> (tanzil.net). Warsh text — QPC Warsh rasm, remapped to the standard ayah numbering.',
      fr: 'Texte Ḥafṣ — <b>Tanzil Project</b> (tanzil.net). Texte Warsh — rasm Warsh QPC, réaligné sur la numérotation standard des versets.',
      es: 'Texto Ḥafṣ — <b>Tanzil Project</b> (tanzil.net). Texto Warsh — rasm Warsh QPC, reasignado a la numeración estándar de aleyas.',
      ur: 'حفص متن — <b>Tanzil Project</b> (tanzil.net)۔ ورش متن — QPC ورش رسم، معیاری آیت شماری کے مطابق ترتیب۔',
      ar: 'نص حفص — <b>Tanzil Project</b> (tanzil.net). نص ورش — رسم ورش QPC، مُعاد ترقيمه إلى ترقيم الآيات المعتاد.' },
    'home.credits2': {
      en: 'Per-ayah audio — <b>EveryAyah</b>. Full-surah Warsh — <b>mp3quran.net</b>. Font — Scheherazade New / Amiri (OFL).',
      fr: 'Audio par verset — <b>EveryAyah</b>. Warsh sourate entière — <b>mp3quran.net</b>. Police — Scheherazade New / Amiri (OFL).',
      es: 'Audio por aleya — <b>EveryAyah</b>. Warsh de la sura completa — <b>mp3quran.net</b>. Fuente — Scheherazade New / Amiri (OFL).',
      ur: 'فی آیت آڈیو — <b>EveryAyah</b>۔ مکمل سورہ ورش — <b>mp3quran.net</b>۔ فونٹ — Scheherazade New / Amiri (OFL)۔',
      ar: 'صوت لكل آية — <b>EveryAyah</b>. ورش للسورة كاملة — <b>mp3quran.net</b>. الخط — Scheherazade New / Amiri (OFL).' },
    'home.credits3': {
      en: 'Your progress is saved only on this device. Back it up in Settings.',
      fr: 'Votre progression est enregistrée uniquement sur cet appareil. Sauvegardez-la dans les Réglages.',
      es: 'Tu progreso se guarda solo en este dispositivo. Haz una copia de seguridad en Ajustes.',
      ur: 'آپ کی پیش رفت صرف اسی ڈیوائس پر محفوظ ہے۔ سیٹنگز میں بیک اپ لیں۔',
      ar: 'يُحفظ تقدّمك على هذا الجهاز فقط. خذ نسخة احتياطية من الإعدادات.' },

    // listen
    'listen.title':       { en: '🔁 Listen & Loop', fr: '🔁 Écouter & Boucler', es: '🔁 Escuchar y repetir', ur: '🔁 سنیں اور دہرائیں', ar: '🔁 الاستماع والتكرار' },
    'listen.from':        { en: 'From', fr: 'De', es: 'Desde', ur: 'سے', ar: 'من' },
    'listen.to':          { en: 'To', fr: 'À', es: 'Hasta', ur: 'تک', ar: 'إلى' },
    'listen.repeatEach':  { en: 'Repeat each ayah', fr: 'Répéter chaque verset', es: 'Repetir cada aleya', ur: 'ہر آیت دہرائیں', ar: 'تكرار كل آية' },
    'listen.loopRange':   { en: 'Loop the range', fr: 'Boucler la plage', es: 'Repetir el rango', ur: 'حد کو لوپ کریں', ar: 'تكرار النطاق' },
    'listen.gap':         { en: 'Gap between repeats', fr: 'Pause entre répétitions', es: 'Pausa entre repeticiones', ur: 'تکرار کے درمیان وقفہ', ar: 'الفاصل بين التكرارات' },
    'listen.play':        { en: '▶ Play loop', fr: '▶ Lancer la boucle', es: '▶ Reproducir bucle', ur: '▶ لوپ چلائیں', ar: '▶ تشغيل التكرار' },
    'listen.wholeSurahSuffix': { en: ' — whole surah', fr: ' — sourate entière', es: ' — sura completa', ur: ' — مکمل سورہ', ar: ' — السورة كاملة' },
    'listen.capNote': {
      en: '{name} is published as a whole-surah recording — it plays the entire surah (per-ayah looping isn’t available for this voice).',
      fr: '{name} est publié comme un enregistrement de la sourate entière — il joue toute la sourate (la boucle par verset n’est pas disponible pour cette voix).',
      es: '{name} está publicado como una grabación de la sura completa — reproduce toda la sura (el bucle por aleya no está disponible para esta voz).',
      ur: '{name} مکمل سورہ ریکارڈنگ کے طور پر دستیاب ہے — یہ پوری سورہ چلاتا ہے (اس آواز کے لیے فی آیت لوپ دستیاب نہیں)۔',
      ar: '{name} متوفر كتسجيل للسورة كاملة — يشغّل السورة بأكملها (تكرار الآية الواحدة غير متاح لهذا الصوت).' },

    // memorize
    'memorize.goTo':           { en: 'Go to', fr: 'Aller à', es: 'Ir a', ur: 'جائیں', ar: 'انتقال إلى' },
    'memorize.hideLevelLabel': { en: 'Hide level — tap a hidden word to peek', fr: 'Niveau de masquage — touchez un mot caché pour le voir', es: 'Nivel de ocultación — toca una palabra oculta para verla', ur: 'چھپانے کی سطح — جھانکنے کے لیے چھپے لفظ پر ٹیپ کریں', ar: 'مستوى الإخفاء — انقر كلمة مخفية لرؤيتها' },
    'memorize.loop':           { en: '🔁 Loop this ayah', fr: '🔁 Boucler ce verset', es: '🔁 Repetir esta aleya', ur: '🔁 یہ آیت لوپ کریں', ar: '🔁 كرّر هذه الآية' },
    'memorize.reveal':         { en: '👁 Reveal', fr: '👁 Révéler', es: '👁 Mostrar', ur: '👁 ظاہر کریں', ar: '👁 إظهار' },
    'memorize.gotIt':          { en: '✓ Got it', fr: '✓ Acquis', es: '✓ Lo sé', ur: '✓ یاد ہوگئی', ar: '✓ أتقنتها' },
    'memorize.missed':         { en: '✗ Missed', fr: '✗ Manqué', es: '✗ Fallé', ur: '✗ بھول گئی', ar: '✗ نسيتها' },
    'memorize.searchPlaceholder': { en: 'Jump to ayah # or search words…', fr: 'Aller au verset n° ou rechercher des mots…', es: 'Ir a la aleya n.º o buscar palabras…', ur: 'آیت نمبر پر جائیں یا الفاظ تلاش کریں…', ar: 'انتقل إلى رقم الآية أو ابحث عن كلمات…' },
    'memorize.noMatch':        { en: 'No matching ayah', fr: 'Aucun verset correspondant', es: 'Ninguna aleya coincide', ur: 'کوئی مماثل آیت نہیں', ar: 'لا توجد آية مطابقة' },
    'memorize.statusNew':      { en: '◌ new', fr: '◌ nouveau', es: '◌ nuevo', ur: '◌ نیا', ar: '◌ جديدة' },
    'memorize.statusLearning': { en: '○ learning', fr: '○ en cours', es: '○ aprendiendo', ur: '○ سیکھ رہے', ar: '○ قيد الحفظ' },
    'memorize.statusSolid':    { en: '◐ solid', fr: '◐ solide', es: '◐ firme', ur: '◐ پختہ', ar: '◐ راسخة' },
    'memorize.statusMastered': { en: '● mastered', fr: '● maîtrisé', es: '● dominado', ur: '● مکمل', ar: '● متقَنة' },
    'memorize.fallbackNote': {
      en: '🔁 “{full}” is a whole-surah recording — single-ayah loop uses “{pa}” (per-ayah) for now.',
      fr: '🔁 « {full} » est un enregistrement de la sourate entière — la boucle d’un seul verset utilise « {pa} » (par verset) pour l’instant.',
      es: '🔁 «{full}» es una grabación de la sura completa — el bucle de una sola aleya usa «{pa}» (por aleya) por ahora.',
      ur: '🔁 ”{full}“ مکمل سورہ ریکارڈنگ ہے — فی الحال ایک آیت کا لوپ ”{pa}“ (فی آیت) استعمال کرتا ہے۔',
      ar: '🔁 «{full}» تسجيل للسورة كاملة — تكرار الآية الواحدة يستخدم «{pa}» (لكل آية) حاليًا.' },
    'memorize.toastMastered':  { en: '🎉 Mastered ayah {n}', fr: '🎉 Verset {n} maîtrisé', es: '🎉 Aleya {n} dominada', ur: '🎉 آیت {n} مکمل', ar: '🎉 أُتقنت الآية {n}' },
    'memorize.toastSaved':     { en: 'Saved · {status}', fr: 'Enregistré · {status}', es: 'Guardado · {status}', ur: 'محفوظ · {status}', ar: 'حُفظت · {status}' },
    'memorize.toastLoopFallback': { en: 'Looping with {name} — {full} is whole-surah', fr: 'Boucle avec {name} — {full} est sourate entière', es: 'Bucle con {name} — {full} es de sura completa', ur: '{name} کے ساتھ لوپ — {full} مکمل سورہ ہے', ar: 'تكرار بصوت {name} — {full} للسورة كاملة' },

    // test
    'test.fillBlank':     { en: 'Fill the blank', fr: 'Compléter', es: 'Completar', ur: 'خالی جگہ پُر کریں', ar: 'املأ الفراغ' },
    'test.nextAyah':      { en: 'Next ayah', fr: 'Verset suivant', es: 'Siguiente aleya', ur: 'اگلی آیت', ar: 'الآية التالية' },
    'test.newQuestion':   { en: 'New question →', fr: 'Nouvelle question →', es: 'Nueva pregunta →', ur: 'نیا سوال →', ar: 'سؤال جديد →' },
    'test.score':         { en: 'Score {right}/{total}', fr: 'Score {right}/{total}', es: 'Puntuación {right}/{total}', ur: 'اسکور {right}/{total}', ar: 'النتيجة {right}/{total}' },
    'test.chooseMissing': { en: 'Ayah {n} — choose the missing word', fr: 'Verset {n} — choisissez le mot manquant', es: 'Aleya {n} — elige la palabra que falta', ur: 'آیت {n} — غائب لفظ منتخب کریں', ar: 'الآية {n} — اختر الكلمة الناقصة' },
    'test.whichNext':     { en: 'This is ayah {n}. Which ayah comes next?', fr: 'Ceci est le verset {n}. Quel verset vient ensuite ?', es: 'Esta es la aleya {n}. ¿Cuál es la siguiente?', ur: 'یہ آیت {n} ہے۔ اگلی آیت کون سی ہے؟', ar: 'هذه الآية {n}. ما الآية التالية؟' },
    'test.notQuite':      { en: 'Not quite — try the next one', fr: 'Pas tout à fait — essayez la suivante', es: 'Casi — prueba con la siguiente', ur: 'بالکل نہیں — اگلی آزمائیں', ar: 'ليس تمامًا — جرّب التالية' },

    // progress
    'progress.title':       { en: 'Your progress', fr: 'Votre progression', es: 'Tu progreso', ur: 'آپ کی پیش رفت', ar: 'تقدّمك' },
    'progress.memorized':   { en: 'Memorized', fr: 'Mémorisé', es: 'Memorizado', ur: 'حفظ شدہ', ar: 'محفوظ' },
    'progress.streakLabel': { en: 'Streak · best {n}', fr: 'Série · record {n}', es: 'Racha · récord {n}', ur: 'سلسلہ · بہترین {n}', ar: 'التتابع · الأفضل {n}' },
    'progress.mastered':    { en: 'Mastered', fr: 'Maîtrisé', es: 'Dominado', ur: 'مکمل', ar: 'متقَن' },
    'progress.solid':       { en: 'Solid', fr: 'Solide', es: 'Firme', ur: 'پختہ', ar: 'راسخة' },
    'progress.allAyat':     { en: 'All 286 ayāt', fr: 'Les 286 versets', es: 'Las 286 aleyas', ur: 'تمام 286 آیات', ar: 'كل الآيات الـ286' },
    'progress.tapCell':     { en: 'tap a cell to study it', fr: 'touchez une case pour l’étudier', es: 'toca una casilla para estudiarla', ur: 'مطالعہ کے لیے خانہ ٹیپ کریں', ar: 'انقر خلية لدراستها' },
    'progress.legendNew':      { en: 'new', fr: 'nouveau', es: 'nuevo', ur: 'نیا', ar: 'جديدة' },
    'progress.legendLearning': { en: 'learning', fr: 'en cours', es: 'aprendiendo', ur: 'سیکھ رہے', ar: 'قيد الحفظ' },
    'progress.legendSolid':    { en: 'solid', fr: 'solide', es: 'firme', ur: 'پختہ', ar: 'راسخة' },
    'progress.legendMastered': { en: 'mastered', fr: 'maîtrisé', es: 'dominado', ur: 'مکمل', ar: 'متقَنة' },
    'progress.backupTitle': { en: 'Backup & restore', fr: 'Sauvegarde et restauration', es: 'Copia y restauración', ur: 'بیک اپ و بحالی', ar: 'النسخ والاستعادة' },
    'progress.backupDesc': {
      en: 'Progress lives only on this device. Export a file to keep it safe or move it to another phone.',
      fr: 'La progression n’existe que sur cet appareil. Exportez un fichier pour la conserver ou la transférer sur un autre téléphone.',
      es: 'El progreso solo está en este dispositivo. Exporta un archivo para conservarlo o pasarlo a otro teléfono.',
      ur: 'پیش رفت صرف اسی ڈیوائس پر ہے۔ محفوظ رکھنے یا دوسرے فون پر منتقل کرنے کے لیے فائل برآمد کریں۔',
      ar: 'التقدّم موجود على هذا الجهاز فقط. صدّر ملفًا لحفظه أو نقله إلى هاتف آخر.' },
    'progress.export': { en: '⬇ Export backup', fr: '⬇ Exporter', es: '⬇ Exportar', ur: '⬇ برآمد کریں', ar: '⬇ تصدير' },
    'progress.import': { en: '⬆ Import backup', fr: '⬆ Importer', es: '⬆ Importar', ur: '⬆ درآمد کریں', ar: '⬆ استيراد' },
    'progress.reset':  { en: '⌫ Reset', fr: '⌫ Réinitialiser', es: '⌫ Restablecer', ur: '⌫ ری سیٹ', ar: '⌫ إعادة ضبط' },
    'progress.toastDownloaded': { en: 'Backup downloaded', fr: 'Sauvegarde téléchargée', es: 'Copia descargada', ur: 'بیک اپ ڈاؤن لوڈ ہوگیا', ar: 'تم تنزيل النسخة' },
    'progress.toastRestored':   { en: 'Backup restored', fr: 'Sauvegarde restaurée', es: 'Copia restaurada', ur: 'بیک اپ بحال ہوگیا', ar: 'تمت استعادة النسخة' },
    'progress.toastInvalid':    { en: 'Invalid backup file', fr: 'Fichier de sauvegarde invalide', es: 'Archivo de copia no válido', ur: 'غلط بیک اپ فائل', ar: 'ملف نسخة غير صالح' },
    'progress.confirmReset': {
      en: 'Reset ALL progress and streak on this device? This cannot be undone.',
      fr: 'Réinitialiser TOUTE la progression et la série sur cet appareil ? Cette action est irréversible.',
      es: '¿Restablecer TODO el progreso y la racha en este dispositivo? No se puede deshacer.',
      ur: 'اس ڈیوائس پر تمام پیش رفت اور سلسلہ ری سیٹ کریں؟ یہ واپس نہیں ہوسکتا۔',
      ar: 'إعادة ضبط كل التقدّم والتتابع على هذا الجهاز؟ لا يمكن التراجع.' },
    'progress.toastReset': { en: 'Progress reset', fr: 'Progression réinitialisée', es: 'Progreso restablecido', ur: 'پیش رفت ری سیٹ ہوگئی', ar: 'تمت إعادة ضبط التقدّم' },

    // settings
    'settings.title':          { en: 'Settings', fr: 'Réglages', es: 'Ajustes', ur: 'سیٹنگز', ar: 'الإعدادات' },
    'settings.installedTitle': { en: '📲 Installed', fr: '📲 Installée', es: '📲 Instalada', ur: '📲 انسٹال شدہ', ar: '📲 مُثبَّت' },
    'settings.installedDesc': {
      en: 'You’re running the installed app. Download a reciter below to use it fully offline.',
      fr: 'Vous utilisez l’application installée. Téléchargez un récitateur ci-dessous pour un usage hors ligne complet.',
      es: 'Estás usando la app instalada. Descarga un recitador abajo para usarla sin conexión.',
      ur: 'آپ انسٹال شدہ ایپ چلا رہے ہیں۔ مکمل آف لائن استعمال کے لیے نیچے ایک قاری ڈاؤن لوڈ کریں۔',
      ar: 'أنت تستخدم التطبيق المثبَّت. نزّل قارئًا أدناه لاستخدامه دون اتصال بالكامل.' },
    'settings.installTitle':   { en: '📲 Install app', fr: '📲 Installer l’application', es: '📲 Instalar app', ur: '📲 ایپ انسٹال کریں', ar: '📲 تثبيت التطبيق' },
    'settings.installCanDesc': {
      en: 'Add Al-Baqarah to your home screen for full-screen, app-like use that works offline.',
      fr: 'Ajoutez Al-Baqara à votre écran d’accueil pour une utilisation plein écran, façon appli, qui fonctionne hors ligne.',
      es: 'Añade Al-Baqara a tu pantalla de inicio para un uso a pantalla completa, tipo app, que funciona sin conexión.',
      ur: 'پوری اسکرین، ایپ جیسی اور آف لائن استعمال کے لیے البقرہ کو ہوم اسکرین پر شامل کریں۔',
      ar: 'أضِف البقرة إلى الشاشة الرئيسية لاستخدام بملء الشاشة يشبه التطبيق ويعمل دون اتصال.' },
    'settings.installBtn':     { en: '⬇ Install app', fr: '⬇ Installer l’application', es: '⬇ Instalar app', ur: '⬇ ایپ انسٹال کریں', ar: '⬇ تثبيت التطبيق' },
    'settings.installIOS': {
      en: 'On iPhone/iPad: open in <b>Safari</b>, tap the <b>Share</b> button (⬆️ box-with-arrow), then choose <b>“Add to Home Screen”</b>.',
      fr: 'Sur iPhone/iPad : ouvrez dans <b>Safari</b>, touchez le bouton <b>Partager</b> (⬆️), puis choisissez <b>« Sur l’écran d’accueil »</b>.',
      es: 'En iPhone/iPad: abre en <b>Safari</b>, toca el botón <b>Compartir</b> (⬆️) y elige <b>«Añadir a pantalla de inicio»</b>.',
      ur: 'آئی فون/آئی پیڈ پر: <b>Safari</b> میں کھولیں، <b>شیئر</b> بٹن (⬆️) دبائیں، پھر <b>”ہوم اسکرین میں شامل کریں“</b> منتخب کریں۔',
      ar: 'على آيفون/آيباد: افتح في <b>Safari</b>، اضغط زر <b>المشاركة</b> (⬆️)، ثم اختر <b>«أضف إلى الشاشة الرئيسية»</b>.' },
    'settings.installOther': {
      en: 'Use your browser menu → <b>Install app</b> / <b>Add to Home Screen</b> (works in Chrome, Edge, Safari, Samsung Internet).',
      fr: 'Utilisez le menu du navigateur → <b>Installer l’application</b> / <b>Ajouter à l’écran d’accueil</b> (Chrome, Edge, Safari, Samsung Internet).',
      es: 'Usa el menú del navegador → <b>Instalar app</b> / <b>Añadir a pantalla de inicio</b> (Chrome, Edge, Safari, Samsung Internet).',
      ur: 'اپنے براؤزر مینو → <b>ایپ انسٹال کریں</b> / <b>ہوم اسکرین میں شامل کریں</b> استعمال کریں (Chrome, Edge, Safari, Samsung Internet)۔',
      ar: 'استخدم قائمة المتصفح → <b>تثبيت التطبيق</b> / <b>إضافة إلى الشاشة الرئيسية</b> (Chrome، Edge، Safari، Samsung Internet).' },
    'settings.readingAudio':   { en: 'Reading & audio', fr: 'Lecture et audio', es: 'Lectura y audio', ur: 'قراءت و آڈیو', ar: 'الرواية والصوت' },
    'settings.reading':        { en: 'Reading (riwāyah)', fr: 'Lecture (riwāya)', es: 'Lectura (riwāya)', ur: 'قراءت (روایہ)', ar: 'الرواية' },
    'settings.defaultReciter': { en: 'Default reciter', fr: 'Récitateur par défaut', es: 'Recitador predeterminado', ur: 'پہلے سے طے قاری', ar: 'القارئ الافتراضي' },
    'settings.appLangTitle':   { en: '🗣 App language', fr: '🗣 Langue de l’appli', es: '🗣 Idioma de la app', ur: '🗣 ایپ کی زبان', ar: '🗣 لغة التطبيق' },
    'settings.appLangDesc': {
      en: 'Change the language of the app’s buttons and menus. Arabic and Urdu use a right-to-left layout.',
      fr: 'Changez la langue des boutons et menus de l’application. L’arabe et l’ourdou utilisent une mise en page de droite à gauche.',
      es: 'Cambia el idioma de los botones y menús de la app. El árabe y el urdu usan un diseño de derecha a izquierda.',
      ur: 'ایپ کے بٹن اور مینو کی زبان تبدیل کریں۔ عربی اور اردو دائیں سے بائیں ترتیب استعمال کرتی ہیں۔',
      ar: 'غيّر لغة أزرار التطبيق وقوائمه. العربية والأردية تستخدمان تخطيطًا من اليمين إلى اليسار.' },
    'settings.appLanguage':    { en: 'Interface language', fr: 'Langue de l’interface', es: 'Idioma de la interfaz', ur: 'انٹرفیس کی زبان', ar: 'لغة الواجهة' },
    'settings.translationTitle': { en: '🌐 Translation', fr: '🌐 Traduction', es: '🌐 Traducción', ur: '🌐 ترجمہ', ar: '🌐 الترجمة' },
    'settings.translationDesc': {
      en: 'Show the meaning under each ayah (Listen & Memorize). This is a translation/interpretation — the Arabic Qur’an text itself is never changed.',
      fr: 'Afficher le sens sous chaque verset (Écouter et Mémoriser). C’est une traduction/interprétation — le texte arabe du Coran n’est jamais modifié.',
      es: 'Muestra el significado bajo cada aleya (Escuchar y Memorizar). Es una traducción/interpretación — el texto árabe del Corán nunca se modifica.',
      ur: 'ہر آیت کے نیچے مفہوم دکھائیں (سنیں اور حفظ کریں)۔ یہ ترجمہ/تشریح ہے — قرآن کا عربی متن کبھی تبدیل نہیں ہوتا۔',
      ar: 'اعرض المعنى أسفل كل آية (الاستماع والحفظ). هذه ترجمة/تفسير — نص القرآن العربي نفسه لا يُغيَّر أبدًا.' },
    'settings.source':         { en: 'Source: {src}', fr: 'Source : {src}', es: 'Fuente: {src}', ur: 'ماخذ: {src}', ar: 'المصدر: {src}' },
    'settings.loopDefaults':   { en: 'Loop defaults', fr: 'Réglages de boucle', es: 'Valores de bucle', ur: 'لوپ ڈیفالٹس', ar: 'إعدادات التكرار' },
    'settings.appearance':     { en: 'Appearance', fr: 'Apparence', es: 'Apariencia', ur: 'ظاہری شکل', ar: 'المظهر' },
    'settings.theme':          { en: 'Theme', fr: 'Thème', es: 'Tema', ur: 'تھیم', ar: 'السمة' },
    'settings.themeLight':     { en: '☀️ Light', fr: '☀️ Clair', es: '☀️ Claro', ur: '☀️ روشن', ar: '☀️ فاتح' },
    'settings.themeDark':      { en: '🌙 Dark', fr: '🌙 Sombre', es: '🌙 Oscuro', ur: '🌙 گہرا', ar: '🌙 داكن' },
    'settings.arabicFont':     { en: 'Arabic font', fr: 'Police arabe', es: 'Fuente árabe', ur: 'عربی فونٹ', ar: 'الخط العربي' },
    'settings.offline':        { en: 'Offline', fr: 'Hors ligne', es: 'Sin conexión', ur: 'آف لائن', ar: 'دون اتصال' },
    'settings.offlinePerAyah': {
      en: 'Save all 286 ayāt of “{name}” on this device (~35–45 MB) so loops work with no signal.',
      fr: 'Enregistrez les 286 versets de « {name} » sur cet appareil (~35–45 Mo) pour que les boucles fonctionnent sans réseau.',
      es: 'Guarda las 286 aleyas de «{name}» en este dispositivo (~35–45 MB) para que los bucles funcionen sin señal.',
      ur: '”{name}“ کی تمام 286 آیات اس ڈیوائس پر محفوظ کریں (~35–45 MB) تاکہ لوپ بغیر سگنل کام کریں۔',
      ar: 'احفظ كل الآيات الـ286 لـ«{name}» على هذا الجهاز (~35–45 ميجابايت) لتعمل التكرارات دون شبكة.' },
    'settings.offlineFull': {
      en: 'Save the whole-surah recording of “{name}” (~30–40 MB) for offline listening.',
      fr: 'Enregistrez l’enregistrement de la sourate entière de « {name} » (~30–40 Mo) pour l’écoute hors ligne.',
      es: 'Guarda la grabación de la sura completa de «{name}» (~30–40 MB) para escuchar sin conexión.',
      ur: '”{name}“ کی مکمل سورہ ریکارڈنگ (~30–40 MB) آف لائن سننے کے لیے محفوظ کریں۔',
      ar: 'احفظ تسجيل السورة كاملة لـ«{name}» (~30–40 ميجابايت) للاستماع دون اتصال.' },
    'settings.download':       { en: '⬇ Download for offline', fr: '⬇ Télécharger hors ligne', es: '⬇ Descargar sin conexión', ur: '⬇ آف لائن ڈاؤن لوڈ', ar: '⬇ تنزيل للاستخدام دون اتصال' },
    'settings.clearAudio':     { en: 'Clear cached audio', fr: 'Effacer l’audio en cache', es: 'Borrar audio en caché', ur: 'محفوظ آڈیو صاف کریں', ar: 'مسح الصوت المخزَّن' },
    'settings.toastNeedHttps': { en: 'Offline storage needs HTTPS (works once deployed).', fr: 'Le stockage hors ligne nécessite HTTPS (fonctionne une fois déployé).', es: 'El almacenamiento sin conexión necesita HTTPS (funciona al publicarse).', ur: 'آف لائن اسٹوریج کے لیے HTTPS درکار ہے (تعیناتی کے بعد کام کرتا ہے)۔', ar: 'يحتاج التخزين دون اتصال إلى HTTPS (يعمل بعد النشر).' },
    'settings.downloaded':     { en: 'Downloaded {done}/{total}{failed}', fr: 'Téléchargé {done}/{total}{failed}', es: 'Descargado {done}/{total}{failed}', ur: 'ڈاؤن لوڈ {done}/{total}{failed}', ar: 'تم تنزيل {done}/{total}{failed}' },
    'settings.failedSuffix':   { en: ' · {n} failed', fr: ' · {n} échec(s)', es: ' · {n} fallidos', ur: ' · {n} ناکام', ar: ' · {n} فشل' },
    'settings.toastSavedSkipped': { en: 'Saved with {n} skipped', fr: 'Enregistré, {n} ignoré(s)', es: 'Guardado con {n} omitidos', ur: '{n} چھوڑ کر محفوظ', ar: 'حُفظ مع تخطّي {n}' },
    'settings.toastSavedOffline': { en: 'Saved for offline ✓', fr: 'Enregistré hors ligne ✓', es: 'Guardado sin conexión ✓', ur: 'آف لائن محفوظ ✓', ar: 'حُفظ للاستخدام دون اتصال ✓' },
    'settings.toastAudioCleared': { en: 'Cached audio cleared', fr: 'Audio en cache effacé', es: 'Audio en caché borrado', ur: 'محفوظ آڈیو صاف ہوگیا', ar: 'تم مسح الصوت المخزَّن' },
    'settings.fontScheherazade': { en: 'Scheherazade New (covers Ḥafṣ + Warsh)', fr: 'Scheherazade New (couvre Ḥafṣ + Warsh)', es: 'Scheherazade New (cubre Ḥafṣ + Warsh)', ur: 'Scheherazade New (حفص + ورش)', ar: 'Scheherazade New (يدعم حفص + ورش)' },
    'settings.fontAmiri':      { en: 'Amiri Quran (best for Ḥafṣ)', fr: 'Amiri Quran (idéal pour Ḥafṣ)', es: 'Amiri Quran (mejor para Ḥafṣ)', ur: 'Amiri Quran (حفص کے لیے بہترین)', ar: 'Amiri Quran (الأفضل لحفص)' },
    'settings.reviewTitle':    { en: '🎯 Review (spaced repetition)', fr: '🎯 Révision (répétition espacée)', es: '🎯 Repaso (repetición espaciada)', ur: '🎯 اعادہ (وقفہ دار تکرار)', ar: '🎯 المراجعة (التكرار المتباعد)' },
    'settings.reviewDesc': {
      en: 'The Review tab schedules each ayah on a spacing ladder (1 → 3 → 7 → 16 → 40 days) and surfaces what’s due. This sets how many brand-new ayāt a session introduces per day.',
      fr: 'L’onglet Révision planifie chaque verset selon un échelonnement (1 → 3 → 7 → 16 → 40 jours) et fait apparaître ce qui est dû. Ceci définit combien de nouveaux versets une session introduit par jour.',
      es: 'La pestaña Repaso programa cada aleya en una escalera de espaciado (1 → 3 → 7 → 16 → 40 días) y muestra lo pendiente. Esto define cuántas aleyas nuevas introduce cada sesión al día.',
      ur: 'اعادہ ٹیب ہر آیت کو وقفے کی سیڑھی (1 → 3 → 7 → 16 → 40 دن) پر شیڈول کرتا ہے اور جو واجب ہو دکھاتا ہے۔ یہ طے کرتا ہے کہ ہر سیشن روزانہ کتنی نئی آیات متعارف کرائے۔',
      ar: 'تبويب المراجعة يجدول كل آية على سلّم تباعد (1 → 3 → 7 → 16 → 40 يومًا) ويُظهر المستحق. يحدد هذا كم آية جديدة تُدخلها الجلسة كل يوم.' },
    'settings.newPerDay':      { en: 'New ayāt per day', fr: 'Nouveaux versets par jour', es: 'Aleyas nuevas por día', ur: 'روزانہ نئی آیات', ar: 'آيات جديدة في اليوم' },

    // home — daily review banner
    'home.todaysReview': { en: 'Today’s review', fr: 'Révision du jour', es: 'Repaso de hoy', ur: 'آج کا اعادہ', ar: 'مراجعة اليوم' },
    'home.dueCount':     { en: '{n} due', fr: '{n} à réviser', es: '{n} pendientes', ur: '{n} باقی', ar: '{n} مستحقة' },
    'home.newSuffix':    { en: ' · {n} new', fr: ' · {n} nouveaux', es: ' · {n} nuevas', ur: ' · {n} نئی', ar: ' · {n} جديدة' },
    'home.startReview':  { en: '🎯 Start review', fr: '🎯 Commencer', es: '🎯 Empezar repaso', ur: '🎯 اعادہ شروع کریں', ar: '🎯 ابدأ المراجعة' },
    'home.caughtUp':     { en: '✅ Caught up', fr: '✅ À jour', es: '✅ Al día', ur: '✅ مکمل', ar: '✅ منتهٍ' },

    // nav + progress — Review
    'nav.review':           { en: 'Review', fr: 'Révision', es: 'Repaso', ur: 'اعادہ', ar: 'المراجعة' },
    'progress.dueForReview':{ en: '🎯 {n} due for review', fr: '🎯 {n} à réviser', es: '🎯 {n} para repasar', ur: '🎯 {n} اعادے کے لیے باقی', ar: '🎯 {n} مستحقة للمراجعة' },
    'progress.dueSub':      { en: 'Spaced-repetition queue', fr: 'File de répétition espacée', es: 'Cola de repetición espaciada', ur: 'وقفہ دار تکرار کی قطار', ar: 'قائمة التكرار المتباعد' },
    'progress.start':       { en: 'Start', fr: 'Commencer', es: 'Empezar', ur: 'شروع کریں', ar: 'ابدأ' },

    // review view
    'review.title':     { en: 'Review', fr: 'Révision', es: 'Repaso', ur: 'اعادہ', ar: 'المراجعة' },
    'review.newBadge':  { en: '🌱 New ayah', fr: '🌱 Nouveau verset', es: '🌱 Aleya nueva', ur: '🌱 نئی آیت', ar: '🌱 آية جديدة' },
    'review.dueBadge':  { en: '🔁 Due review', fr: '🔁 À réviser', es: '🔁 Para repasar', ur: '🔁 اعادہ واجب', ar: '🔁 مستحقة المراجعة' },
    'review.showAnswer':{ en: '👁 Show answer', fr: '👁 Voir la réponse', es: '👁 Mostrar respuesta', ur: '👁 جواب دکھائیں', ar: '👁 إظهار الإجابة' },
    'review.listen':    { en: '🔁 Listen', fr: '🔁 Écouter', es: '🔁 Escuchar', ur: '🔁 سنیں', ar: '🔁 استماع' },
    'review.again':     { en: '✗ Again', fr: '✗ À revoir', es: '✗ Otra vez', ur: '✗ دوبارہ', ar: '✗ أعِد' },
    'review.good':      { en: '✓ Good', fr: '✓ Bien', es: '✓ Bien', ur: '✓ ٹھیک', ar: '✓ جيد' },
    'review.easy':      { en: '⚡ Easy', fr: '⚡ Facile', es: '⚡ Fácil', ur: '⚡ آسان', ar: '⚡ سهل' },
    'review.hintNew':   { en: 'Read it, recite it a few times, then grade how well it sticks.', fr: 'Lisez-le, récitez-le quelques fois, puis évaluez sa mémorisation.', es: 'Léela, recítala unas veces y luego califica cuánto se te queda.', ur: 'اسے پڑھیں، چند بار دہرائیں، پھر درجہ دیں کہ کتنی یاد رہی۔', ar: 'اقرأها وكرّرها بضع مرات، ثم قيّم مدى رسوخها.' },
    'review.hintDue':   { en: 'Recall the ayah from the hints (tap a word to peek), then show the answer.', fr: 'Retrouvez le verset à partir des indices (touchez un mot pour le voir), puis affichez la réponse.', es: 'Recuerda la aleya con las pistas (toca una palabra para verla) y luego muestra la respuesta.', ur: 'اشاروں سے آیت یاد کریں (جھانکنے کے لیے لفظ پر ٹیپ کریں)، پھر جواب دکھائیں۔', ar: 'تذكّر الآية من التلميحات (انقر كلمة لرؤيتها)، ثم أظهر الإجابة.' },
    'review.howWell':   { en: 'How well did you recall it?', fr: 'Comment l’avez-vous mémorisé ?', es: '¿Qué tan bien la recordaste?', ur: 'آپ نے کتنی اچھی طرح یاد کیا؟', ar: 'ما مدى تذكّرك لها؟' },
    'review.completeTitle': { en: 'Review complete', fr: 'Révision terminée', es: 'Repaso completado', ur: 'اعادہ مکمل', ar: 'اكتملت المراجعة' },
    'review.completeStats': { en: '{reviewed} graded · {recalled} recalled · {again} to revisit', fr: '{reviewed} évalués · {recalled} retrouvés · {again} à revoir', es: '{reviewed} evaluadas · {recalled} recordadas · {again} por repasar', ur: '{reviewed} درجہ شدہ · {recalled} یاد · {again} دوبارہ', ar: '{reviewed} مُقيّمة · {recalled} متذكَّرة · {again} للإعادة' },
    'review.nextDue':   { en: 'Next review due {when}.', fr: 'Prochaine révision {when}.', es: 'Próximo repaso {when}.', ur: 'اگلا اعادہ {when}۔', ar: 'المراجعة التالية {when}.' },
    'review.nothingScheduled': { en: 'Nothing else scheduled — add new ayāt anytime.', fr: 'Rien d’autre de programmé — ajoutez de nouveaux versets quand vous voulez.', es: 'Nada más programado — añade aleyas nuevas cuando quieras.', ur: 'اور کچھ شیڈول نہیں — کسی بھی وقت نئی آیات شامل کریں۔', ar: 'لا شيء آخر مجدول — أضِف آيات جديدة وقتما تشاء.' },
    'review.progressBtn': { en: '📊 Progress', fr: '📊 Progression', es: '📊 Progreso', ur: '📊 پیش رفت', ar: '📊 التقدّم' },
    'review.caughtUpTitle': { en: 'You’re all caught up', fr: 'Vous êtes à jour', es: 'Estás al día', ur: 'آپ مکمل طور پر تازہ ہیں', ar: 'أنت منتهٍ من كل شيء' },
    'review.caughtUpNext': { en: 'Nothing due right now. Next review {when}.', fr: 'Rien à réviser pour l’instant. Prochaine révision {when}.', es: 'Nada pendiente ahora. Próximo repaso {when}.', ur: 'ابھی کچھ واجب نہیں۔ اگلا اعادہ {when}۔', ar: 'لا شيء مستحق الآن. المراجعة التالية {when}.' },
    'review.caughtUpRaise': { en: 'No reviews due. Raise “new ayāt per day” in Settings to learn more today.', fr: 'Aucune révision due. Augmentez « nouveaux versets par jour » dans les Réglages pour en apprendre plus aujourd’hui.', es: 'No hay repasos pendientes. Sube «aleyas nuevas por día» en Ajustes para aprender más hoy.', ur: 'کوئی اعادہ واجب نہیں۔ آج مزید سیکھنے کے لیے سیٹنگز میں ”روزانہ نئی آیات“ بڑھائیں۔', ar: 'لا مراجعات مستحقة. ارفع «آيات جديدة في اليوم» من الإعدادات لتتعلم المزيد اليوم.' },
    'review.caughtUpAll': { en: 'Every ayah is scheduled — wonderful work. 🤲', fr: 'Chaque verset est planifié — excellent travail. 🤲', es: 'Cada aleya está programada — excelente trabajo. 🤲', ur: 'ہر آیت شیڈول ہے — بہت خوب۔ 🤲', ar: 'كل آية مجدولة — عمل رائع. 🤲' },
    'review.memorizeBtn': { en: '🙈 Memorize', fr: '🙈 Mémoriser', es: '🙈 Memorizar', ur: '🙈 حفظ کریں', ar: '🙈 الحفظ' },
    'review.today':     { en: 'today', fr: 'aujourd’hui', es: 'hoy', ur: 'آج', ar: 'اليوم' },
    'review.tomorrow':  { en: 'tomorrow', fr: 'demain', es: 'mañana', ur: 'کل', ar: 'غدًا' },
    'review.inDays':    { en: 'in {n} days', fr: 'dans {n} jours', es: 'en {n} días', ur: '{n} دن میں', ar: 'خلال {n} أيام' },

    // test — extra modes
    'test.typeWord':     { en: 'Type the word', fr: 'Taper le mot', es: 'Escribe la palabra', ur: 'لفظ ٹائپ کریں', ar: 'اكتب الكلمة' },
    'test.listenRecall': { en: 'Listen & recall', fr: 'Écouter & retrouver', es: 'Escuchar y recordar', ur: 'سنیں اور یاد کریں', ar: 'استمع وتذكّر' },
    'test.recite':       { en: 'Recite', fr: 'Réciter', es: 'Recitar', ur: 'تلاوت کریں', ar: 'اتلُ' },
    'test.typePrompt':   { en: 'Ayah {n} — type the missing word (ḥarakāt optional)', fr: 'Verset {n} — tapez le mot manquant (ḥarakāt facultatifs)', es: 'Aleya {n} — escribe la palabra que falta (ḥarakāt opcionales)', ur: 'آیت {n} — غائب لفظ ٹائپ کریں (حرکات اختیاری)', ar: 'الآية {n} — اكتب الكلمة الناقصة (الحركات اختيارية)' },
    'test.correct':      { en: '✓ Correct', fr: '✓ Correct', es: '✓ Correcto', ur: '✓ درست', ar: '✓ صحيح' },
    'test.answerLabel':  { en: '✗ Answer:', fr: '✗ Réponse :', es: '✗ Respuesta:', ur: '✗ جواب:', ar: '✗ الإجابة:' },
    'test.check':        { en: 'Check', fr: 'Vérifier', es: 'Comprobar', ur: 'جانچیں', ar: 'تحقّق' },
    'test.reveal':       { en: 'Reveal', fr: 'Révéler', es: 'Mostrar', ur: 'ظاہر کریں', ar: 'إظهار' },
    'test.hearAyah':     { en: 'Hear the ayah', fr: 'Écouter le verset', es: 'Escuchar la aleya', ur: 'آیت سنیں', ar: 'استمع للآية' },
    'test.audioNeedsPerAyah': { en: 'Audio recall needs a per-ayah reciter — pick one in Settings.', fr: 'Le rappel audio nécessite un récitateur par verset — choisissez-en un dans les Réglages.', es: 'El repaso por audio necesita un recitador por aleya — elige uno en Ajustes.', ur: 'آڈیو یاد کے لیے فی آیت قاری درکار ہے — سیٹنگز میں منتخب کریں۔', ar: 'يتطلب التذكّر الصوتي قارئًا لكل آية — اختر واحدًا من الإعدادات.' },
    'test.listenThenChoose': { en: 'Listen, then choose which ayah comes next', fr: 'Écoutez, puis choisissez le verset suivant', es: 'Escucha y elige cuál aleya sigue', ur: 'سنیں، پھر منتخب کریں کہ اگلی آیت کون سی ہے', ar: 'استمع ثم اختر الآية التالية' },
    'test.playAyah':     { en: '🔊 Play the ayah', fr: '🔊 Lire le verset', es: '🔊 Reproducir la aleya', ur: '🔊 آیت چلائیں', ar: '🔊 تشغيل الآية' },
    'test.showText':     { en: '👁 Show its text', fr: '👁 Voir son texte', es: '👁 Mostrar su texto', ur: '👁 اس کا متن دکھائیں', ar: '👁 إظهار نصّها' },
    'test.recitePrompt': { en: 'Recite ayah {n} from memory, then check yourself', fr: 'Récitez le verset {n} de mémoire, puis vérifiez', es: 'Recita la aleya {n} de memoria y comprueba', ur: 'آیت {n} حافظے سے تلاوت کریں، پھر خود کو جانچیں', ar: 'اتلُ الآية {n} من حفظك، ثم تحقّق' },
    'test.struggled':    { en: '✗ Struggled', fr: '✗ Difficile', es: '✗ Me costó', ur: '✗ مشکل ہوئی', ar: '✗ تعثّرت' },
    'test.revealAnswer': { en: '👁 Reveal answer', fr: '👁 Révéler la réponse', es: '👁 Mostrar respuesta', ur: '👁 جواب ظاہر کریں', ar: '👁 إظهار الإجابة' },
    'test.hearIt':       { en: 'Hear it', fr: 'Écouter', es: 'Escuchar', ur: 'سنیں', ar: 'استماع' },
    'test.selfGradeOk':  { en: 'Saved — scheduled for review ✓', fr: 'Enregistré — programmé pour révision ✓', es: 'Guardado — programado para repaso ✓', ur: 'محفوظ — اعادے کے لیے شیڈول ✓', ar: 'حُفظ — مجدول للمراجعة ✓' },
    'test.selfGradeNo':  { en: 'No worries — back in the queue', fr: 'Pas de souci — remis dans la file', es: 'Sin problema — de vuelta a la cola', ur: 'کوئی بات نہیں — دوبارہ قطار میں', ar: 'لا بأس — أعيدت إلى القائمة' },
    'test.recordYourself': { en: '● Record yourself', fr: '● S’enregistrer', es: '● Grábate', ur: '● خود کو ریکارڈ کریں', ar: '● سجّل نفسك' },
    'test.stopRecording': { en: '■ Stop recording', fr: '■ Arrêter l’enregistrement', es: '■ Detener grabación', ur: '■ ریکارڈنگ روکیں', ar: '■ إيقاف التسجيل' },
    'test.micUnavailable': { en: 'Microphone not available', fr: 'Microphone indisponible', es: 'Micrófono no disponible', ur: 'مائیکروفون دستیاب نہیں', ar: 'الميكروفون غير متاح' },
  };

  let lang = 'en';

  function interpolate(str, params) {
    if (!params) return str;
    return str.replace(/\{(\w+)\}/g, (m, k) => (params[k] != null ? params[k] : m));
  }

  const I = {
    LANGS,
    get lang() { return lang; },
    dir(l) { const m = META[l || lang]; return m ? m.dir : 'ltr'; },
    isRTL() { return I.dir() === 'rtl'; },
    setLang(l) { if (META[l]) lang = l; return lang; },
    has(l) { return !!META[l]; },
    // translate key in the current (or given) language → English → raw key
    t(key, params, l) {
      const row = S[key];
      const v = row ? (row[l || lang] != null ? row[l || lang] : row.en) : key;
      return interpolate(v == null ? key : v, params);
    },
    // apply html lang/dir + refresh static [data-i18n]/[data-i18n-aria] chrome
    apply() {
      const html = document.documentElement;
      html.setAttribute('lang', lang);
      html.setAttribute('dir', I.dir());
      document.querySelectorAll('[data-i18n]').forEach(e => { e.textContent = I.t(e.getAttribute('data-i18n')); });
      document.querySelectorAll('[data-i18n-aria]').forEach(e => { e.setAttribute('aria-label', I.t(e.getAttribute('data-i18n-aria'))); });
      const title = document.querySelector('title'); if (title) title.textContent = I.t('app.title');
    },
  };
  BA.i18n = I;
})(window.BA = window.BA || {});
