import { useNavigate } from 'react-router-dom';

function BackButton({ label = 'Back', className = '' }) {
  const navigate = useNavigate();

  return (
    <button
      onClick={() => navigate(-1)}
      className={`inline-flex items-center gap-2 rounded-full border border-line-strong bg-card px-4 py-2 text-sm font-medium text-secondary shadow-sm backdrop-blur-md transition hover:bg-card-hover hover:text-content ${className}`}
    >
      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M19 12H5M12 19l-7-7 7-7" />
      </svg>
      {label}
    </button>
  );
}

export default BackButton;