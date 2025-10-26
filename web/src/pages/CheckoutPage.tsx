import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '../api/client.ts';
import { Batch, BatchImage } from '../api/types.ts';
import LoadingScreen from '../components/LoadingScreen.tsx';
import './CheckoutPage.css';

interface ImageResponse {
  image: BatchImage;
}

interface BatchResponse {
  batch: Batch;
}

export default function CheckoutPage() {
  const { imageId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [formError, setFormError] = useState('');

  const imageQuery = useQuery({
    queryKey: ['images', imageId],
    queryFn: () => apiFetch<ImageResponse>(`/images/${imageId}`),
    enabled: Boolean(imageId)
  });

  const batchId = imageQuery.data?.image.batchId;

  const batchQuery = useQuery({
    queryKey: ['batches', batchId],
    queryFn: () => apiFetch<BatchResponse>(`/batches/${batchId}`),
    enabled: Boolean(batchId)
  });

  useEffect(() => {
    if (imageQuery.data?.image) {
      const current = imageQuery.data.image;
      setTitle(current.title ?? current.ocrText ?? '');
      setAuthor(current.author ?? '');
    }
  }, [imageQuery.data?.image]);

  useEffect(() => {
    const state = location.state as { lastPayload?: { title: string; author: string } } | undefined;
    if (state?.lastPayload) {
      setTitle(state.lastPayload.title);
      setAuthor(state.lastPayload.author);
    }
  }, [location.state]);

  const updateMutation = useMutation({
    mutationFn: (payload: { title: string; author: string }) =>
      apiFetch<ImageResponse>(`/images/${imageId}`, {
        method: 'PATCH',
        body: JSON.stringify(payload)
      }),
    onSuccess: (response) => {
      queryClient.setQueryData(['images', imageId], response);
      queryClient.invalidateQueries({ queryKey: ['batches'] });
      if (response.image.batchId) {
        queryClient.invalidateQueries({ queryKey: ['batches', response.image.batchId] });
      }
    }
  });

  const checkoutMutation = useMutation({
    mutationFn: (payload: { title: string; author: string }) =>
      apiFetch(`/images/${imageId}/checkout`, {
        method: 'POST',
        body: JSON.stringify(payload)
      }),
    onSuccess: async (_data, variables) => {
      setFormError('');
      await queryClient.invalidateQueries({ queryKey: ['images', imageId] });
      await queryClient.invalidateQueries({ queryKey: ['batches'] });
      if (batchId) {
        await queryClient.invalidateQueries({ queryKey: ['batches', batchId] });
      }
      navigateToNext(variables);
    }
  });

  const navigateToNext = (lastPayload?: { title: string; author: string }) => {
    const batch = batchQuery.data?.batch;
    if (!batch) {
      if (batchId) {
        navigate(`/batches/${batchId}`);
      }
      return;
    }
    const currentIndex = batch.images.findIndex((img) => img.id === Number(imageId));
    const nextImage = batch.images[currentIndex + 1];
    if (nextImage) {
      navigate(`/images/${nextImage.id}`, { replace: true, state: { lastPayload } });
    } else {
      navigate(`/batches/${batch.id}`);
    }
  };

  const handleSave = async (event?: FormEvent) => {
    event?.preventDefault();
    setFormError('');
    if (!title.trim() || !author.trim()) {
      setFormError('Title and author are required.');
      return;
    }
    try {
      await updateMutation.mutateAsync({ title: title.trim(), author: author.trim() });
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Unable to save');
    }
  };

  const handleCheckout = async (event: FormEvent) => {
    event.preventDefault();
    setFormError('');
    if (!title.trim() || !author.trim()) {
      setFormError('Title and author are required.');
      return;
    }
    try {
      await checkoutMutation.mutateAsync({ title: title.trim(), author: author.trim() });
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Unable to check out');
    }
  };

  const batch = batchQuery.data?.batch;
  const nextImage = useMemo(() => {
    if (!batch) return undefined;
    const currentIndex = batch.images.findIndex((img) => img.id === imageQuery.data?.image.id);
    return currentIndex >= 0 ? batch.images[currentIndex + 1] : undefined;
  }, [batch, imageQuery.data?.image?.id]);

  if (imageQuery.isLoading || !imageQuery.data) {
    return <LoadingScreen label="Loading image" />;
  }

  const image = imageQuery.data.image;

  return (
    <div className="checkout">
      <button className="secondary-button" onClick={() => navigate(-1)}>
        ← Back
      </button>
      <div className="checkout__content">
        <div className="checkout__image">
          <img src={image.publicUrl} alt={image.title ?? 'Book spine'} />
          <a href={image.publicUrl} target="_blank" rel="noreferrer">
            Open full image
          </a>
        </div>
        <form className="checkout__form" onSubmit={handleCheckout}>
          <div className="input-field">
            <label htmlFor="title">Title</label>
            <input id="title" value={title} onChange={(event) => setTitle(event.target.value)} required />
          </div>
          <div className="input-field">
            <label htmlFor="author">Author</label>
            <input id="author" value={author} onChange={(event) => setAuthor(event.target.value)} required />
          </div>
          {image.ocrText ? (
            <div className="checkout__ocr">
              <span>OCR preview</span>
              <p>{image.ocrText}</p>
            </div>
          ) : null}
          {formError ? <p className="error-text">{formError}</p> : null}
          <div className="checkout__actions">
            <button type="button" className="secondary-button" onClick={() => handleSave()} disabled={updateMutation.isPending}>
              {updateMutation.isPending ? 'Saving…' : 'Save'}
            </button>
            <button type="button" className="secondary-button" onClick={() => (nextImage ? navigate(`/images/${nextImage.id}`) : navigateToNext())} disabled={!nextImage}>
              Next
            </button>
            <button type="submit" className="primary-button" disabled={checkoutMutation.isPending}>
              {checkoutMutation.isPending ? 'Checking out…' : 'Check out'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
