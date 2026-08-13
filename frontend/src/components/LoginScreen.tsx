import { googleLoginUrl } from '../api/authApi';

export function LoginScreen({ denied }: { denied: boolean }) {
  const reason =
    typeof sessionStorage !== 'undefined'
      ? sessionStorage.getItem('auth_denied_reason')
      : null;

  return (
    <div className="app-container">
      <div className="card login-card">
        <h1>Gastos Mensuales</h1>
        <p>Ingresá con tu cuenta de Google. Solo está habilitada tu cuenta.</p>
        {denied && (
          <div className="status-msg error">
            Esa cuenta no tiene acceso
            {reason ? `: ${reason}` : '.'}
          </div>
        )}
        <a
          className="btn-primary google-btn"
          href={googleLoginUrl()}
          onClick={() => sessionStorage.removeItem('auth_denied_reason')}
        >
          Continuar con Google
        </a>
      </div>
    </div>
  );
}
