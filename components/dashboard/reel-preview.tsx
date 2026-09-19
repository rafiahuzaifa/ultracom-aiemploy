"use client";

import Image from "next/image";
import { Clapperboard, Film } from "lucide-react";
import type { ReelScript } from "@/lib/ai/types";
import { Badge } from "@/components/ui/badge";

export function ReelPreview({ coverImageUrl, script }: { coverImageUrl: string | null; script: ReelScript }) {
  return (
    <div className="overflow-hidden rounded-lg border border-line/60 bg-black">
      <div className="relative aspect-[9/16] max-h-96 w-full bg-white/5">
        {coverImageUrl && (
          <Image src={coverImageUrl} alt="Reel cover" fill className="object-cover" unoptimized />
        )}
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 to-transparent p-3">
          <Badge variant="secondary" className="mb-1.5">
            <Film className="mr-1 h-3 w-3" /> Reel concept
          </Badge>
          <p className="text-sm font-semibold text-white">{script.hook}</p>
        </div>
      </div>
      <div className="space-y-3 px-3 py-3">
        <div>
          <p className="mb-1 flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
            <Clapperboard className="h-3.5 w-3.5" /> Scene breakdown
          </p>
          <ol className="space-y-2">
            {script.scenes.map((scene, i) => (
              <li key={i} className="rounded-md border border-line/60 bg-secondary/20 p-2 text-xs">
                <span className="font-semibold text-foreground">
                  Scene {i + 1} ({scene.durationSeconds}s):{" "}
                </span>
                <span className="text-muted-foreground">{scene.description}</span>
                <p className="mt-0.5 italic text-muted-foreground">Visual: {scene.visual}</p>
              </li>
            ))}
          </ol>
        </div>
        <div>
          <p className="mb-1 text-xs font-semibold text-muted-foreground">Full script</p>
          <p className="whitespace-pre-wrap text-xs text-muted-foreground">{script.fullScript}</p>
        </div>
      </div>
    </div>
  );
}
