export type QuestionType =
  | 'Rating'
  | 'SingleChoice'
  | 'MultipleChoice'
  | 'Text'
  | 'YesNo'
  | 'Number';

export interface SurveyDiscount {
  enabled: boolean;
  percent: number;
  codePrefix: string;
  validityDays: number;
}

export interface PublicSurveyDiscount {
  enabled: boolean;
  percent: number;
  validityDays: number;
}

export interface PublicSurvey {
  id: number;
  slug: string;
  title: string;
  description: string | null;
  discount?: PublicSurveyDiscount | null;
  branches: PublicBranch[];
  questions: PublicQuestion[];
}

export interface PublicBranch {
  id: number;
  name: string;
  order: number;
}

export interface PublicQuestion {
  id: number;
  key: string | null;
  title: string;
  subtitle: string | null;
  type: QuestionType;
  isRequired: boolean;
  icon: string | null;
  order: number;
  minValue: number | null;
  maxValue: number | null;
  maxLength: number | null;
  options: PublicOption[];
}

export interface PublicOption {
  id: number;
  text: string;
  value: string | null;
  icon: string | null;
  order: number;
}

export interface SubmitSurveyResponse {
  customerName?: string | null;
  phoneNumber?: string | null;
  branchId?: number | null;
  /** Optional free-form notes sent with the evaluation. */
  notes?: string | null;
  answers: SubmitAnswer[];
}

export interface SubmitAnswer {
  questionId: number;
  ratingValue?: number | null;
  numberValue?: number | null;
  textValue?: string | null;
  selectedOptionId?: number | null;
  selectedOptionIds?: number[] | null;
}

export interface SubmitSurveyResult {
  id: number;
  submittedAt: string;
}

export interface DiscountSession {
  clientUuid: string;
}

export interface DiscountCheck {
  hasCode: boolean;
  discountEnabled: boolean;
  code: string | null;
  discountPercent: number | null;
  expiresAt: string | null;
  status: number | string | null;
  usedBefore: boolean;
  expiredBefore: boolean;
  message: string | null;
}

export interface IssueDiscountRequest {
  feedbackId: number;
  customerName: string;
  mobile: string;
  deviceFingerprint?: string | null;
  clientUuid?: string | null;
}

export interface IssueDiscountResult {
  hasActiveCode: boolean;
  code: string | null;
  discountPercent: number | null;
  expiresAt: string | null;
  status: number | string | null;
  alreadyIssued: boolean;
  message?: string | null;
}

/** 1 Active · 2 Used · 3 Expired · 4 Revoked */
export type DiscountCodeStatusValue = 1 | 2 | 3 | 4;

export interface DiscountCodeRow {
  id: number;
  code: string;
  status: number | string;
  discountPercent: number | null;
  customerName: string | null;
  mobile?: string | null;
  phoneNumber?: string | null;
  expiresAt: string | null;
  usedAt: string | null;
  issuedAt?: string | null;
}

export interface UpdateDiscountCodeRequest {
  status: DiscountCodeStatusValue;
}

export interface Branch {
  id: number;
  name: string;
}

export interface SurveyListItem {
  id: number;
  title: string;
  slug: string;
  isActive: boolean;
  isPublished: boolean;
  questionsCount: number;
  responsesCount: number;
  createdAt: string;
  discountEnabled?: boolean;
}

export interface SurveyDetails {
  id: number;
  title: string;
  description: string | null;
  slug: string;
  isActive: boolean;
  isPublished: boolean;
  createdAt: string;
  updatedAt: string | null;
  discount?: SurveyDiscount | null;
  branches: BranchDetails[];
  questions: QuestionDetails[];
}

export interface BranchDetails {
  id: number;
  name: string;
  order: number;
  isActive: boolean;
}

export interface QuestionDetails {
  id: number;
  key: string | null;
  title: string;
  subtitle: string | null;
  type: QuestionType;
  isRequired: boolean;
  icon: string | null;
  order: number;
  minValue: number | null;
  maxValue: number | null;
  maxLength: number | null;
  options: OptionDetails[];
}

export interface OptionDetails {
  id: number;
  text: string;
  value: string | null;
  icon: string | null;
  order: number;
}

export interface PagedResult<T> {
  total: number;
  page: number;
  pageSize: number;
  items: T[];
}

export interface SurveyResponseRow {
  id: number;
  customerName: string | null;
  phoneNumber: string | null;
  branchId: number | null;
  branchName: string | null;
  averageRating: number | null;
  submittedAt: string;
  /** Free-form notes submitted with the evaluation (API may use any of these names). */
  notes?: string | null;
  comment?: string | null;
  suggestion?: string | null;
  feedback?: string | null;
  answers: ResponseAnswer[];
}

export interface ResponseAnswer {
  questionId: number;
  questionKey: string | null;
  questionTitle: string;
  questionType: string;
  ratingValue: number | null;
  numberValue: number | null;
  textValue: string | null;
  selectedOptionId: number | null;
  selectedOptionText: string | null;
  selectedOptionValue: string | null;
  selectedOptionTexts: string[];
}

export interface SurveyAnalytics {
  totalResponses: number;
  averageRating: number | null;
  kpis: Kpi[];
  ratingDistribution: RatingDistribution[];
  ratingAverages: RatingAverage[];
  choiceBreakdowns: ChoiceBreakdown[];
}

export interface Kpi {
  key: string | null;
  title: string;
  percentage: number;
  matchingOptionValue: string;
}

export interface RatingDistribution {
  stars: number;
  count: number;
  percentage: number;
}

export interface RatingAverage {
  questionId: number;
  key: string | null;
  title: string;
  icon: string | null;
  average: number | null;
}

export interface ChoiceBreakdown {
  questionId: number;
  key: string | null;
  title: string;
  options: ChoiceOptionStat[];
}

export interface ChoiceOptionStat {
  optionId: number;
  text: string;
  value: string | null;
  count: number;
  percentage: number;
}

export interface ResponsesQuery {
  search?: string;
  stars?: number;
  page?: number;
  pageSize?: number;
}

export interface SaveSurvey {
  title: string;
  description?: string | null;
  slug?: string | null;
  discount: SurveyDiscount;
  branches: SaveBranch[];
  questions: SaveQuestion[];
}

export interface SaveBranch {
  id?: number | null;
  name: string;
  order: number;
  isActive: boolean;
}

export interface SaveQuestion {
  id?: number | null;
  key: string;
  title: string;
  subtitle?: string | null;
  type: QuestionType;
  isRequired: boolean;
  icon?: string | null;
  order: number;
  minValue?: number | null;
  maxValue?: number | null;
  maxLength?: number | null;
  options: SaveOption[];
}

export interface SaveOption {
  id?: number | null;
  text: string;
  value?: string | null;
  icon?: string | null;
  order: number;
}

export interface LoginRequest {
  emailOrPhone: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  user: AuthUser;
}

export interface AuthUser {
  id: number;
  name: string;
  email: string | null;
  phoneNumber: string | null;
  surveys: AuthUserSurvey[];
}

export interface AuthUserSurvey {
  id: number;
  title: string;
  slug: string;
  role: string;
}
