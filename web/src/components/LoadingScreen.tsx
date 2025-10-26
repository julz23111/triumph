import './LoadingScreen.css';

export default function LoadingScreen({ label = 'Loading' }: { label?: string }) {
  return (
    <div className="loading-screen">
      <div className="loading-screen__content">
        <div className="loading-screen__spinner" />
        <p>{label}…</p>
      </div>
    </div>
  );
}
