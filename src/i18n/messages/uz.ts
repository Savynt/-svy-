import type { Messages } from './en'

const uz: Messages = {
  // Navigation
  'nav.ielts': 'IELTS',
  'nav.sat': 'SAT',
  'nav.general_english': 'General English',
  'nav.pricing': 'Narxlar',
  'nav.seminars': 'Seminarlar',
  'nav.login': 'Kirish',
  'nav.get_started': 'Boshlash',
  'nav.dashboard': 'Bosh sahifa',
  'nav.practice': 'Mashq',
  'nav.placement': 'Daraja testi',
  'nav.settings': 'Sozlamalar',
  'nav.logout': 'Chiqish',

  // Auth — login
  'auth.login.title': 'Xush kelibsiz',
  'auth.login.subtitle': 'O\'qishni davom ettirish uchun kiring',
  'auth.login.email': 'Email',
  'auth.login.password': 'Parol',
  'auth.login.submit': 'Kirish',
  'auth.login.forgot': 'Parolni unutdingizmi?',
  'auth.login.no_account': 'Hisobingiz yo\'qmi?',
  'auth.login.register': 'Ro\'yxatdan o\'tish',
  'auth.login.error_invalid': 'Email yoki parol noto\'g\'ri.',
  'auth.login.error_unverified': 'Avval emailni tasdiqlang.',

  // Auth — register
  'auth.register.title': 'Hisob yarating',
  'auth.register.subtitle': 'Bugun IELTS, SAT va General English testlarini boshlang.',
  'auth.register.first_name': 'Ism',
  'auth.register.last_name': 'Familiya',
  'auth.register.email': 'Email',
  'auth.register.password': 'Parol',
  'auth.register.submit': 'Hisob yaratish',
  'auth.register.have_account': 'Hisobingiz bormi?',
  'auth.register.login': 'Kirish',
  'auth.register.error_exists': 'Bu email bilan hisob allaqachon mavjud.',

  // Auth — forgot password
  'auth.forgot.title': 'Parolni unutdingizmi?',
  'auth.forgot.subtitle': 'Emailingizni kiriting, biz tiklash kodi yuboramiz.',
  'auth.forgot.email': 'Email',
  'auth.forgot.submit': 'Kod yuborish',
  'auth.forgot.back': 'Kirishga qaytish',
  'auth.forgot.sent': 'Pochtangizni tekshiring — tiklash kodi yuborildi.',

  // Auth — reset password
  'auth.reset.title': 'Yangi parol o\'rnating',
  'auth.reset.code': 'Tiklash kodi',
  'auth.reset.password': 'Yangi parol',
  'auth.reset.submit': 'Parolni tiklash',
  'auth.reset.success': 'Parol yangilandi. Endi kirishingiz mumkin.',

  // Auth — verify email
  'auth.verify.title': 'Pochtangizni tekshiring',
  'auth.verify.subtitle': 'Tasdiqlash kodi yuborildi:',
  'auth.verify.code': 'Tasdiqlash kodi',
  'auth.verify.submit': 'Tasdiqlash',
  'auth.verify.resend': 'Qayta yuborish',

  // Dashboard
  'dashboard.greeting_morning': 'Xayrli tong',
  'dashboard.greeting_afternoon': 'Xayrli kun',
  'dashboard.greeting_evening': 'Xayrli kech',
  'dashboard.continue': 'O\'qishni davom ettirish',
  'dashboard.recent': 'So\'nggi faoliyat',
  'dashboard.start_practice': 'Mashqni boshlash',
  'dashboard.take_placement': 'Daraja testini olish',
  'dashboard.no_activity': 'Faoliyat yo\'q',
  'dashboard.no_activity_sub': 'Natijalarni ko\'rish uchun testni bajaring.',
  'dashboard.score': 'Natija',
  'dashboard.view_all': 'Barchasini ko\'rish',

  // Practice
  'practice.library': 'Test kutubxonasi',
  'practice.title': 'Mashq turini tanlang',
  'practice.subtitle': 'Har bir yo\'nalish bo\'yicha real imtihon testlari, tezkor tekshiruv bilan.',
  'practice.no_tests': 'Testlar hali yo\'q',
  'practice.no_tests_sub': 'Murabbiylar IELTS, SAT va General English testlarini tayyorlamoqda. Tez kunda qo\'shiladi.',
  'practice.coming_soon': 'Tez kunda',
  'practice.published': '{{n}} ta test',
  'practice.showing': '{{track}} testlaridan {{shown}} tasi (jami {{total}}) ko\'rsatilmoqda.',

  // Common
  'common.save': 'Saqlash',
  'common.cancel': 'Bekor qilish',
  'common.back': 'Orqaga',
  'common.submit': 'Yuborish',
  'common.loading': 'Yuklanmoqda…',
  'common.error': 'Xatolik yuz berdi',
  'common.retry': 'Qayta urinish',
  'common.go_dashboard': 'Bosh sahifaga',
  'common.back_dashboard': 'Bosh sahifaga qaytish',
  'common.min': 'daq',
  'common.questions': 'savol',
  'common.or': 'yoki',
  'common.not_sure': 'Qayerdan boshlashni bilmaysizmi?',
  'common.personalized': 'Shaxsiy tavsiyalar uchun bosh sahifaga qayting.',
}

export default uz
