import { Link } from "@remix-run/react";
import { Form, NavLink, Outlet, useLoaderData } from "@remix-run/react";

import logo from '~/img/Colorfill.png'

import { useOptionalUser } from "~/utils";

import index from '~/styles/index.css'

export const meta = () => [{ title: "Color Fill" }];

export default function Index() {
  const user = useOptionalUser();
  console.log(user)
  return (
    <>
    <main>
      <div className="top">
        {/* <h1>Color Fill</h1> */}
        <img src={logo}></img>
      </div>
      <div className="bottom">
        <Link reloadDocument to='/playmenu'><h2>Play</h2></Link>
        <Link style={{color: user == null ? '' : ' lightgray'}} to='/login'><h2>Login</h2></Link>
        <Form  action="/logout" method="post">
          <button style={{color: user == null ? ' lightgray' : ''}}
            type="submit"
            className="rounded bg-slate-600 px-4 py-2 text-blue-100 hover:bg-blue-500 active:bg-blue-600"
          >
            Logout
          </button>
        </Form>
        <Link to='/leaderboard'><h2>View Leaderboard</h2></Link>
      </div>
    </main>
    </>
    
  );
}

export function links() {
  return [{rel: 'stylesheet', href: index}]
}
