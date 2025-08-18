import { ReactNode } from "react";
import Header from "./header";
import Footer from "./footer";
import Sidebar from "./sidebar";

interface MainLayoutProps {
  children: ReactNode;
  showSidebar?: boolean;
}

export default function MainLayout({ children, showSidebar = true }: MainLayoutProps) {
  return (
    <div className="min-h-screen bg-slate-50 flex">
      {showSidebar && <Sidebar />}
      <div className="flex-1 flex flex-col">
        <Header />
        <main className="flex-1">
          {children}
        </main>
        <Footer />
      </div>
    </div>
  );
}