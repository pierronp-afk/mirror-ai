import { useState } from 'react';

interface AnalysisTextProps {
    text: string;
    maxLength?: number;
}

/**
 * Component to display analysis text with truncation and "Read more" functionality
 * Prevents text overflow in stock cards
 */
export function AnalysisText({ text, maxLength = 200 }: AnalysisTextProps) {
    const [expanded, setExpanded] = useState(false);
    const needsTruncation = text.length > maxLength;

    const displayText = expanded || !needsTruncation
        ? text
        : text.substring(0, maxLength) + '...';

    return (
        <div className="analysis-text">
            <p className="text-sm text-gray-700 leading-relaxed">{displayText}</p>
            {needsTruncation && (
                <button
                    onClick={() => setExpanded(!expanded)}
                    className="text-blue-600 hover:text-blue-800 text-xs mt-1 font-medium transition-colors"
                >
                    {expanded ? '▲ Show less' : '▼ Read more'}
                </button>
            )}
        </div>
    );
}
