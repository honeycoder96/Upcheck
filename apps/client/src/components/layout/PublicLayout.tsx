import type { ReactNode } from 'react';
import Navbar from './Navbar';
import Footer from './Footer';

interface PublicLayoutProps {
  children: ReactNode;
}

export default function PublicLayout({ children }: PublicLayoutProps) {
  return (
    <div className="flex flex-col min-h-screen bg-background">
      <Navbar showLogout={false} />
      <main className="flex-1 p-6">{children}</main>
      <Footer />
    </div>
  );
}
