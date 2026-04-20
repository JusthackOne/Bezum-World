import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/ui/8bit/card";

export function ClientUserStub() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/20 p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle>Client User Page</CardTitle>
          <CardDescription>This is a placeholder page for the client user area.</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            The final client gameplay UI will be implemented in the next tasks.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
