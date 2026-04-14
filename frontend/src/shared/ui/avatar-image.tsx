"use client";

import { useMemo, useState } from "react";
import { UserCircle2Icon } from "lucide-react";

import { resolveAssetUrl } from "@/shared/lib/item-display";
import { cn } from "@/shared/lib/utils";

const FALLBACK_AVATAR_SRC = "/assets/images/avatar-fallback.svg";

interface AvatarImageProps {
  avatarUrl?: string | null;
  alt: string;
  sizeClassName: string;
  className?: string;
}

export function AvatarImage({ avatarUrl, alt, sizeClassName, className }: AvatarImageProps) {
  const resolvedAvatarUrl = useMemo(() => {
    if (!avatarUrl) {
      return null;
    }

    return resolveAssetUrl(avatarUrl);
  }, [avatarUrl]);
  const [failedSources, setFailedSources] = useState<string[]>([]);
  const hasFailedAvatar = Boolean(resolvedAvatarUrl && failedSources.includes(resolvedAvatarUrl));
  const hasFailedFallback = failedSources.includes(FALLBACK_AVATAR_SRC);
  const imageSrc =
    resolvedAvatarUrl && !hasFailedAvatar
      ? resolvedAvatarUrl
      : !hasFailedFallback
        ? FALLBACK_AVATAR_SRC
        : "";

  return (
    <div
      className={cn(
        "flex items-center justify-center overflow-hidden rounded-full border bg-muted/30",
        sizeClassName,
        className,
      )}
    >
      {imageSrc ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={imageSrc}
          alt={alt}
          className="h-full w-full rounded-full object-cover"
          onError={() => {
            setFailedSources((previousSources) => {
              if (previousSources.includes(imageSrc)) {
                return previousSources;
              }

              return [...previousSources, imageSrc];
            });
          }}
        />
      ) : (
        <UserCircle2Icon className="size-2/3 text-muted-foreground/75" />
      )}
    </div>
  );
}
