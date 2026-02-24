import { useNavigate } from 'react-router-dom';
import { ShieldAlert } from 'lucide-react';
import DashboardLayout from '../dashboard/DashboardLayout';
import useAuthStore, { hasFeature } from '../../store/authStore';

/**
 * RequireFeature — Route-level guard for feature-based access control.
 * Wraps a page component and blocks access if the team member doesn't have
 * the required feature in their allowedFeatures array.
 * 
 * Usage in App.jsx:
 *   <RequireFeature feature="uploads"><UploadPage /></RequireFeature>
 * 
 * - Account owners: always pass through
 * - ADMIN team members: always pass through
 * - VIEWER/EDITOR: only pass if feature is in their allowedFeatures
 * - allowedFeatures=null (existing members): pass through (backward compatible)
 */
const RequireFeature = ({ feature, children }) => {
  const navigate = useNavigate();
  const { user } = useAuthStore();

  // hasFeature handles all the logic:
  // - not team member = true
  // - ADMIN = true  
  // - allowedFeatures null = true (backward compatible)
  // - allowedFeatures array = checks if feature is included
  if (hasFeature(feature)) {
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
            <strong>Your role: {user?.teamRole || 'Member'}</strong>
          </p>
          <p className="text-gray-600 mb-6">
            You don't have access to this feature.
            {user?.isTeamMember && (
              <> Please contact <strong>{user.organization?.name}</strong> to request access.</>
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

export default RequireFeature;
