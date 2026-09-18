"use client";

import { signIn } from "next-auth/react";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function LoginCard() {
  return (
    <Card className="w-full max-w-sm shadow-glow">
      <CardHeader className="items-center text-center">
        <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/15 text-primary">
          <Sparkles className="h-6 w-6" />
        </div>
        <CardTitle className="text-xl">SignalForge</CardTitle>
        <CardDescription>
          Your autonomous AI marketing agent — research, create, approve, publish.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Button className="w-full" size="lg" onClick={() => signIn("google", { callbackUrl: "/" })}>
          Continue with Google
        </Button>
      </CardContent>
    </Card>
  );
}
