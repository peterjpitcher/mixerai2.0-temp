import Link from 'next/link';

/**
 * Custom 404 Not Found page.
 * Displays a humorous message when a user tries to access a non-existent page,
 * guiding them back to the dashboard.
 */
export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center text-center p-4">
      <h1 className="text-6xl font-bold mb-4 animate-bounce">⚠️ 404 ⚠️</h1>
      <p className="text-2xl mb-2">Oops! It seems you've taken a wrong turn in the digital maze.</p>
      <p className="text-lg mb-8 text-muted-foreground">
        Our highly trained hamsters couldn't find the page you're looking for.
        <br />
        Maybe it's playing hide and seek, or perhaps it's on a secret mission?
      </p>
      <div className="mb-8">
        <img 
          src="/images/confused-robot.svg" // Assuming you might add a funny image later
          alt="A very confused robot looking at a map." 
          className="h-48 w-48 mx-auto"
          // Basic styles for the image, replace with actual SVG or better styling
          style={{ filter: 'grayscale(80%) opacity(0.7)' }} 
        />
        <p className="text-xs text-neutral-500 mt-1">(Our robot is also perplexed.)</p>
      </div>
      <Link
        href="/dashboard" // Updated href
        className="px-6 py-3 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 text-lg font-semibold transition-transform duration-150 ease-in-out hover:scale-105"
      >
        Back to Familiar Territory (Dashboard)
      </Link>
    </div>
  );
} 