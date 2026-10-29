import { useEffect, useState } from 'react';
import { useAuth } from './components/AuthContext';
import api from './api';
import Login from './components/Login';
import Protected from './components/Protected';
import Footer from './components/Footer';
import './App.css';

function App() {
  const { user, setUser } = useAuth();
  const [loading, setLoading] = useState(true);

  // Ask the server if there is already a logged-in session.
  useEffect(() => {
    async function fetchProfile() {
      try {
        const response = await api.get('/profile');
        setUser(response.data && response.data.email ? response.data : null);
      } catch (error) {
        console.error('Could not check the session:', error);
        setUser(null);
      } finally {
        setLoading(false);
      }
    }

    fetchProfile();
  }, [setUser]);

  if (loading) {
    return (
      <>
        <div className="login-container">
          <p className="loading-text">Loading... the server may take a moment to wake up.</p>
        </div>
        <Footer />
      </>
    );
  }

  return (
    <>
      {user ? <Protected /> : <Login />}
      <Footer />
    </>
  );
}

export default App;
