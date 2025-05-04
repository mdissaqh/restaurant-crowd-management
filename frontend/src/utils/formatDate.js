export function formatDate(d) {
  const dt = new Date(d);
  return dt.toLocaleDateString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric'
  });
}
