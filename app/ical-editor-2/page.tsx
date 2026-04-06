'use client';

import React from 'react';
import BackgroundLayout from '@/components/BackgroundLayout';
import RequireAuth from '@/components/RequireAuth';
import IcalEditor2Panel from '@/components/ical/IcalEditor2Panel';

export default function IcalEditor2Page() {
    return (
        <RequireAuth>
            <BackgroundLayout>
                <IcalEditor2Panel />
            </BackgroundLayout>
        </RequireAuth>
    );
}