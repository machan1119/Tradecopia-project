import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import Dashboard from "@/components/Dashboard";
import { AUTH_COOKIE_NAME, AUTH_TOKEN } from "@/lib/auth";

export default async function Home() {
  const session = (await cookies()).get(AUTH_COOKIE_NAME)?.value;

  if (session !== AUTH_TOKEN) {
    redirect("/login?redirect=/");
  }

  return <Dashboard />;
}
