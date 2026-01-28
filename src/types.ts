export type Item = {
  id: string;
  sort: number;
  status: 'draft' | 'published' | 'archived';
  icon: string;
  url: string;
  thumbnail: string;
  translations: {
    language: string;
    title: string;
  }[];
};

export interface UserData {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  role: string;
  language: string;
}

export interface SecurityValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}
