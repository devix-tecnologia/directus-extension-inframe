export type Item = {
  id: string;
  sort: number;
  status: 'draft' | 'published' | 'archived';
  icon: string;
  url: string;
  thumbnail: string;
  translations: {
    languages_code: string;
    title: string;
  }[];
};
