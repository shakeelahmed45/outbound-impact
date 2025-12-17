import { useNavigate } from 'react-router-dom';
import { ShieldAlert } from 'lucide-react';
import DashboardLayout from '../dashboard/DashboardLayout';     // ✅ FIXED
import useAuthStore, { canEdit } from '../../store/authStore';  // ✅ FIXED

const RequireEditAccess = ({ children }) => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const hasEditAccess = canEdit();

  if (hasEditAccess) {
    return children;
  }

  return (
    <DashboardLayout>
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center max-w-md">
          <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <ShieldAlert size={40} className="text-red-600" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            Access Restricted
          </h1>
          <p className="text-gray-600 mb-2">
            <strong>Your role: {user?.teamRole}</strong>
          </p>
          <p className="text-gray-600 mb-6">
            You don't have permission to upload or edit content. 
            {user?.isTeamMember && (
              <> Please contact <strong>{user.organization.name}</strong> if you need editor or admin access.</>
            )}
          </p>
          <button
            onClick={() => navigate('/dashboard')}
            className="gradient-btn text-white px-6 py-3 rounded-lg font-semibold"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default RequireEditAccess;