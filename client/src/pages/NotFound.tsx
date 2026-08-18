import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";

export default function NotFound() {
  const [, setLocation] = useLocation();

  return (
    <div className="flex min-h-[100dvh] w-full items-center bg-background px-4">
      <div className="mx-auto max-w-lg">
        <p className="font-mono text-sm tracking-[0.5px] text-muted-foreground">404</p>
        <h1 className="mt-3 text-4xl font-normal tracking-[-0.5px] text-balance sm:text-5xl">
          This route is not in the control room.
        </h1>
        <p className="mt-4 max-w-[500px] text-base leading-relaxed text-muted-foreground">
          The page may have moved. Return to Scan History to keep reviewing exposures.
        </p>
        <Button className="mt-8" onClick={() => setLocation("/")}>
          Back to Nuvira
        </Button>
      </div>
    </div>
  );
}
