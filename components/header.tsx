import Link from "next/link";
import { Logo } from "./logo";
import { MobileMenu } from "./mobile-menu";

export const Header = () => {
  const navItems = [
    { label: "Dashboard", href: "/dashboard" },
    { label: "Candidate", href: "/candidate" },
    { label: "Recruiter", href: "/recruiter" },
    { label: "Matches", href: "/matches" },
    { label: "Verifier", href: "/verifier" },
  ];

  return (
    <div className="fixed z-50 top-0 left-0 w-full bg-gradient-to-b from-black via-black/80 to-black/0 pb-8 pt-8 backdrop-blur-[2px] md:pb-10 md:pt-10">
      <header className="flex items-center justify-between container">
        <Link href="/">
          <Logo className="w-[142px] md:w-[170px]" />
        </Link>
        <nav className="flex max-lg:hidden absolute left-1/2 -translate-x-1/2 items-center justify-center gap-x-8">
          {navItems.map((item) => (
            <Link
              className="uppercase inline-block font-mono text-foreground/60 hover:text-foreground/100 duration-150 transition-colors ease-out"
              href={item.href}
              key={item.label}
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <Link className="uppercase max-lg:hidden transition-colors ease-out duration-150 font-mono text-primary hover:text-primary/80" href="/dashboard">
          Open Dashboard
        </Link>
        <MobileMenu />
      </header>
    </div>
  );
};
