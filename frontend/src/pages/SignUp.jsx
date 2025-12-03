import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Loader2 } from 'lucide-react';

const SignUp = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [isOver18, setIsOver18] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
    setError('');
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');

    if (!formData.name || !formData.email || !formData.password || !formData.confirmPassword) {
      setError('All fields are required');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    if (!isOver18) {
      setError('You must be 18 years or older to create an account');
      return;
    }

    if (!agreeTerms) {
      setError('You must agree to the Terms & Conditions');
      return;
    }

    localStorage.setItem('signupData', JSON.stringify({
      name: formData.name,
      email: formData.email,
      password: formData.password,
    }));

    navigate('/plans');
  };

  return (
    <div className="min-h-screen bg-white flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <img 
            src="/logo.webp" 
            alt="Outbound Impact" 
            className="w-45 h-24 mx-auto mb-4 animate-pulse-slow"
            onError={(e) => { e.target.style.display = 'none'; }}
          />
          <h1 className="text-4xl font-bold text-primary mb-2">
            Create Account
          </h1>
          <p className="text-secondary">
            Join Outbound Impact today
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-2xl p-8 border border-gray-100">
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-600 text-sm">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Full Name
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                placeholder="John Doe"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Email Address
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                placeholder="john@example.com"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Password
              </label>
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                placeholder="••••••••"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Confirm Password
              </label>
              <input
                type="password"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                placeholder="••••••••"
              />
            </div>

            <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
              <input
                type="checkbox"
                id="age-verification"
                checked={isOver18}
                onChange={(e) => setIsOver18(e.target.checked)}
                className="mt-1 w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary cursor-pointer"
              />
              <label htmlFor="age-verification" className="text-sm text-gray-700 cursor-pointer">
                I confirm that I am <span className="font-semibold">18 years or older</span>
              </label>
            </div>

            <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
              <input
                type="checkbox"
                id="terms"
                checked={agreeTerms}
                onChange={(e) => setAgreeTerms(e.target.checked)}
                className="mt-1 w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary cursor-pointer"
              />
              <label htmlFor="terms" className="text-sm text-gray-700 cursor-pointer">
                I agree to the{' '}
                <a
                  href="https://outboundimpact.org/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary font-semibold underline hover:text-secondary transition-colors"
                >
                  Terms & Conditions
                </a>
              </label>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full gradient-btn text-white py-3 rounded-lg font-semibold text-lg flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <Loader2 className="animate-spin" size={20} />
                  Processing...
                </>
              ) : (
                'Continue to Plans'
              )}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-gray-600">
              Already have an account?{' '}
              <Link to="/signin" className="text-primary font-semibold hover:text-secondary transition-colors">
                Sign In
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SignUp;