interface Props {
  onAddClick: () => void;
  onLogout: () => void;
}

export function Header({ onAddClick, onLogout }: Props) {
  return (
    <header className="header">
      <h1>Gastos Mensuales</h1>
      <div className="header-actions">
        <button type="button" className="btn-secondary" onClick={onLogout}>
          Salir
        </button>
        <button type="button" className="btn-primary" onClick={onAddClick}>
          Agregar gasto
        </button>
      </div>
    </header>
  );
}
