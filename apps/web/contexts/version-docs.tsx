"use client";

import { createContext, useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import { getParsedVersions } from "@rdx/rdx-versioning";

import versionsRaw from "../versions.json";

type VersionContextType = {
  version: string;
  setVersion: (v: string) => void;
};

export const VersionContext = createContext<VersionContextType | undefined>(
  undefined,
);

export function VersionProvider({ children }: { children: React.ReactNode }) {
  const parsedVersions = useMemo(() => getParsedVersions(versionsRaw), []);
  const defaultVersion = parsedVersions.active[0]?.label || "canary";
  const [version, setVersion] = useState(defaultVersion);
  const pathname = usePathname();

  const versionFromUrl = useMemo(() => {
    const match = pathname.match(/^\/docs\/([^/]+)\/?.*$/);
    return match?.[1];
  }, [pathname]);

  useEffect(() => {
    const saved = localStorage.getItem("rdx-version");
    if (saved) {
      const clean = saved === "canary" ? "canary" : saved;
      setVersion(clean);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem("rdx-version", version);
  }, [version]);

  useEffect(() => {
    if (versionFromUrl && versionFromUrl !== version) {
      setVersion(versionFromUrl);
    }
  }, [versionFromUrl, version]);

  return (
    <VersionContext.Provider value={{ version, setVersion }}>
      {children}
    </VersionContext.Provider>
  );
}
