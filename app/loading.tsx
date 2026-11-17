// Shown while a page that wasn't prefetched loads: a thin bar sliding across the top of the window, the way browsers
// and YouTube show progress, instead of a spinner in an empty page. The min height keeps the footer from jumping up.
export default function Loading() {
  return (
    <main aria-busy aria-label="Loading" className="min-h-[70vh]">
      <span className="fixed inset-x-0 top-0 z-40 h-1 overflow-hidden">
        <span className="load-bar block h-full w-2/5 rounded-full bg-link" />
      </span>
    </main>
  );
}
