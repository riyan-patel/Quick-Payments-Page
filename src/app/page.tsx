import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-full max-w-2xl flex-col justify-center px-4 py-20">
      <Card className="shadow-md">
        <CardHeader>
          <CardDescription className="text-xs font-semibold tracking-wide text-primary uppercase">
            Quick Payment Pages
          </CardDescription>
          <CardTitle className="font-heading text-3xl font-bold tracking-tight sm:text-4xl">
            Hosted, branded payment pages for every service.
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-8">
          <p className="text-lg text-muted-foreground">
            Configure amounts, custom fields, GL codes, and confirmation emails — then share a
            public link, embed an iframe, or download a QR code.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/login"
              className={cn(
                buttonVariants({ size: "lg" }),
                "min-w-[10rem] justify-center no-underline",
              )}
            >
              Admin sign in
            </Link>
            <Link
              href="/signup"
              className={cn(
                buttonVariants({ variant: "outline", size: "lg" }),
                "min-w-[10rem] justify-center no-underline",
              )}
            >
              Create account
            </Link>
          </div>
        </CardContent>
        <CardFooter className="text-muted-foreground text-xs">
          Built for the Waystar QPP hackathon: Next.js, Supabase, Stripe (test mode), and Resend.
        </CardFooter>
      </Card>
    </main>
  );
}
