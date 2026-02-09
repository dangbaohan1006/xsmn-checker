import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
    title: 'Dò Số Miền Nam - XSMN Checker',
    description: 'Ứng dụng dò kết quả xổ số miền Nam nhanh chóng, chính xác. Hỗ trợ kiểm tra tất cả các đài xổ số miền Nam.',
    keywords: ['xổ số', 'miền nam', 'XSMN', 'dò số', 'kết quả xổ số'],
    authors: [{ name: 'XSMN Checker' }],
    openGraph: {
        title: 'Dò Số Miền Nam - XSMN Checker',
        description: 'Ứng dụng dò kết quả xổ số miền Nam nhanh chóng, chính xác',
        type: 'website',
        locale: 'vi_VN',
    },
};

export const viewport: Viewport = {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 1,
    userScalable: false,
    themeColor: '#667eea',
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="vi">
            <head>
                <link rel="preconnect" href="https://fonts.googleapis.com" />
                <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
            </head>
            <body className="antialiased">
                <main className="min-h-screen flex flex-col">
                    {children}
                </main>
            </body>
        </html>
    );
}
