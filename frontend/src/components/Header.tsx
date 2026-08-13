interface Props {
  onAddClick: () => void;
}

export function Header({ onAddClick }: Props) {
  return (
    <header className="header">
      <h1>Gastos Mensuales</h1>
      <button type="button" className="btn-primary" onClick={onAddClick}>
        Agregar gasto
      </button>
    </header>
  );
}
