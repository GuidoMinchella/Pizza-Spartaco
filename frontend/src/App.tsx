import { useState, useEffect } from 'react';
import { CartProvider } from './context/CartContext';
import { apiUrl } from './lib/api';
import Header from './components/Header';
import Footer from './components/Footer';
import CookieConsent from './components/CookieConsent';
import SiteTopMessage from './components/SiteTopMessage';
import LoginRegisterPage from './pages/LoginRegisterPage';
import LoginForm from './components/LoginForm';
import ForgotPasswordForm from './components/ForgotPasswordForm';
import HomePage from './pages/HomePage';
import MenuPage from './pages/MenuPage';
import AboutPage from './pages/AboutPage';
import CartPage from './pages/CartPage';
import ContactPage from './pages/ContactPage';
import RegisterPage from './pages/RegisterPage';
import RegisterForm from './components/RegisterForm';
import AreaPersonalePage from './pages/AreaPersonalePage';
import AdminPage from './pages/AdminPage';
import PrivacyPage from './pages/PrivacyPage';

function App() {
  const [currentPage, setCurrentPage] = useState(() => {
    const path = window.location.pathname;
    if (path === '/menu') return 'menu';
    if (path === '/chisiamo') return 'about';
    if (path === '/contatti') return 'contact';
    if (path === '/carrello') return 'cart';
    if (path === '/loginregister') return 'loginregister';
    if (path === '/register') return 'register';
    if (path === '/areapersonale') return 'areapersonale';
    if (path === '/admin') return 'admin';
    if (path === '/Privacy' || path === '/privacy') return 'privacy';
    return 'home';
  });
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [authOverlayPage, setAuthOverlayPage] = useState<'login' | 'register' | 'login_success' | 'forgot' | null>(null);
  const [loginSuccessMessage, setLoginSuccessMessage] = useState<string | null>(null);
  const [loginErrorMessage, setLoginErrorMessage] = useState<string | null>(null);
  const [overlayHistoryDepth, setOverlayHistoryDepth] = useState(0);
  const [currentUser, setCurrentUser] = useState<{ id: string; first_name: string; last_name: string; email: string; is_admin?: boolean } | null>(null);

  // Funzioni di integrazione backend
  const registerUser = async (payload: { firstName: string; lastName: string; email: string; password: string }) => {
    try {
      const resp = await fetch(apiUrl('auth/register'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const json = await resp.json();
      if (!json.ok) {
        alert(`Errore registrazione: ${json.error || 'Operazione fallita'}`);
      }
      // Nessuna chiusura overlay: RegisterForm gestisce la card di successo
    } catch (e: any) {
      alert(`Errore di rete: ${e.message}`);
    }
  };

  // Accesso automatico dopo registrazione: autentica l’utente senza chiudere l’overlay
  const autoLoginAfterRegister = async (email: string, password: string) => {
    const resp = await fetch(apiUrl('auth/login'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const json = await resp.json();
    if (json.ok) {
      const user = json.user;
      setCurrentUser(user);
      try { localStorage.setItem('currentUser', JSON.stringify(user)); } catch {}
    } else {
      throw new Error(json.error || 'Accesso automatico non riuscito');
    }
  };

  const loginUser = async (email: string, password: string) => {
    try {
      const resp = await fetch(apiUrl('auth/login'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const json = await resp.json();
      if (json.ok) {
        const user = json.user;
        setCurrentUser(user);
        try {
          localStorage.setItem('currentUser', JSON.stringify(user));
        } catch {}
        // Mostra card di benvenuto nel pannello di accesso
        setAuthOverlayPage('login_success');
        setLoginErrorMessage(null);
      } else {
        // Mostra l'errore nella card Accedi
        setAuthOverlayPage('login');
        setLoginErrorMessage('Email o Password sbagliate');
      }
    } catch (e: any) {
      setAuthOverlayPage('login');
      setLoginErrorMessage('Errore di rete, riprova');
    }
  };

  // Mappa tra id pagina e path URL desiderato
  const pageToPath = (page: string) => {
    switch (page) {
      case 'home':
        return '/';
      case 'menu':
        return '/menu';
      case 'about':
        return '/chisiamo';
      case 'contact':
        return '/contatti';
      case 'cart':
        return '/carrello';
      case 'loginregister':
        return '/loginregister';
      case 'register':
        return '/Register';
      case 'areapersonale':
        return '/areapersonale';
      case 'admin':
        return '/admin';
      case 'privacy':
        return '/Privacy';
      default:
        return '/';
    }
  };

  const pathToPage = (path: string) => {
    switch (path) {
      case '/':
        return 'home';
      case '/menu':
        return 'menu';
      case '/chisiamo':
        return 'about';
      case '/contatti':
        return 'contact';
      case '/carrello':
        return 'cart';
      case '/loginregister':
        return 'loginregister';
      case '/Register':
        return 'register';
      case '/areapersonale':
        return 'areapersonale';
      case '/admin':
        return 'admin';
      case '/Privacy':
      case '/privacy':
        return 'privacy';
      default:
        return 'home';
    }
  };

  const handleNavigate = (page: string) => {
    const path = pageToPath(page);
    window.history.pushState({ page }, '', path);
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
    // Se la pagina ha un contenitore scroll interno (Menu), portalo al top
    if (page === 'menu') {
      try {
        setTimeout(() => {
          const el = document.getElementById('menu-scroll-container');
          if (el) {
            (el as HTMLElement).scrollTo({ top: 0, behavior: 'smooth' });
          }
        }, 0);
      } catch {}
    }
  };

  useEffect(() => {
    // Imposta la pagina iniziale in base al path
    const initialPage = pathToPage(window.location.pathname);
    setCurrentPage(initialPage);
    // Carica eventuale stato utente salvato
    try {
      const saved = localStorage.getItem('currentUser');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.id) setCurrentUser(parsed);
      }
    } catch {}
    // Gestione ritorno da Google OAuth: se presente query, imposta currentUser
    const params = new URLSearchParams(window.location.search);
    const googleLogin = params.get('googleLogin');
    const emailParam = params.get('email');
    const idParam = params.get('id');
    if (googleLogin === '1' && (emailParam || idParam)) {
      (async () => {
        try {
          const endpoint = idParam
            ? apiUrl(`auth/user?id=${encodeURIComponent(idParam)}`)
            : apiUrl(`auth/user?email=${encodeURIComponent(emailParam!)}`);
          const resp = await fetch(endpoint);
          const json = await resp.json();
          if (json.ok) {
            setCurrentUser(json.user);
            try {
              localStorage.setItem('currentUser', JSON.stringify(json.user));
            } catch {}
          }
        } catch (e) {
          // Ignora errori di rete per ora
        } finally {
          // Pulisci la query dall'URL mantenendo il path corrente
          const url = new URL(window.location.href);
          url.searchParams.delete('googleLogin');
          url.searchParams.delete('id');
          url.searchParams.delete('email');
          window.history.replaceState({ page: initialPage }, '', url.pathname + (url.searchParams.toString() ? `?${url.searchParams.toString()}` : ''));
        }
      })();
    }

    // Fallback: Supabase può reindirizzare al frontend con access_token nel fragment (#)
    // Se googleLogin=0 ma è presente access_token, completiamo il login chiamando il backend
    const hash = window.location.hash || '';
    if (googleLogin === '0' && hash.includes('access_token=')) {
      const hashParams = new URLSearchParams(hash.replace(/^#/, ''));
      const accessToken = hashParams.get('access_token');
      if (accessToken) {
        (async () => {
          try {
            const resp = await fetch(apiUrl('auth/google/complete'), {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ access_token: accessToken }),
            });
            const json = await resp.json();
            if (json.ok) {
              setCurrentUser(json.user);
              try { localStorage.setItem('currentUser', JSON.stringify(json.user)); } catch {}
              // Pulisci query e fragment
              const url = new URL(window.location.href);
              url.searchParams.delete('googleLogin');
              url.searchParams.delete('id');
              url.searchParams.delete('email');
              url.hash = '';
              window.history.replaceState({ page: initialPage }, '', url.pathname + (url.search ? url.search : ''));
            }
          } catch {
            // Ignora
          }
        })();
      }
    }
  }, []);

  useEffect(() => {
    // Gestisce back/forward del browser
    const onPopState = () => {
      const page = pathToPage(window.location.pathname);
      setCurrentPage(page);
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  useEffect(() => {
    document.title = 'Pizza Spartaco - Pizza al taglio artigianale';
  }, []);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeOverlay();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [overlayHistoryDepth]);

  const openRegisterOverlay = () => {
    window.history.pushState({ page: 'register' }, '', '/register');
    setAuthOverlayPage('register');
    setOverlayHistoryDepth((d) => d + 1);
    setShowLoginModal(true);
    setLoginErrorMessage(null);
  };

  const openLoginOverlay = () => {
    window.history.pushState({ page: 'loginregister' }, '', '/loginregister');
    setAuthOverlayPage('login');
    setOverlayHistoryDepth((d) => d + 1);
    setShowLoginModal(true);
    setLoginErrorMessage(null);
  };

  const openForgotOverlay = () => {
    window.history.pushState({ page: 'passworddimenticata' }, '', '/passworddimenticata');
    setAuthOverlayPage('forgot');
    setOverlayHistoryDepth((d) => d + 1);
    setShowLoginModal(true);
  };

  const closeOverlay = () => {
    setShowLoginModal(false);
    setAuthOverlayPage(null);
    setLoginSuccessMessage(null);
    setLoginErrorMessage(null);
    if (overlayHistoryDepth > 0) {
      window.history.go(-overlayHistoryDepth);
      setOverlayHistoryDepth(0);
    }
  };


  // Logout: rimuove l'utente e torna alla Home
  const logout = () => {
    setCurrentUser(null);
    try {
      localStorage.removeItem('currentUser');
    } catch {}
    handleNavigate('home');
  };

  const renderPage = () => {
    switch (currentPage) {
      case 'home':
        return <HomePage onNavigate={handleNavigate} />;
      case 'menu':
        return <MenuPage onNavigate={handleNavigate} />;
      case 'about':
        return <AboutPage onNavigate={handleNavigate} />;
      case 'cart':
        return <CartPage onNavigate={handleNavigate} onOpenRegisterModal={openRegisterOverlay} isLoggedIn={!!currentUser} />;
      case 'contact':
        return <ContactPage />;
      case 'loginregister':
        return <LoginRegisterPage />;
      case 'register':
        return <RegisterPage />;
      case 'areapersonale':
        return <AreaPersonalePage userId={currentUser?.id || ''} onNavigate={handleNavigate} onLogout={logout} />;
      case 'admin':
        return <AdminPage userId={currentUser?.id || ''} isAdmin={!!currentUser?.is_admin} onNavigate={handleNavigate} />;
      case 'privacy':
        return <PrivacyPage />;
      default:
        return <HomePage onNavigate={handleNavigate} />;
    }
  };

  return (
    <CartProvider>
      <div className="min-h-screen bg-black text-white">
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-primary-orange focus:text-white focus:rounded-lg"
        >
          Salta al contenuto principale
        </a>
        <Header currentPage={currentPage} isLoggedIn={!!currentUser} onNavigate={handleNavigate} onOpenLoginModal={() => {
          window.history.pushState({ page: 'loginregister' }, '', '/loginregister');
          setAuthOverlayPage('login');
          setOverlayHistoryDepth(1);
          setShowLoginModal(true);
          setLoginErrorMessage(null);
        }} />
        {/* Messaggio che scende da sotto la navbar: visibile solo se utente non autenticato */}
        {!currentUser && (
          <SiteTopMessage onOpenRegister={openRegisterOverlay} />
        )}
        <main
          id="main-content"
          className={`${['home', 'menu', 'cart', 'contact', 'about'].includes(currentPage) ? 'pt-0' : 'pt-28 md:pt-28'}`}
        >
          {renderPage()}
        </main>
        {currentPage !== 'loginregister' && currentPage !== 'register' && currentPage !== 'cart' && (
          <Footer onNavigate={handleNavigate} />
        )}
        {/* Cookie consent banner, fixed bottom-left */}
        <CookieConsent />
        {showLoginModal && (
          <div
            className="fixed inset-0 z-[60] flex items-center justify-center"
            style={{ backgroundColor: 'rgba(128, 128, 128, 0.5)' }}
            aria-modal="true"
            role="dialog"
            onClick={closeOverlay}
          >
            <div className="login-ui w-full max-w-md mx-4" onClick={(e) => e.stopPropagation()}>
              {authOverlayPage === 'register' ? (
                <RegisterForm
                  onSubmit={registerUser}
                  onNavigateLogin={openLoginOverlay}
                  onClose={closeOverlay}
                  onNavigateMenu={() => {
                    // Chiudi l'overlay SENZA toccare la history e vai al menù
                    setShowLoginModal(false);
                    setAuthOverlayPage(null);
                    setOverlayHistoryDepth(0);
                    handleNavigate('menu');
                  }}
                  onAutoLogin={autoLoginAfterRegister}
                />
              ) : authOverlayPage === 'login' ? (
                <LoginForm onNavigateRegister={openRegisterOverlay} onSubmit={loginUser} onNavigateForgot={openForgotOverlay} successMessage={loginSuccessMessage || undefined} errorMessage={loginErrorMessage || undefined} />
              ) : authOverlayPage === 'forgot' ? (
                <ForgotPasswordForm
                  onClose={closeOverlay}
                  onResetCompleted={(msg) => {
                    setLoginSuccessMessage(msg);
                    setAuthOverlayPage('login');
                  }}
                />
              ) : authOverlayPage === 'login_success' ? (
                <div
                  className="w-full rounded-xl overflow-hidden"
                  style={{
                    backgroundImage: 'linear-gradient(rgba(0,0,0,0.6), rgba(0,0,0,0.6)), url(/benvenuto.webp)',
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                  }}
                >
                  <div className="p-6 flex items-center justify-center" style={{ minHeight: 300 }}>
                    <div
                      style={{
                        backgroundColor: 'rgba(240,240,240,0.85)',
                        borderRadius: 12,
                        padding: 20,
                        width: '85%',
                        textAlign: 'center',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        minHeight: 200,
                      }}
                    >
                      <div>
                        <div className="text-lg font-semibold" style={{ color: '#000', marginBottom: 8 }}>
                          Accesso effettuato con successo!!
                        </div>
                        <div className="text-xl font-semibold" style={{ color: '#000' }}>
                          Benvenuto {currentUser?.first_name || ''}
                        </div>
                        <div style={{ marginTop: 12, display: 'flex', justifyContent: 'center' }}>
                          <div
                            style={{
                              width: 70,
                              height: 70,
                              borderRadius: '50%',
                              border: '3px solid #22c55e',
                              backgroundColor: 'rgba(34, 197, 94, 0.15)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}
                          >
                            <span style={{ color: '#22c55e', fontSize: 36, lineHeight: 1 }}>✓</span>
                          </div>
                        </div>
                      </div>
                      <div style={{ marginTop: 16, display: 'flex', justifyContent: 'center' }}>
                        <button
                          type="button"
                          style={{
                            backgroundColor: '#000000',
                            color: '#ffffff',
                            border: '1px solid #ffffff',
                            borderRadius: 8,
                            padding: '10px 16px',
                            fontWeight: 600,
                            cursor: 'pointer',
                          }}
                          onClick={() => closeOverlay()}
                        >
                          Continua sul sito
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        )}
      </div>
    </CartProvider>
  );
}

export default App;
