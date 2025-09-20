import { usePathname, useRouter } from "next/navigation";
import { useCallback } from "react";

import { useVersion } from "./use-version";

export function useVersionNavigation() {
  const router = useRouter();
  const { setVersion } = useVersion();
  const pathname = usePathname();

  const navigateToVersion = useCallback(
    (label: string) => {
      const targetVersion = label === "canary" ? "canary" : label;
      const match = pathname.match(/^\/docs\/([^/]+)\/([^/]+)$/);
      const currentFileName = match?.[2] || "intro";

      setVersion(targetVersion);
      router.push(`/docs/${targetVersion}/${currentFileName}`);
    },
    [pathname, router, setVersion],
  );
  return navigateToVersion;
}
