"use client";

import { useState, useCallback } from "react";

interface YouTubeLazyProps {
    videoId: string;
    title: string;
    className?: string;
}

/**
 * Lazy-loading YouTube embed. Shows a thumbnail + play button.
 * Only loads the full YouTube iframe when clicked.
 * Saves ~1MB+ of JS/CSS per embed on initial page load.
 */
export function YouTubeLazy({ videoId, title, className = "" }: YouTubeLazyProps) {
    const [loaded, setLoaded] = useState(false);

    const handleClick = useCallback(() => {
        setLoaded(true);
    }, []);

    if (loaded) {
        return (
            <iframe
                className={`w-full h-full ${className}`}
                src={`https://www.youtube.com/embed/${videoId}?rel=0&autoplay=1`}
                title={title}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
            />
        );
    }

    return (
        <button
            onClick={handleClick}
            className={`w-full h-full relative group cursor-pointer bg-black ${className}`}
            aria-label={`Play: ${title}`}
        >
            {/* YouTube thumbnail */}
            <img
                src={`https://img.youtube.com/vi/${videoId}/hqdefault.jpg`}
                alt={title}
                className="w-full h-full object-cover"
                loading="lazy"
            />
            {/* Dark overlay */}
            <div className="absolute inset-0 bg-black/30 group-hover:bg-black/10 transition-colors" />
            {/* Play button */}
            <div className="absolute inset-0 flex items-center justify-center">
                <div className="h-14 w-14 sm:h-16 sm:w-16 bg-red-600 rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                    <svg className="h-7 w-7 text-white ml-1" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M8 5v14l11-7z" />
                    </svg>
                </div>
            </div>
        </button>
    );
}
