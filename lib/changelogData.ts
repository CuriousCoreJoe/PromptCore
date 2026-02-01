interface ChangelogEntry {
    version: string;
    date: string;
    changes: string[];
}

export const changelogData: ChangelogEntry[] = [
    {
        version: '0.5.0',
        date: '2026-01-30',
        changes: [
            'Added Command Palette (Cmd+K) for quick navigation and actions.',
            'Introduced Theme Customization: Change fonts, background images, and mode colors.',
            'Added Changelog to view version history.',
            'Implemented Feedback Board allow users to submit ideas and bugs.',
            'Added Waitlist functionality for public landing page.'
        ]
    },
    {
        version: '0.4.0',
        date: '2026-01-28',
        changes: [
            'Refactored Middleware for improved performance and error handling.',
            'Fixed blank screen issues on mobile devices.',
            'Enhanced error reporting for better debugging.'
        ]
    },
    {
        version: '0.3.0',
        date: '2026-01-20',
        changes: [
            'Added "Prompt Factory" for batch processing prompts.',
            'Integrated Stripe for subscription management.',
            'Implemented user profiles and credit system.'
        ]
    }
];
