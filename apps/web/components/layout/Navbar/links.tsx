"use client";

import { Button } from "@rdx/ui/components/button";
import Link from "next/link";

import { useVersion } from "@/hooks/use-version";
import config from "@/rdx.config";

export function NavbarLinks() {
  const { version } = useVersion();
  const href = `/docs/${version}`;

  return (
    <>
      <Button key={href} variant="link" size="sm" asChild>
        <Link href={href}>Docs</Link>
      </Button>
    </>
  );
}
