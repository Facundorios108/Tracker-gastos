import { useState } from 'react';
import { auth } from '../firebaseConfig';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { Mail, Lock, ChevronRight } from 'lucide-react';
import './Login.css';

export default function Login() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        await createUserWithEmailAndPassword(auth, email, password);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <div className="login-page">
      <div className="login-background">
        <div className="blob blob-1"></div>
        <div className="blob blob-2"></div>
        <div className="blob blob-3"></div>
      </div>

      <div className="login-container animate-fade-in">
        <div className="login-glass-card">
          <div className="login-glass-card__header">
            <div className="brand-logo bounce-effect">
              <img src="/logo.svg" alt="My Wallet Logo" style={{ width: '100%', height: '100%', borderRadius: '24px' }} />
            </div>
            <h1 className="brand-name">My wallet</h1>
            <p className="brand-tagline">Tu libertad financiera comienza aquí</p>
          </div>

          <div className="auth-toggle">
            <div className={`auth-toggle__indicator ${isLogin ? 'left' : 'right'}`} />
            <button 
              className={`auth-toggle__btn ${isLogin ? 'active' : ''}`}
              onClick={() => setIsLogin(true)}
              type="button"
            >
              Ingresar
            </button>
            <button 
              className={`auth-toggle__btn ${!isLogin ? 'active' : ''}`}
              onClick={() => setIsLogin(false)}
              type="button"
            >
              Registro
            </button>
          </div>

          {error && (
            <div className="login-error-message animate-shake">
              {error}
            </div>
          )}

          <form className="login-premium-form" onSubmit={handleSubmit}>
            <div className="premium-input-group">
              <div className="premium-input-wrapper">
                <Mail size={18} className="input-icon" />
                <input 
                  type="email" 
                  value={email} 
                  onChange={(e) => setEmail(e.target.value)} 
                  placeholder="Correo electrónico"
                  required 
                />
              </div>
            </div>

            <div className="premium-input-group">
              <div className="premium-input-wrapper">
                <Lock size={18} className="input-icon" />
                <input 
                  type="password" 
                  value={password} 
                  onChange={(e) => setPassword(e.target.value)} 
                  placeholder="Contraseña"
                  required 
                />
              </div>
            </div>

            <button type="submit" className="login-premium-submit bounce-effect" disabled={loading}>
              {loading ? (
                <span className="loader-mini"></span>
              ) : (
                <>
                  {isLogin ? 'Acceder al Panel' : 'Crear Mi Cuenta'}
                  <ChevronRight size={20} />
                </>
              )}
            </button>
          </form>

          <div className="premium-divider">
            <span>O continúa con</span>
          </div>

          <button className="google-premium-btn bounce-effect" onClick={handleGoogleSignIn} type="button">
            <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" />
            <span>Google Account</span>
          </button>

          <div className="login-premium-footer">
            <p>© 2026 My wallet</p>
            <p className="legal-text">By continuing, you agree to our Terms and Privacy Policy.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

