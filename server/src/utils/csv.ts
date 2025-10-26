import { stringify } from 'csv-stringify/sync';

interface CsvRow {
  imageId: number;
  bookId: number;
  title: string;
  author: string;
  adminEmail: string;
  checkedOutAt: Date;
}

export function buildCheckoutCsv(rows: CsvRow[]): string {
  return stringify(rows, {
    header: true,
    columns: [
      { key: 'imageId', header: 'Image ID' },
      { key: 'bookId', header: 'Book ID' },
      { key: 'title', header: 'Title' },
      { key: 'author', header: 'Author' },
      { key: 'adminEmail', header: 'Checked Out By' },
      { key: 'checkedOutAt', header: 'Checked Out At' }
    ]
  });
}
