import { useState } from 'react';
import { useAuth } from './AuthContext';
import Register from './Register';

function Login() {
    const { login } = useAuth();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showLogin, setShowLogin] = useState(true);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    async function handleLoginSubmit(e) {
        e.preventDefault();
        setError('');
        setLoading(true);
        const message = await login(email.trim(), password);
        // On success this screen is replaced, so only reset on failure.
        if (message) {
            setError(message);
            setLoading(false);
        }
    }

    function handleToggle() {
        setError('');
        setShowLogin(!showLogin);
    }

    return (
        <div className="login-container">
            <div className="login-card">
                {showLogin ? (
                    <>
                        <div className="top-form">Please Login!</div>
                        <form onSubmit={handleLoginSubmit}>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="Email"
                                autoComplete="email"
                                required
                            />
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="Password"
                                autoComplete="current-password"
                                required
                            />
                            {error && <div className="error-message">{error}</div>}
                            <button type="submit" disabled={loading}>
                                {loading ? 'Logging in...' : 'Login'}
                            </button>
                        </form>
                        <div className="bottom-form">
                            Don&apos;t have an account? Sign up{' '}
                            <span onClick={handleToggle}>here</span>
                        </div>
                    </>
                ) : (
                    <>
                        <Register />
                        <div className="bottom-form">
                            Already have an account? Login{' '}
                            <span onClick={handleToggle}>here</span>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}

export default Login;
