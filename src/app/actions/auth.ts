"use server";

import { redirect } from "next/navigation";
import { db } from "@/db";
import { checkPassword } from "@/lib/auth";
import { findUserByEmail } from "@/lib/queries";
import { createSession, destroySession } from "@/lib/session";
import { fieldErrors, loginSchema, type FieldErrors } from "@/lib/validation";

export type LoginState = { errors?: FieldErrors; email?: string };

export async function login(_: LoginState, formData: FormData): Promise<LoginState> {
  const parsed = loginSchema.safeParse({ email: formData.get("email"), password: formData.get("password") });
  const email = String(formData.get("email") ?? "");
  if (!parsed.success) return { errors: fieldErrors(parsed.error), email };
  const user = await findUserByEmail(db(), parsed.data.email);
  if (!user || !(await checkPassword(parsed.data.password, user.passwordHash))) {
    return { errors: { form: "Email or password is incorrect" }, email };
  }
  await createSession({ userId: user.id, role: user.role, name: user.name });
  redirect(user.role === "admin" ? "/admin" : "/");
}

export async function logout() {
  await destroySession();
  redirect("/login");
}
