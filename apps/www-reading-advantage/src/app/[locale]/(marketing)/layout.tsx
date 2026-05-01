import React from 'react'
import { Header } from '@/components/layout/header';
import Footer from '@/components/common/footer';

type MarketingProps = {
    children: React.ReactNode;
}

export default function MarketingLayout({
    children
}: MarketingProps) {
    return (
        <>
            <Header />
            <div className="flex flex-col min-h-screen animate-in fade-in duration-500">
                <main className="flex-1">
                    {children}
                </main>
                <Footer />
            </div>
        </>
    )
}