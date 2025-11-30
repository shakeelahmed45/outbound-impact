import DashboardHeader from './DashboardHeader';
import BottomNav from './BottomNav';

const DashboardLayout = ({ children }) => {
  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <DashboardHeader />
      <main className="container mx-auto px-4 py-6 max-w-7xl">
        {children}
      </main>
      <BottomNav />
    </div>
  );
};

export default DashboardLayout;
