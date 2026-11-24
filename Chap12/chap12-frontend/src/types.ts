export interface User {
  id: number;
  username: string;
  email: string;
  role: 'ADMIN' | 'USER' | string;
}

export interface Post {
  id: number;
  title: string;
  content: string | null;
  summary?: string | null;
  published?: boolean;
  views?: number;
  authorId?: number;
  createdAt?: string;
  updatedAt?: string;
  author?: { id: number; username: string };
}

export interface PostList {
  data: Post[];
  meta: {
    total: number;
    page: number;
    totalPages: number;
  };
}

export interface LoginResponse {
  user: User;
  accessToken: string;
}
