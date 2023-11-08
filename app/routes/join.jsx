import { json, redirect } from "@remix-run/node";
import { Form, Link, useActionData, useSearchParams } from "@remix-run/react";
import { useEffect, useRef } from "react";

import { createUser, getUserByEmail } from "~/models/user.server";
import { createUserSession, getUserId } from "~/session.server";
import { safeRedirect, validateEmail } from "~/utils";
import { getUserByUsername } from "../models/user.server";

import menuStyle from '~/styles/menus.css'

export const loader = async ({ request }) => {
  const userId = await getUserId(request);
  if (userId) return redirect("/");
  return json({});
};

export const action = async ({ request }) => {
  const formData = await request.formData();
  const username = formData.get("username")
  const password = formData.get("password");
  const redirectTo = safeRedirect(formData.get("redirectTo"), "/");

  if (typeof username !== "string" || username.length === 0) {
    return json(
      {errors: { username: 'Username is required', password: null}},
      { status: 400}
    )
  }

  if (username.length > 20) {
    return json(
      {errors: { username: 'Username is too long', password: null}},
      { status: 400}
    )
  }

  if (username.includes(' ')) {
    return json(
      {errors: { username: 'Username cannot have spaces', password: null}},
      { status: 400}
    )
  }

  if (typeof password !== "string" || password.length === 0) {
    return json(
      { errors: { username: null, password: "Password is required" } },
      { status: 400 }
    );
  }

  if (password.length < 8) {
    return json(
      { errors: { username: null, password: "Password is too short" } },
      { status: 400 }
    );
  }


  const existingUserName = await getUserByUsername(username)
  if (existingUserName) {
    return json (
      {
        errors: {
          username: "A user already exists with this username",
          password: null,
        },
      },
      {status: 400}
    )
  }

  const user = await createUser(username, password);

  return createUserSession({
    redirectTo,
    remember: false,
    request,
    userId: user.id,
  });
};

export const meta = () => [{ title: "Sign Up" }];

export default function Join() {
  const [searchParams] = useSearchParams();
  const redirectTo = searchParams.get("redirectTo") ?? undefined;
  const actionData = useActionData();
  const usernameRef = useRef(null)
  const passwordRef = useRef(null);

  useEffect(() => {
  if (actionData?.errors?.username) {
      usernameRef.current?.focus()
      } else if (actionData?.errors?.password) {
        passwordRef.current?.focus();
      }
  }, [actionData]);

  return (
    <div className="wrap">
      <div className="mx-auto w-full max-w-md px-8">
        <Form method="post" className="space-y-6">
          <div>
            <label
              htmlFor="username"
              className="block text-sm font-medium text-gray-700"
            >
              Username
            </label>
            <div className="mt-1">
              <input
                ref={usernameRef}
                id="username"
                required
                autoFocus={true}
                maxLength={20}
                name="username"
                type="text"
                autoComplete="username"
                aria-invalid={actionData?.errors?.username ? true : undefined}
                aria-describedby="username-error"
                className="w-full rounded border border-gray-500 px-2 py-1 text-lg"
              />

              {actionData?.errors?.username ? (
                <div className="pt-1 text-red-700" id="username-error">
                  {actionData.errors.username}
                </div>
              ) : null}
            </div>
          </div>

          <div>
            <label
              htmlFor="password"
              className="block text-sm font-medium text-gray-700"
            >
              Password
            </label>
            <div className="mt-1">
              <input
                id="password"
                ref={passwordRef}
                name="password"
                type="password"
                autoComplete="new-password"
                aria-invalid={actionData?.errors?.password ? true : undefined}
                aria-describedby="password-error"
                className="w-full rounded border border-gray-500 px-2 py-1 text-lg"
              />

              {actionData?.errors?.password ? (
                <div className="pt-1 text-red-700" id="password-error">
                  {actionData.errors.password}
                </div>
              ) : null}
            </div>
          </div>

          <input type="hidden" name="redirectTo" value={redirectTo} />
          <button
            type="submit"
            className="w-full rounded bg-blue-500 px-4 py-2 text-white hover:bg-blue-600 focus:bg-blue-400"
          >
            Create Account
          </button>
          <div className="flex items-center justify-center">
            <div className="text-center text-sm text-gray-500">
              Already have an account?{" "}
              <Link
                className="text-blue-500 underline"
                to={{
                  pathname: "/login",
                  search: searchParams.toString(),
                }}
              >
                Log in
              </Link>
            </div>
          </div>
        </Form>
      </div>
    </div>
  );
}

export function links() {
  return [{rel: 'stylesheet', href: menuStyle}]
}