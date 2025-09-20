import { DropdownVersion } from "@/components/Dropdown";

import { NavbarLogo } from "./logo";
import { NavbarLinks } from "./links";
import { NavbarActions } from "./actions";

export function Navbar() {
  return (
    <nav className="w-full flex items-center justify-between px-6 py-2 border-b border-border">
      <div className="flex items-center gap-1">
        <NavbarLogo />
      </div>
      <div className="flex items-center md:gap-x-2 h-4">
        <DropdownVersion />
        <NavbarLinks />
        <NavbarActions />
      </div>
    </nav>
  );
}
