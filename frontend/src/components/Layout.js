import { useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import TopNavbar from './TopNavbar';

export default function Layout({ children }) {
  const { pathname } = useLocation();

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <TopNavbar />
      <main className="ml-64 pt-24 pb-12 px-10 min-h-screen flex-1">
        {/*
          Key on pathname causes React to remount this div on every navigation,
          triggering the page-enter CSS animation defined in index.html / global CSS.
        */}
        <div key={pathname} className="max-w-7xl mx-auto page-enter">
          {children}
        </div>
      </main>
    </div>
  );
}
