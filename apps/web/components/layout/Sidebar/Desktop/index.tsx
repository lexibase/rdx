import type { DocCategory } from "@rdx/types/loaders";

import { SidebarCategory } from "../category";

export function DesktopSidebar({
  pathname,
  categories,
}: {
  pathname: string;
  categories: DocCategory[];
}) {
  return (
    <div className="w-full h-full p-4 border-r border-border relative">
      {categories.map((category, index) => (
        <SidebarCategory
          key={category.title}
          category={category}
          pathname={pathname}
          showSeparator={index < categories.length - 1}
        />
      ))}
    </div>
  );
}
