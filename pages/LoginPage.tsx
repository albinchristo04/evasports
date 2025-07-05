
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '../AppContext';
import Input from '../components/common/Input';
import Button from '../components/common/Button';
import { PlayCircleIcon } from '../components/icons';

const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login, session } = useAppContext();
  const navigate = useNavigate();

  // Redirect if user is already logged in
  useEffect(() => {
    if (session) {
      navigate('/admin/dashboard', { replace: true });
    }
  }, [session, navigate]);


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      await login(email, password);
      navigate('/admin/dashboard');
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-darker flex flex-col justify-center items-center p-4">
      <div className="w-full max-w-md mx-auto">
        <div className="text-center mb-8">
            <PlayCircleIcon className="h-12 w-12 mx-auto text-accent" />
            <h1 className="mt-4 text-3xl font-bold text-neutral-text">Admin Panel Login</h1>
            <p className="text-gray-400">Please sign in to continue</p>
        </div>

        <div className="bg-neutral-dark p-8 rounded-2xl shadow-2xl">
          <form onSubmit={handleSubmit} className="space-y-6">
            <Input
              id="email"
              label="Email Address"
              type="email"
              name="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
            <Input
              id="password"
              label="Password"
              type="password"
              name="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
            />

            {error && <p className="text-sm text-red-400 text-center">{error}</p>}

            <div>
              <Button
                type="submit"
                variant="primary"
                className="w-full"
                isLoading={isLoading}
              >
                Sign In
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
