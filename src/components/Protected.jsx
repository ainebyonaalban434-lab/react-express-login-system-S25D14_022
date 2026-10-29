import { useAuth } from './AuthContext';

function Protected() {
    const { user, logout } = useAuth();

    return (
        <div className="user-container">
            <div className="user-info">
                <h2>Welcome, {user.name}!</h2>
                <p>{user.email}</p>
                <button className="logout-button" onClick={logout}>Logout</button>
            </div>
        </div>
    );
}

export default Protected;
