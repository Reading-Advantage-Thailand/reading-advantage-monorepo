import React from 'react'
import { siteConfig } from '@/configs/site-config'
import Link from 'next/link'
import { Icons } from '@/components/icons'

type Props = {
    children: React.ReactNode,
}

export default function AuthLayout({
    children,
}: Props) {
    return (
        <>
            <div className="container py-6 md:py-16">
                <div
                    className="lg:border-solid lg:border lg:rounded-lg bg-slate-50 dark:bg-background" >
                    <div
                        className="relative h-[800px] flex-col items-center justify-center grid lg:max-w-none lg:grid-cols-2 lg:px-0"
                    >
                        <div
                            className="relative hidden h-full flex-col bg-muted p-10 text-white dark:border-r lg:flex">
                            <div className="absolute inset-0 bg-zinc-900"
                                style={{
                                    backgroundImage: `url('https://storage.googleapis.com/artifacts.reading-advantage.appspot.com/article-images/3OdR9eoaNqmHfxV3KnHW.png')`,
                                    backgroundSize: 'cover',
                                    backgroundPosition: 'center',
                                    opacity: 0.5,
                                    backgroundRepeat: 'no-repeat',
                                    borderRadius: '10px 0px 0px 10px',
                                }}
                            />
                            <Link
                                href='/'
                                className='flex items-center space-x-2 drop-shadow-md'
                            >
                                <Icons.logo />
                                <div className="relative z-20 flex items-center text-lg drop-shadow-lg font-bold">
                                    {siteConfig.name}
                                </div>
                            </Link>
                            <div className="relative z-20 mt-auto">
                                <p className="text-lg drop-shadow-lg">
                                    {siteConfig.description}
                                </p>
                            </div>
                        </div>
                        {children}
                    </div>
                </div >
            </div >
        </>
    )
}