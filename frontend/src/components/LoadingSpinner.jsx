/** Centered spinner OR skeleton rows for tables. */
export default function LoadingSpinner({ skeleton = false, rows = 5, cols = 4 }) {
  if (skeleton) {
    return (
      <>
        {Array.from({ length: rows }).map((_, i) => (
          <tr key={i} className="skeleton-row">
            {Array.from({ length: cols }).map((_, j) => (
              <td key={j}>
                <div className={`skeleton skeleton-text ${j === cols - 1 ? 'short' : j === 0 ? 'long' : ''}`} />
              </td>
            ))}
          </tr>
        ))}
      </>
    );
  }

  return (
    <div className="loading-spinner">
      <div className="spinner" />
    </div>
  );
}
