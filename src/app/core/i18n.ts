import { Service, computed, inject } from '@angular/core';
import { AppLanguage, LanguageService } from './language';
import { pickLocalized } from './localized-text';

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

  'fb.loading.eyebrow': 'جاري التحميل',
  'fb.loading.title': 'بنجهّزلك أسئلة التقييم',
  'fb.loading.sub': 'ثواني ونبدأ.',
  'fb.error.eyebrow': 'تعذر التحميل',
  'fb.error.title': 'مقدرناش نفتح الفورم',
  'fb.retry': 'إعادة المحاولة',
  'fb.eyebrow.default': 'تقييم تجربتك في بابل هوب',
  'fb.hello': 'أهلاً',
  'fb.guest': 'بيك',
  'fb.cancel': 'إلغاء التقييم',
  'fb.notesStep': 'تدوين الملاحظات',
  'fb.progress': 'السؤال {n} من {total}',
  'fb.steps': 'خطوات التقييم',
  'fb.stepN': 'السؤال {n}',
  'fb.questionBadge': 'سؤال {n}',
  'fb.notesBadge': 'الملاحظات',
  'fb.notesDefaultTitle': 'لو حابب تكتب ملاحظة أو اقتراح',
  'fb.notesOptional': 'اختياري — كل ملاحظة بنقراها بعناية',
  'fb.notesPlaceholder': 'اكتب ملاحظتك هنا…',
  'fb.notesAria': 'الملاحظات',
  'fb.notesSkip': 'تقدر تتخطى الخطوة دي وتبعت التقييم مباشرة',
  'fb.hintStars': 'اختار النجوم وهنكمل للسؤال اللي بعده تلقائي',
  'fb.hintMulti': 'تقدر تختار أكثر من إجابة ثم تضغط التالي',
  'fb.hintSingle': 'اختار إجابة وهنكمل تلقائي',
  'fb.prev': 'السابق',
  'fb.next': 'التالي',
  'fb.submit': 'إرسال التقييم',
  'fb.sending': 'جاري الإرسال…',
  'fb.thanks': 'شكراً ليك',
  'fb.thanksBody':
    'تم تسجيل تقييمك بنجاح. رأيك بيساعد بابل هوب نقدّم لك تجربة أحلى في كل زيارة.',
  'fb.overall': 'تقييمك العام',
  'fb.codePreparing': 'جاري تجهيز كود الخصم…',
  'fb.codeLabel': 'كود الخصم بتاعك',
  'fb.codeAlready': 'الكود ده اتعمل قبل كده.',
  'fb.discountPercent': 'خصم {percent}%',
  'fb.validUntil': 'صالح حتى {date} — استخدمه مرة واحدة',
  'fb.useOnce': 'استخدمه مرة واحدة في زيارتك الجاية',
  'fb.copy': 'نسخ الكود',
  'fb.copied': 'تم النسخ',
  'fb.showBig': 'عرض كود الخصم بحجم أكبر',
  'fb.retryCode': 'إعادة محاولة كود الخصم',
  'fb.home': 'العودة للرئيسية',
  'fb.hint.answer': 'جاوب على السؤال ده عشان تكمل',
  'fb.hint.order': 'جاوب على الأسئلة المطلوبة بالترتيب',
  'fb.hint.required': 'جاوب على الأسئلة المطلوبة أولاً',
  'fb.hint.notes': 'اكتب ملاحظتك عشان تكمل',
  'fb.err.phone': 'محتاجين رقم الموبايل عشان نطلع كود الخصم.',
  'fb.err.generic': 'حصل خطأ غير متوقع.',

  'rating.0': 'لم يتم التقييم',
  'rating.1': 'سيئ جداً',
  'rating.2': 'يحتاج تحسين',
  'rating.3': 'مقبول',
  'rating.4': 'جيد جداً',
  'rating.5': 'ممتاز',
  'star.label': 'التقييم',
  'star.of': '{n} من 5',
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

  'fb.loading.eyebrow': 'Loading',
  'fb.loading.title': 'Getting your questions ready',
  'fb.loading.sub': 'Just a moment.',
  'fb.error.eyebrow': 'Could not load',
  'fb.error.title': "We couldn't open the form",
  'fb.retry': 'Try again',
  'fb.eyebrow.default': 'Rate your Bubble Hope experience',
  'fb.hello': 'Hello',
  'fb.guest': 'there',
  'fb.cancel': 'Cancel feedback',
  'fb.notesStep': 'Add notes',
  'fb.progress': 'Question {n} of {total}',
  'fb.steps': 'Feedback steps',
  'fb.stepN': 'Question {n}',
  'fb.questionBadge': 'Question {n}',
  'fb.notesBadge': 'Notes',
  'fb.notesDefaultTitle': 'Anything you would like to add?',
  'fb.notesOptional': 'Optional — we read every note carefully',
  'fb.notesPlaceholder': 'Write your note here…',
  'fb.notesAria': 'Notes',
  'fb.notesSkip': 'You can skip this step and submit right away',
  'fb.hintStars': 'Pick your stars and we will move on automatically',
  'fb.hintMulti': 'Pick one or more answers, then tap Next',
  'fb.hintSingle': 'Pick an answer and we will continue automatically',
  'fb.prev': 'Back',
  'fb.next': 'Next',
  'fb.submit': 'Submit feedback',
  'fb.sending': 'Sending…',
  'fb.thanks': 'Thank you',
  'fb.thanksBody':
    'Your feedback was recorded. It helps Bubble Hope give you a better experience on every visit.',
  'fb.overall': 'Your overall rating',
  'fb.codePreparing': 'Preparing your discount code…',
  'fb.codeLabel': 'Your discount code',
  'fb.codeAlready': 'This code was already issued.',
  'fb.discountPercent': '{percent}% off',
  'fb.validUntil': 'Valid until {date} — one-time use',
  'fb.useOnce': 'Use it once on your next visit',
  'fb.copy': 'Copy code',
  'fb.copied': 'Copied',
  'fb.showBig': 'Show the code bigger',
  'fb.retryCode': 'Retry discount code',
  'fb.home': 'Back to home',
  'fb.hint.answer': 'Answer this question to continue',
  'fb.hint.order': 'Please answer the required questions in order',
  'fb.hint.required': 'Please answer the required questions first',
  'fb.hint.notes': 'Write your note to continue',
  'fb.err.phone': 'We need your mobile number to issue the discount code.',
  'fb.err.generic': 'Something went wrong.',

  'rating.0': 'Not rated',
  'rating.1': 'Very poor',
  'rating.2': 'Needs improvement',
  'rating.3': 'Fair',
  'rating.4': 'Very good',
  'rating.5': 'Excellent',
  'star.label': 'Rating',
  'star.of': '{n} of 5',
};

const DICTS: Record<AppLanguage, Dict> = { ar: AR, en: EN };

@Service()
export class I18n {
  private readonly language = inject(LanguageService);

  readonly lang = computed(() => this.language.current());

  t(key: string, params?: Record<string, string | number>): string {
    // Read the signal so templates refresh when language changes.
    const lang = this.language.language() ?? 'ar';
    const text = DICTS[lang][key] ?? DICTS.ar[key] ?? key;
    if (!params) return text;
    return text.replace(/\{(\w+)\}/g, (match, name: string) =>
      name in params ? String(params[name]) : match,
    );
  }

  /** Arabic text plus its native English field; falls back to legacy r||en packing. */
  pick(ar: string | null | undefined, en: string | null | undefined): string {
    if ((this.language.language() ?? 'ar') === 'en') {
      return en?.trim() || pickLocalized(ar, 'en');
    }
    return pickLocalized(ar, 'ar');
  }

  /** Pick the Arabic / English half of an `arabic||english` admin-authored string. */
  tr(raw: string | null | undefined): string {
    return pickLocalized(raw, this.language.language() ?? 'ar');
  }
}
