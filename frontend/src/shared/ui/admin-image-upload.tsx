"use client";
import { CameraIcon } from "lucide-react";
import { useEffect, useMemo, useRef } from "react";
import { resolveAssetUrl } from "@/shared/lib/item-display";
import { Input } from "@/shared/ui/8bit/input";
interface Props {
  label: string;
  value?: string | null;
  file: File | null;
  onFileChange: (file: File | null) => void;
}
export function AdminImageUpload({ label, value, file, onFileChange }: Props) {
  const ref = useRef<HTMLInputElement | null>(null);
  const objectUrl = useMemo(() => (file ? URL.createObjectURL(file) : null), [file]);
  useEffect(
    () => () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    },
    [objectUrl],
  );
  const preview = objectUrl ?? (value ? resolveAssetUrl(value) : null);
  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">{label}</p>
      <button
        type="button"
        className="group relative h-36 w-36 overflow-hidden rounded-md border border-dashed border-muted-foreground/40 bg-muted/20"
        onClick={() => ref.current?.click()}
      >
        {preview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={preview} alt={`${label} preview`} className="h-full w-full object-cover" />
        ) : (
          <CameraIcon className="absolute left-1/2 top-1/2 size-8 -translate-x-1/2 -translate-y-1/2 text-muted-foreground" />
        )}
        <span className="absolute inset-0 flex items-center justify-center bg-black/55 text-xs font-medium text-white opacity-0 transition-opacity group-hover:opacity-100">
          {preview ? "Change image" : "Select image"}
        </span>
      </button>
      <Input
        ref={ref}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif"
        className="hidden"
        onChange={(e) => onFileChange(e.target.files?.[0] ?? null)}
      />
      <p className="text-xs text-muted-foreground">JPG, PNG, WEBP or GIF, up to 5 MB.</p>
    </div>
  );
}
