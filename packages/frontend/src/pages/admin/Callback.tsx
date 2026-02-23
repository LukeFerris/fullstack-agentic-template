import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';

/**
 * OAuth callback page
 * Handles the redirect from Cognito after login
 * @returns Rendered callback page
 */
export default function Callback(): React.ReactNode {
  const navigate = useNavigate();
  const { setToken } = useAuth();

  useEffect(() => {
    try {
      // Extract token from URL hash
      // Cognito returns: #id_token=xxx&access_token=yyy&...
      const hash = window.location.hash.substring(1);
      const params = new URLSearchParams(hash);
      const idToken = params.get('id_token');

      if (idToken) {
        // Store token
        setToken(idToken);

        // Redirect to admin dashboard
        navigate('/admin', { replace: true });
      } else {
        // No token found, redirect to login
        console.error('No id_token in callback URL');
        navigate('/', { replace: true });
      }
    } catch (error) {
      console.error('Error processing callback:', error);
      navigate('/', { replace: true });
    }
  }, [navigate, setToken]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Completing login...</p>
      </div>
    </div>
  );
}
