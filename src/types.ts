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
