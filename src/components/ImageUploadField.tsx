import { useRef, useState } from 'react';
import { uploadImage } from '../services/api';

interface Props {
  value: string;
  onChange: (url: string) => void;
  label?: string;
}

export function ImageUploadField({ value, onChange, label = 'Imagen' }: Props) {
  const inputRef             = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError]    = useState('');

  const handleFile = async (file: File) => {
    setUploading(true);
    setError('');
    try {
      const res = await uploadImage(file);
      onChange(res.data.url);
    } catch {
      setError('Error al subir imagen. Intenta de nuevo.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div>
      <label className="text-xs font-semibold text-txt-secondary uppercase tracking-wide block mb-1">
        {label}
      </label>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        className="hidden"
        onChange={e => {
          const f = e.target.files?.[0];
          if (f) handleFile(f);
          e.target.value = '';
        }}
      />
      <div
        onClick={() => !uploading && inputRef.current?.click()}
        className={`group relative w-full h-36 rounded-xl border-2 border-dashed overflow-hidden flex items-center justify-center cursor-pointer transition
          ${value ? 'border-transparent' : 'border-border-default hover:border-blue-400 bg-surface-elevated'}`}
      >
        {value && <img src={value} alt="preview" className="w-full h-full object-cover" />}

        {uploading ? (
          <div className="absolute inset-0 flex items-center justify-center bg-black/30">
            <svg className="animate-spin text-white" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 12a9 9 0 11-6.219-8.56"/>
            </svg>
          </div>
        ) : value ? (
          <div className="absolute inset-0 flex items-center justify-center group-hover:bg-black/30 transition">
            <span className="opacity-0 group-hover:opacity-100 text-white text-xs font-medium bg-black/50 px-3 py-1 rounded-full transition">
              Cambiar imagen
            </span>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-1.5 pointer-events-none">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-txt-tertiary">
              <rect x="3" y="3" width="18" height="18" rx="2"/>
              <circle cx="8.5" cy="8.5" r="1.5"/>
              <polyline points="21 15 16 10 5 21"/>
            </svg>
            <p className="text-xs text-txt-tertiary">Haz clic para subir imagen</p>
            <p className="text-xs text-txt-disabled">JPG, PNG, WEBP — máx 5 MB</p>
          </div>
        )}

        {value && !uploading && (
          <button
            type="button"
            onClick={e => { e.stopPropagation(); onChange(''); }}
            className="absolute top-2 right-2 z-10 w-6 h-6 rounded-full bg-black/50 text-white text-base leading-none flex items-center justify-center hover:bg-black/70 transition"
          >
            ×
          </button>
        )}
      </div>

      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </div>
  );
}
