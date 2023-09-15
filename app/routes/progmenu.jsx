import { Link } from "@remix-run/react";

import gameOption from '~/routes/gameOptions.js'

import { useOptionalUser } from "~/utils";

import index from '~/styles/index.css'

export const meta = () => [{ title: "Color Fill" }];

export default function Index() {
  const user = useOptionalUser();

  const handleBoardChange = () => {
    gameOption.boardOption = 12
    console.log(gameOption)
  }
  return (
    <>
    <main>
      <div className="top">
        <h1>Color Fill</h1>
      </div>
      <div className="gameOptions">
        <Link to='/proggame'><h2 onClick={handleBoardChange}>Board 1</h2></Link>
      </div>
    </main>
    </>
    
  );
}

export function links() {
  return [{rel: 'stylesheet', href: index}]
}