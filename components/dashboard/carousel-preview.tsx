"use client";

import { useState } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { PostMedia } from "@prisma/client";
import type { Localized } from "@/lib/ai/types";

export function CarouselPreview({ slides }: { slides: PostMedia[] }) {
  const [index, setIndex] = useState(0);
  if (slides.length === 0) return null;
  const slide = slides[index];
  const caption = (slide.caption ?? {}) as Localized;

  return (
    <div className="overflow-hidden rounded-lg border border-line/60 bg-black">
      <div className="relative aspect-square w-full bg-white/5">
        {slide.imageUrl && (
          <Image src={slide.imageUrl} alt={`Slide ${index + 1}`} fill className="object-cover" unoptimized />
        )}
        {slides.length > 1 && (
          <>
            <button
              className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-black/50 p-1.5 text-white hover:bg-black/70"
              onClick={() => setIndex((i) => (i === 0 ? slides.length - 1 : i - 1))}
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-black/50 p-1.5 text-white hover:bg-black/70"
              onClick={() => setIndex((i) => (i === slides.length - 1 ? 0 : i + 1))}
            >
              <ChevronRight className="h-4 w-4" />
            </button>
            <div className="absolute bottom-2 left-1/2 flex -translate-x-1/2 gap-1.5">
              {slides.map((s, i) => (
                <span
                  key={s.id}
                  className={`h-1.5 w-1.5 rounded-full ${i === index ? "bg-white" : "bg-white/40"}`}
                />
              ))}
            </div>
          </>
        )}
      </div>
      <div className="space-y-1 px-3 py-2.5">
        <p className="text-xs font-semibold text-muted-foreground">
          Slide {index + 1} of {slides.length}
        </p>
        {caption.en && <p className="text-sm">{caption.en}</p>}
        {caption.ur && (
          <p className="text-sm" dir="rtl">
            {caption.ur}
          </p>
        )}
      </div>
    </div>
  );
}
