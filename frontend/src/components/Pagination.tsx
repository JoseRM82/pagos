import { getPageNumbers } from '../utils/pagination';

interface Props {
  page: number;
  totalPages: number;
  totalItems: number;
  onChange: (page: number) => void;
}

export function Pagination({ page, totalPages, totalItems, onChange }: Props) {
  if (totalPages <= 1) return null;

  const showEdgeArrows = totalItems > 100;
  const pages = getPageNumbers(page, totalPages);

  return (
    <div className="pagination">
      {showEdgeArrows && (
        <button type="button" disabled={page === 1} onClick={() => onChange(1)}>
          {'<<'}
        </button>
      )}
      <button
        type="button"
        disabled={page === 1}
        onClick={() => onChange(page - 1)}
      >
        {'<'}
      </button>
      {pages.map((p) => (
        <button
          key={p}
          type="button"
          className={p === page ? 'active' : ''}
          onClick={() => onChange(p)}
        >
          {p}
        </button>
      ))}
      <button
        type="button"
        disabled={page === totalPages}
        onClick={() => onChange(page + 1)}
      >
        {'>'}
      </button>
      {showEdgeArrows && (
        <button
          type="button"
          disabled={page === totalPages}
          onClick={() => onChange(totalPages)}
        >
          {'>>'}
        </button>
      )}
    </div>
  );
}
