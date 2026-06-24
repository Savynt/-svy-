import type { Messages } from './en'

const ru: Messages = {
  // Navigation
  'nav.ielts': 'IELTS',
  'nav.sat': 'SAT',
  'nav.general_english': 'General English',
  'nav.pricing': 'Тарифы',
  'nav.seminars': 'Семинары',
  'nav.login': 'Войти',
  'nav.get_started': 'Начать',
  'nav.dashboard': 'Главная',
  'nav.practice': 'Практика',
  'nav.placement': 'Тест уровня',
  'nav.settings': 'Настройки',
  'nav.logout': 'Выйти',

  // Auth — login
  'auth.login.title': 'С возвращением',
  'auth.login.subtitle': 'Войдите, чтобы продолжить обучение',
  'auth.login.email': 'Email',
  'auth.login.password': 'Пароль',
  'auth.login.submit': 'Войти',
  'auth.login.forgot': 'Забыли пароль?',
  'auth.login.no_account': 'Нет аккаунта?',
  'auth.login.register': 'Зарегистрироваться',
  'auth.login.error_invalid': 'Неверный email или пароль.',
  'auth.login.error_unverified': 'Сначала подтвердите email.',

  // Auth — register
  'auth.register.title': 'Создайте аккаунт',
  'auth.register.subtitle': 'Начните практиковаться с IELTS, SAT и General English уже сегодня.',
  'auth.register.first_name': 'Имя',
  'auth.register.last_name': 'Фамилия',
  'auth.register.email': 'Email',
  'auth.register.password': 'Пароль',
  'auth.register.submit': 'Создать аккаунт',
  'auth.register.have_account': 'Уже есть аккаунт?',
  'auth.register.login': 'Войти',
  'auth.register.error_exists': 'Аккаунт с таким email уже существует.',

  // Auth — forgot password
  'auth.forgot.title': 'Забыли пароль?',
  'auth.forgot.subtitle': 'Введите email и мы отправим код для сброса.',
  'auth.forgot.email': 'Email',
  'auth.forgot.submit': 'Отправить код',
  'auth.forgot.back': 'Назад к входу',
  'auth.forgot.sent': 'Проверьте почту — код уже отправлен.',

  // Auth — reset password
  'auth.reset.title': 'Новый пароль',
  'auth.reset.code': 'Код сброса',
  'auth.reset.password': 'Новый пароль',
  'auth.reset.submit': 'Сбросить пароль',
  'auth.reset.success': 'Пароль обновлён. Теперь можете войти.',

  // Auth — verify email
  'auth.verify.title': 'Проверьте почту',
  'auth.verify.subtitle': 'Мы отправили код подтверждения на',
  'auth.verify.code': 'Код подтверждения',
  'auth.verify.submit': 'Подтвердить',
  'auth.verify.resend': 'Отправить снова',

  // Dashboard
  'dashboard.greeting_morning': 'Доброе утро',
  'dashboard.greeting_afternoon': 'Добрый день',
  'dashboard.greeting_evening': 'Добрый вечер',
  'dashboard.continue': 'Продолжить обучение',
  'dashboard.recent': 'Последняя активность',
  'dashboard.start_practice': 'Начать практику',
  'dashboard.take_placement': 'Пройти тест уровня',
  'dashboard.no_activity': 'Нет активности',
  'dashboard.no_activity_sub': 'Пройдите тест, чтобы увидеть прогресс.',
  'dashboard.score': 'Результат',
  'dashboard.view_all': 'Смотреть все',

  // Practice
  'practice.library': 'Библиотека тестов',
  'practice.title': 'Выберите тему для практики',
  'practice.subtitle': 'Реальные экзаменационные тесты по всем направлениям с мгновенной проверкой.',
  'practice.no_tests': 'Тесты ещё не добавлены',
  'practice.no_tests_sub': 'Тренеры готовят тесты IELTS, SAT и General English. Скоро появятся.',
  'practice.coming_soon': 'Скоро',
  'practice.published': '{{n}} опубликованных тестов',
  'practice.showing': 'Показано {{shown}} из {{total}} тестов {{track}}.',

  // Common
  'common.save': 'Сохранить',
  'common.cancel': 'Отмена',
  'common.back': 'Назад',
  'common.submit': 'Отправить',
  'common.loading': 'Загрузка…',
  'common.error': 'Что-то пошло не так',
  'common.retry': 'Попробовать снова',
  'common.go_dashboard': 'На главную',
  'common.back_dashboard': 'Вернуться на главную',
  'common.min': 'мин',
  'common.questions': 'вопросов',
  'common.or': 'или',
  'common.not_sure': 'Не знаете с чего начать?',
  'common.personalized': 'Вернитесь на главную для персональных рекомендаций.',
}

export default ru
