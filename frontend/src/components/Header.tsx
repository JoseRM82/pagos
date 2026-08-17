interface Props {
  onAddGasto: () => void;
  onAddIngreso: () => void;
  onLogout: () => void;
}

export function Header({ onAddGasto, onAddIngreso, onLogout }: Props) {
  return (
    <header className="header">
      <h1>Gastos e ingresos</h1>
      <div className="header-actions">
        <button type="button" className="btn-secondary" onClick={onLogout}>
          Salir
        </button>
        <button type="button" className="btn-secondary" onClick={onAddIngreso}>
          Agregar ingreso
        </button>
        <button type="button" className="btn-primary" onClick={onAddGasto}>
          Agregar gasto
        </button>
      </div>
    </header>
  );
}
