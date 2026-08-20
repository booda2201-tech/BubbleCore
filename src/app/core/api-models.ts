export type QuestionType =
  | 'Rating'
  | 'SingleChoice'
  | 'MultipleChoice'
  | 'Text'
  | 'YesNo'
  | 'Number';

export interface PublicSurvey {
  id: number;
  slug: string;
  title: string;
  description: string | null;
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
