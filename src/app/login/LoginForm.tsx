"use client";

import { useActionState, useRef } from "react";
import { ArrowRight, Loader2 } from "lucide-react";
import { login, type LoginState } from "@/app/actions/auth";

const DEMO = {
  student: { email: "student@uniuyo.edu.ng", password: "student123" },
  admin: { email: "admin@uniuyo.edu.ng", password: "admin123" },
};

export function LoginForm() {
  const [state, action, pending] = useActionState<LoginState, FormData>(login, {});
  const email = useRef<HTMLInputElement>(null);
  const password = useRef<HTMLInputElement>(null);
  const fill = (who: keyof typeof DEMO) => {
    if (email.current) email.current.value = DEMO[who].email;
    if (password.current) password.current.value = DEMO[who].password;
  };
  return (
    <form action={action} className="form" noValidate>
      {state.errors?.form && <div className="form-error" role="alert">{state.errors.form}</div>}
      <div className="field" data-invalid={!!state.errors?.email}>
        <label htmlFor="email">Email</label>
        <input ref={email} id="email" name="email" type="email" className="input" defaultValue={state.email ?? DEMO.student.email} autoComplete="email" />
        {state.errors?.email && <span className="error">{state.errors.email}</span>}
      </div>
      <div className="field" data-invalid={!!state.errors?.password}>
        <label htmlFor="password">Password</label>
        <input ref={password} id="password" name="password" type="password" className="input" defaultValue={DEMO.student.password} autoComplete="current-password" />
        {state.errors?.password && <span className="error">{state.errors.password}</span>}
      </div>
      <button className="btn btn-dark btn-block" disabled={pending} data-testid="sign-in">
        {pending ? <Loader2 size={18} /> : null} Sign in <ArrowRight size={17} />
      </button>
      <div className="demo-box">
        <b>Demo accounts</b>
        <span>Student: student@uniuyo.edu.ng / student123</span>
        <span>Admin: admin@uniuyo.edu.ng / admin123</span>
        <div style={{ display: "flex", gap: 8 }}>
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => fill("student")}>Use student</button>
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => fill("admin")} data-testid="use-admin">Use admin</button>
        </div>
      </div>
    </form>
  );
}
