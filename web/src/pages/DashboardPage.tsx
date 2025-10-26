import './DashboardPage.css';
import { useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiFetch, apiUpload } from '../api/client.ts';
import { BatchListItem } from '../api/types.ts';
import LoadingScreen from '../components/LoadingScreen.tsx';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';

interface BatchResponse {
  batches: BatchListItem[];
}

export default function DashboardPage() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['batches'],
    queryFn: () => apiFetch<BatchResponse>('/batches')
  });

  const createBatchMutation = useMutation({
    mutationFn: async () => {
      return apiFetch<{ batch: { id: number } }>('/batches', { method: 'POST' });
    }
  });

  const uploadMutation = useMutation({
    mutationFn: async ({ batchId, files }: { batchId: number; files: FileList }) => {
      const form = new FormData();
      Array.from(files).forEach((file) => form.append('images', file));
      return apiUpload<{ images: unknown }>(`/images/upload?batchId=${batchId}`, form);
    }
  });

  const handleFilePick = () => {
    fileInputRef.current?.click();
  };

  const onFilesSelected = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) {
      return;
    }
    setUploadStatus('Creating batch…');
    try {
      const { batch } = await createBatchMutation.mutateAsync();
      setUploadStatus('Uploading images…');
      await uploadMutation.mutateAsync({ batchId: batch.id, files });
      setUploadStatus('Processing OCR…');
      await queryClient.invalidateQueries({ queryKey: ['batches'] });
      navigate(`/batches/${batch.id}`);
    } catch (error) {
      console.error(error);
      setUploadStatus(error instanceof Error ? error.message : 'Upload failed');
    } finally {
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      setTimeout(() => setUploadStatus(null), 2500);
    }
  };

  const batches: BatchListItem[] = data?.batches ?? [];

  if (isLoading) {
    return <LoadingScreen label="Loading batches" />;
  }

  return (
    <div className="dashboard">
      <section className="card dashboard__hero">
        <div>
          <h2>Batch uploads</h2>
          <p>Create a batch and drop in your latest book spine shots. OCR runs automatically.</p>
        </div>
        <div className="dashboard__actions">
          <button className="primary-button" onClick={handleFilePick} disabled={createBatchMutation.isPending || uploadMutation.isPending}>
            {createBatchMutation.isPending || uploadMutation.isPending ? 'Working…' : 'New batch'}
          </button>
          <input
            type="file"
            accept="image/*"
            multiple
            ref={fileInputRef}
            onChange={onFilesSelected}
            style={{ display: 'none' }}
          />
          {uploadStatus ? <p className="dashboard__status">{uploadStatus}</p> : null}
        </div>
      </section>

      <section className="dashboard__list">
        <div className="dashboard__list-header">
          <h3>Recent batches</h3>
          {isFetching ? <span className="dashboard__refresh">Refreshing…</span> : null}
        </div>
        {batches.length === 0 ? (
          <p className="dashboard__empty">No batches yet. Upload your first set of book spines.</p>
        ) : (
          <div className="dashboard__grid">
            {batches.map((batch) => (
              <button key={batch.id} className="dashboard__batch" onClick={() => navigate(`/batches/${batch.id}`)}>
                <div className="dashboard__batch-meta">
                  <span>Batch #{batch.id}</span>
                  <span>{dayjs(batch.createdAt).format('MMM D, YYYY h:mm A')}</span>
                </div>
                <div className="dashboard__batch-images">
                  {batch.images.slice(0, 4).map((image) => (
                    <img key={image.id} src={image.thumbUrl ?? image.publicUrl} alt={image.title ?? 'Book spine'} />
                  ))}
                </div>
                <div className="dashboard__batch-status">
                  <span>{batch.images.filter((image) => image.status === 'pending').length} pending</span>
                  <span>{batch.images.filter((image) => image.status === 'ocr_done').length} ready</span>
                  <span>{batch.images.filter((image) => image.status === 'checked_out').length} checked out</span>
                </div>
              </button>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
