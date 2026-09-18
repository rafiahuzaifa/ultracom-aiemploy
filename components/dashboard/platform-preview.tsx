"use client";

import Image from "next/image";
import { Heart, MessageCircle, MoreHorizontal, Repeat2, Send, Share2, ThumbsUp } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

interface PreviewProps {
  brandName: string;
  imageUrl: string;
  caption: string;
  hashtags: string[];
}

function CaptionText({ caption, hashtags }: { caption: string; hashtags: string[] }) {
  return (
    <p className="whitespace-pre-wrap text-sm leading-relaxed">
      {caption}
      {hashtags.length > 0 && (
        <span className="mt-2 block text-primary">{hashtags.map((h) => `#${h.replace(/^#/, "")}`).join(" ")}</span>
      )}
    </p>
  );
}

export function FacebookPreview({ brandName, imageUrl, caption, hashtags }: PreviewProps) {
  return (
    <div className="overflow-hidden rounded-lg border border-line/60 bg-[#0b1830]">
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-2">
          <Avatar className="h-9 w-9">
            <AvatarFallback>{brandName.slice(0, 2).toUpperCase()}</AvatarFallback>
          </Avatar>
          <div>
            <p className="text-sm font-semibold">{brandName}</p>
            <p className="text-xs text-muted-foreground">Sponsored</p>
          </div>
        </div>
        <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
      </div>
      <div className="px-4 pb-3">
        <CaptionText caption={caption} hashtags={hashtags} />
      </div>
      <div className="relative aspect-square w-full bg-black/20">
        <Image src={imageUrl} alt="Ad creative" fill className="object-cover" unoptimized />
      </div>
      <div className="flex items-center justify-around border-t border-line/60 py-2 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5"><ThumbsUp className="h-3.5 w-3.5" /> Like</span>
        <span className="flex items-center gap-1.5"><MessageCircle className="h-3.5 w-3.5" /> Comment</span>
        <span className="flex items-center gap-1.5"><Share2 className="h-3.5 w-3.5" /> Share</span>
      </div>
    </div>
  );
}

export function InstagramPreview({ brandName, imageUrl, caption, hashtags }: PreviewProps) {
  return (
    <div className="overflow-hidden rounded-lg border border-line/60 bg-black">
      <div className="flex items-center gap-2 px-3 py-2.5">
        <Avatar className="h-8 w-8">
          <AvatarFallback>{brandName.slice(0, 2).toUpperCase()}</AvatarFallback>
        </Avatar>
        <p className="text-sm font-semibold">{brandName.toLowerCase().replace(/\s+/g, "")}</p>
        <MoreHorizontal className="ml-auto h-4 w-4" />
      </div>
      <div className="relative aspect-square w-full bg-white/5">
        <Image src={imageUrl} alt="Ad creative" fill className="object-cover" unoptimized />
      </div>
      <div className="flex items-center gap-4 px-3 py-2">
        <Heart className="h-5 w-5" />
        <MessageCircle className="h-5 w-5" />
        <Send className="h-5 w-5" />
      </div>
      <div className="px-3 pb-3">
        <p className="text-sm">
          <span className="font-semibold">{brandName.toLowerCase().replace(/\s+/g, "")}</span>{" "}
          {caption}
        </p>
        {hashtags.length > 0 && (
          <p className="mt-1 text-sm text-primary">{hashtags.map((h) => `#${h.replace(/^#/, "")}`).join(" ")}</p>
        )}
      </div>
    </div>
  );
}

export function LinkedInPreview({ brandName, imageUrl, caption, hashtags }: PreviewProps) {
  return (
    <div className="overflow-hidden rounded-lg border border-line/60 bg-[#0b1830]">
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-2">
          <Avatar className="h-9 w-9">
            <AvatarFallback>{brandName.slice(0, 2).toUpperCase()}</AvatarFallback>
          </Avatar>
          <div>
            <p className="text-sm font-semibold">{brandName}</p>
            <p className="text-xs text-muted-foreground">Promoted</p>
          </div>
        </div>
        <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
      </div>
      <div className="px-4 pb-3">
        <CaptionText caption={caption} hashtags={hashtags} />
      </div>
      <div className="relative aspect-square w-full bg-black/20">
        <Image src={imageUrl} alt="Ad creative" fill className="object-cover" unoptimized />
      </div>
      <div className="flex items-center justify-around border-t border-line/60 py-2 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5"><ThumbsUp className="h-3.5 w-3.5" /> Like</span>
        <span className="flex items-center gap-1.5"><MessageCircle className="h-3.5 w-3.5" /> Comment</span>
        <span className="flex items-center gap-1.5"><Repeat2 className="h-3.5 w-3.5" /> Repost</span>
      </div>
    </div>
  );
}
