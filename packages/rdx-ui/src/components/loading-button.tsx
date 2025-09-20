import { Spline } from "lucide-react";
import { Button } from "@rdx/ui/components/button";

export function LoadingButton() {
  return (
    <Button
      variant="outline"
      size="sm"
      className="w-[134px] px-9 overflow-hidden"
      disabled
      aria-busy="true"
      aria-label="Loading versions"
    >
      <div className="animate-spin flex items-center justify-center">
        <Spline className="size-4" />
      </div>
    </Button>
  );
}
