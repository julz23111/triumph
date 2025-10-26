import './BatchDetailPage.css';
import { useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '../api/client.ts';
import { Batch } from '../api/types.ts';
import LoadingScreen from '../components/LoadingScreen.tsx';
import dayjs from 'dayjs';

interface BatchResponse {
  batch: Batch;
}

const statusLabels: Record<string, string> = {
  pending: 'Pending OCR',
  ocr_done: 'Ready',
  checked_out: 'Checked out'
};

export default function BatchDetailPage() {
  const { batchId } = useParams();
  const navigate = useNavigate();

  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['batches', batchId],
    queryFn: () => apiFetch<BatchResponse>(`/batches/${batchId}`),
    enabled: Boolean(batchId),
    refetchInterval: (query) => {
      const batchData = query.state.data as BatchResponse | undefined;
      const images = batchData?.batch.images ?? [];
      return images.some((image) => image.status === 'pending') ? 5000 : false;
    }
  });

  const batch = data?.batch;
  const counts = useMemo(() => {
    if (!batch) return { pending: 0, ready: 0, checkedOut: 0 };
    return {
      pending: batch.images.filter((image) => image.status === 'pending').length,
      ready: batch.images.filter((image) => image.status === 'ocr_done').length,
      checkedOut: batch.images.filter((image) => image.status === 'checked_out').length
    };
  }, [batch]);

  if (isLoading || !batch) {
    return <LoadingScreen label="Loading batch" />;
  }

  return (
    <div className="batch">
      <button className="secondary-button" onClick={() => navigate(-1)}>
        ← Back
      </button>
      <header className="batch__header">
        <div>
          <h2>Batch #{batch.id}</h2>
          <p>Created {dayjs(batch.createdAt).format('MMMM D, YYYY h:mm A')}</p>
        </div>
        <div className="batch__summary">
          <span>{counts.pending} pending</span>
          <span>{counts.ready} ready</span>
          <span>{counts.checkedOut} checked out</span>
          <button className="secondary-button" onClick={() => refetch()} disabled={isFetching}>
            {isFetching ? 'Refreshing…' : 'Refresh'}
          </button>
        </div>
      </header>
      <div className="batch__grid">
        {batch.images.map((image) => (
          <button key={image.id} className="batch__image" onClick={() => navigate(`/images/${image.id}`)}>
            <div className={`batch__status batch__status--${image.status}`}>
              {statusLabels[image.status] ?? image.status}
            </div>
            <img src={image.thumbUrl ?? image.publicUrl} alt={image.title ?? 'Book spine'} />
            <div className="batch__meta">
              <strong>{image.title ?? 'Untitled'}</strong>
              <span>{image.author ?? 'Unknown author'}</span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
