const en = {
  // Navigation
  'nav.ielts': 'IELTS',
  'nav.sat': 'SAT',
  'nav.general_english': 'General English',
  'nav.pricing': 'Pricing',
  'nav.seminars': 'Seminars',
  'nav.login': 'Log in',
  'nav.get_started': 'Get started',
  'nav.dashboard': 'Dashboard',
  'nav.practice': 'Practice',
  'nav.placement': 'Placement test',
  'nav.settings': 'Settings',
  'nav.logout': 'Log out',

  // Auth — login
  'auth.login.title': 'Welcome back',
  'auth.login.subtitle': 'Sign in to continue learning',
  'auth.login.email': 'Email',
  'auth.login.password': 'Password',
  'auth.login.submit': 'Sign in',
  'auth.login.forgot': 'Forgot password?',
  'auth.login.no_account': "Don't have an account?",
  'auth.login.register': 'Sign up',
  'auth.login.error_invalid': 'Invalid email or password.',
  'auth.login.error_unverified': 'Please verify your email first.',

  // Auth — register
  'auth.register.title': 'Create your account',
  'auth.register.subtitle': 'Start practicing IELTS, SAT and General English tests today.',
  'auth.register.first_name': 'First name',
  'auth.register.last_name': 'Last name',
  'auth.register.email': 'Email',
  'auth.register.password': 'Password',
  'auth.register.submit': 'Create account',
  'auth.register.have_account': 'Already have an account?',
  'auth.register.login': 'Sign in',
  'auth.register.error_exists': 'An account with this email already exists.',

  // Auth — forgot password
  'auth.forgot.title': 'Forgot your password?',
  'auth.forgot.subtitle': "Enter your email and we'll send you a reset code.",
  'auth.forgot.email': 'Email',
  'auth.forgot.submit': 'Send reset code',
  'auth.forgot.back': 'Back to sign in',
  'auth.forgot.sent': 'Check your inbox — a reset code is on its way.',

  // Auth — reset password
  'auth.reset.title': 'Set a new password',
  'auth.reset.code': 'Reset code',
  'auth.reset.password': 'New password',
  'auth.reset.submit': 'Reset password',
  'auth.reset.success': 'Password updated. You can now sign in.',

  // Auth — verify email
  'auth.verify.title': 'Check your email',
  'auth.verify.subtitle': "We've sent a verification code to",
  'auth.verify.code': 'Verification code',
  'auth.verify.submit': 'Verify',
  'auth.verify.resend': 'Resend code',

  // Dashboard
  'dashboard.greeting_morning': 'Good morning',
  'dashboard.greeting_afternoon': 'Good afternoon',
  'dashboard.greeting_evening': 'Good evening',
  'dashboard.continue': 'Continue learning',
  'dashboard.recent': 'Recent activity',
  'dashboard.start_practice': 'Start practice',
  'dashboard.take_placement': 'Take placement test',
  'dashboard.no_activity': 'No activity yet',
  'dashboard.no_activity_sub': 'Complete a test to see your progress here.',
  'dashboard.score': 'Score',
  'dashboard.view_all': 'View all',

  // Practice
  'practice.library': 'Practice library',
  'practice.title': 'Choose what to practice',
  'practice.subtitle': 'Real exam-style tests across every track and skill, with instant scoring and saved progress.',
  'practice.no_tests': 'No practice tests yet',
  'practice.no_tests_sub': 'Our coaches are preparing IELTS, SAT and General English sets right now. Check back soon.',
  'practice.coming_soon': 'Coming soon',
  'practice.published': '{{n}} published tests',
  'practice.showing': 'Showing {{shown}} of {{total}} {{track}} tests.',

  // Common
  'common.save': 'Save',
  'common.cancel': 'Cancel',
  'common.back': 'Back',
  'common.submit': 'Submit',
  'common.loading': 'Loading…',
  'common.error': 'Something went wrong',
  'common.retry': 'Try again',
  'common.go_dashboard': 'Go to dashboard',
  'common.back_dashboard': 'Back to dashboard',
  'common.min': 'min',
  'common.questions': 'questions',
  'common.or': 'or',
  'common.not_sure': 'Not sure where to start?',
  'common.personalized': 'Head back to your dashboard for personalised recommendations.',
}

export type Messages = Record<string, string>
export type MessageKey = keyof typeof en
export default en
