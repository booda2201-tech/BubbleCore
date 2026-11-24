import { Service, computed, inject } from '@angular/core';
import { AppLanguage, LanguageService } from './language';

type Dict = Record<string, string>;

const AR: Dict = {
  'lang.title': 'اختار اللغة',
  'lang.subtitle': 'Choose your language / اختار لغتك',
  'lang.continue': 'متابعة',
  'lang.arabic': 'العربية',
  'lang.english': 'English',
  'lang.arabicHint': 'Arabic',
  'lang.englishHint': 'الإنجليزية',

  'welcome.eyebrow': 'تجربة تقييم بابل هوب',
  'welcome.hello': 'أهلاً بك في بابل هوب',
  'welcome.lead.discount':
    'رأيك يصنع الفرق. شارك تقييمك في أقل من دقيقة واحصل على كود خصم لزيارتك الجاية.',
  'welcome.lead.default':
    'رأيك يصنع الفرق. شاركنا تجربتك في أقل من دقيقة واحصل على خدمة أفضل في زيارتك القادمة.',
  'welcome.name': 'الاسم',
  'welcome.namePlaceholder': 'اكتب اسمك',
  'welcome.nameError': 'من فضلك أدخل اسمك (حرفين على الأقل)',
  'welcome.phone': 'رقم الموبايل',
  'welcome.phoneError': 'من فضلك أدخل رقم موبايل صحيح',
  'welcome.branch': 'الفرع',
  'welcome.branchPlaceholder': 'اختار الفرع',
  'welcome.branchError': 'من فضلك اختار الفرع',
  'welcome.start': 'ابدأ التقييم',
  'welcome.checking': 'جاري التحقق…',
  'welcome.showCode': 'عرض كود الخصم الحالي',
  'welcome.claimLink': 'قيّمت قبل كده؟ طالب بكود الخصم',
  'welcome.privacy': 'بياناتك محفوظة بسرية تامة ولن تُستخدم إلا لتحسين جودة الخدمة.',
  'welcome.changeLanguage': 'تغيير اللغة',

  'expo.eyebrow': 'جناح بابل هوب في المعرض',
  'expo.hello': 'أهلاً بيك في جناح بابل هوب',
  'expo.lead.discount':
    'جرّبت منتجاتنا في المعرض؟ قيّم تجربتك في أقل من دقيقة واحصل على كود خصم 20% خاص بالمعرض.',
  'expo.lead.default':
    'جرّبت منتجاتنا في المعرض؟ قيّم تجربتك في أقل من دقيقة وساعدنا نقدّم أحلى طعم.',
  'expo.claimLink': 'قيّمت في المعرض قبل كده؟ طالب بكود الخصم',
  'expo.privacy': 'تقييم المعرض منفصل تمامًا عن فروع بابل هوب، وبياناتك محفوظة بسرية.',

  'admin.title': 'دخول الموظفين',
  'admin.hint': 'أدخل الإيميل أو الموبايل وكلمة المرور للمتابعة.',
  'admin.identity': 'الإيميل أو الموبايل',
  'admin.password': 'كلمة المرور',
  'admin.showPassword': 'عرض كلمة المرور',
  'admin.hidePassword': 'إخفاء كلمة المرور',
  'admin.login': 'دخول',
  'admin.loggingIn': 'جاري الدخول…',
  'admin.cancel': 'إلغاء',
  'admin.close': 'إغلاق',
};

const EN: Dict = {
  'lang.title': 'Choose language',
  'lang.subtitle': 'Choose your language / اختار لغتك',
  'lang.continue': 'Continue',
  'lang.arabic': 'العربية',
  'lang.english': 'English',
  'lang.arabicHint': 'Arabic',
  'lang.englishHint': 'English',

  'welcome.eyebrow': 'Bubble Hope feedback',
  'welcome.hello': 'Welcome to Bubble Hope',
  'welcome.lead.discount':
    'Your opinion matters. Share your feedback in under a minute and get a discount code for your next visit.',
  'welcome.lead.default':
    'Your opinion matters. Share your experience in under a minute and help us serve you better next time.',
  'welcome.name': 'Name',
  'welcome.namePlaceholder': 'Enter your name',
  'welcome.nameError': 'Please enter your name (at least 2 characters)',
  'welcome.phone': 'Mobile number',
  'welcome.phoneError': 'Please enter a valid mobile number',
  'welcome.branch': 'Branch',
  'welcome.branchPlaceholder': 'Choose a branch',
  'welcome.branchError': 'Please choose a branch',
  'welcome.start': 'Start feedback',
  'welcome.checking': 'Checking…',
  'welcome.showCode': 'Show current discount code',
  'welcome.claimLink': 'Rated before? Claim your discount code',
  'welcome.privacy': 'Your data is kept private and used only to improve our service.',
  'welcome.changeLanguage': 'Change language',

  'expo.eyebrow': 'Bubble Hope exhibition booth',
  'expo.hello': 'Welcome to the Bubble Hope booth',
  'expo.lead.discount':
    'Tried us at the exhibition? Share your feedback in under a minute and get a 20% exhibition discount code.',
  'expo.lead.default':
    'Tried us at the exhibition? Share your feedback in under a minute and help us make it even better.',
  'expo.claimLink': 'Already rated at the expo? Claim your discount code',
  'expo.privacy':
    'Exhibition feedback is completely separate from Bubble Hope stores, and your data stays private.',

  'admin.title': 'Staff login',
  'admin.hint': 'Enter your email or mobile and password to continue.',
  'admin.identity': 'Email or mobile',
  'admin.password': 'Password',
  'admin.showPassword': 'Show password',
  'admin.hidePassword': 'Hide password',
  'admin.login': 'Sign in',
  'admin.loggingIn': 'Signing in…',
  'admin.cancel': 'Cancel',
  'admin.close': 'Close',
};

const DICTS: Record<AppLanguage, Dict> = { ar: AR, en: EN };

@Service()
export class I18n {
  private readonly language = inject(LanguageService);

  readonly lang = computed(() => this.language.current());

  t(key: string): string {
    // Read the signal so templates refresh when language changes.
    const lang = this.language.language() ?? 'ar';
    return DICTS[lang][key] ?? DICTS.ar[key] ?? key;
  }
}
