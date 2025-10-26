export interface User {
  id: number;
  email: string;
  isAdmin: boolean;
  createdAt: string;
}

export interface AuthResponse {
  user: User;
}

export interface BatchImage {
  id: number;
  batchId: number;
  storagePath: string;
  publicUrl: string;
  thumbUrl?: string;
  ocrText?: string | null;
  title?: string | null;
  author?: string | null;
  status: 'pending' | 'ocr_done' | 'checked_out';
  createdAt: string;
}

export interface Batch {
  id: number;
  adminId: number;
  createdAt: string;
  images: BatchImage[];
}

export interface BatchListItem extends Batch {}

export interface CheckoutResponse {
  checkout: {
    id: number;
    imageId: number;
    bookId: number;
    adminId: number;
    checkedOutAt: string;
  };
  book: {
    id: number;
    title: string;
    author: string;
    createdAt: string;
    updatedAt: string;
  };
}
