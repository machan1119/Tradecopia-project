import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import LoginForm from "./LoginForm";
import { AUTH_COOKIE_NAME, AUTH_TOKEN } from "@/lib/auth";

export default async function LoginPage() {
  const session = (await cookies()).get(AUTH_COOKIE_NAME)?.value;
  if (session === AUTH_TOKEN) {
    redirect("/");
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto flex min-h-screen w-full max-w-4xl flex-col items-center justify-center gap-6 px-6 py-12">
        <div className="flex w-full max-w-sm flex-col gap-2 text-center">
          <h1 className="text-3xl font-semibold tracking-tight text-white">
            Sign in to Tradecopia
          </h1>
          <p className="text-sm text-slate-400">
            Enter the admin credential to access the dashboard.
          </p>
        </div>
        <LoginForm/>
      </div>
    </div>
  );
}
