import Link from "next/link";

export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-full max-w-2xl flex-col justify-center px-4 py-20">
      <p className="text-sm font-medium uppercase tracking-wide text-teal-800">
        Quick Payment Pages
      </p>
      <h1 className="mt-2 text-4xl font-bold tracking-tight text-zinc-900">
        Hosted, branded payment pages for every service.
      </h1>
      <p className="mt-4 text-lg text-zinc-600">
        Configure amounts, custom fields, GL codes, and confirmation emails — then share a public
        link, embed an iframe, or download a QR code.
      </p>
      <div className="mt-10 flex flex-wrap gap-4">
        <Link
          href="/login"
          className="rounded-lg bg-teal-700 px-5 py-3 text-center text-sm font-semibold text-white shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-900"
        >
          Admin sign in
        </Link>
        <Link
          href="/signup"
          className="rounded-lg border border-zinc-300 bg-white px-5 py-3 text-center text-sm font-semibold text-zinc-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-400"
        >
          Create account
        </Link>
      </div>
      <p className="mt-12 text-sm text-zinc-500">
        Built for the Waystar QPP hackathon: Next.js, Supabase, Stripe (test mode), and Resend.
      </p>
    </main>
  );
}
