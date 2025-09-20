import { mdxComponents } from "@rdx/ui/components/mdx-components";
import { notFound } from "next/navigation";
import { mdxLoader } from "@rdx/core";

import versionsRaw from "@/versions.json";
import { VersionBanner } from "@/components/Page/version-banner";
import { DocHeader } from "@/components/Page/doc-header";
import { DocFooter } from "@/components/Page/doc-footer";

export default async function DocPage({
  params,
}: {
  params: Promise<{ version: string; doc: string[] }>;
}) {
  const { version, doc } = await params;
  const filename = doc.at(-1);
  if (!filename) return notFound();

  let content;
  try {
    const result = await mdxLoader({
      filename,
      version,
      versionsRaw,
      mdxComponents,
    });
    content = result.content;
  } catch {
    return notFound();
  }

  return (
    <section className="w-full h-full overflow-y-auto px-7 flex flex-col gap-5 pb-8 md:py-8">
      <div className="w-full flex flex-col gap-5 md:mx-auto md:max-w-[860px] pt-14 md:pt-0">
        <header className="mb-6">
          <VersionBanner version={version} versionsRaw={versionsRaw} />
          <DocHeader version={version} filename={filename} />
        </header>
        <main className="h-full w-full flex-1 max-w-[960px]">{content}</main>
      </div>
      <DocFooter version={version} filename={filename} />
    </section>
  );
}
