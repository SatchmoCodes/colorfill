import { Link } from "@remix-run/react";

import { useOptionalUser } from "~/utils";

import index from '~/styles/index.css'

import logo from '~/img/Colorfill.png'

import {useState, useEffect} from 'react'

import { json, redirect } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import { useSubmit } from "@remix-run/react"
import { useEventSource } from "remix-utils";
import { getGameSession, updateUserInSession } from "../models/gamesession.server";
import { useNavigate } from "react-router-dom";
import { requireUserId } from "~/session.server";
import { getUserNameById } from "../models/user.server";
import { emitter } from "../services/emitter.server";

export async function loader() {
  const games = await getGameSession({ gameState: 'Waiting'})
  return json({ games });
}

export const action = async ({ request }) => {
  const userId = await requireUserId(request)
  const formData = await request.formData()
  const sessionId = formData.get('id')
  console.log(sessionId)
  console.log('hi')

  const username = await getUserNameById({ id: userId})
  console.log(username)
  const updatedSession = await updateUserInSession({ id: sessionId, opponentName: username.username})
  console.log(updatedSession)

  emitter.emit('edit-gameSession', `${JSON.stringify(updatedSession)}\n\n`)
  return redirect(`/pvplobby/${sessionId}`)
}

export const meta = () => [{ title: "Color Fill" }];

export default function Index() {
  const user = useOptionalUser();
  let loaderData = useLoaderData()
  const submit = useSubmit()

  console.log(loaderData.games)

  const [games, setGames] = useState(loaderData.games)
  let newGameSession = useEventSource('/pvpmenu/subscribe', {event: 'new-gameSession'})
  let editedGameSession = useEventSource('/pvplobby/subscribe', {event: 'edit-gameSession'})

  useEffect(() => {
    let parsedGameSession = JSON.parse(newGameSession)
    if (parsedGameSession != null) {
      setGames((prev) => [...prev, parsedGameSession])
    }
  }, [newGameSession])

  useEffect(() => {
    let parsedEditedSession = JSON.parse(editedGameSession)
    if (parsedEditedSession != null) {
      let gameArr = loaderData.games
      let newGameArr = gameArr.filter(game => game.id != parsedEditedSession.id)
      setGames([...newGameArr, parsedEditedSession])
    }
  }, [editedGameSession])

  function handleJoin(event) {
    submit({id: event.target.dataset.id}, {method: 'post'})
  }

  console.log(games)

  return (
   
    <>
    <main>
      <div className="top">

        <img src={logo}></img>
      </div>
      <div className="gameList">
        <h2>Game List</h2>
        <div className="interior">
          {games.length == 0 ? <h3>No games currently...</h3> :
          games.map((game, index) => {
            return (
              <div className="gameContainer" key={index}>
                <h3>Board Size: {game.boardSize}</h3>
                <h3>Board Type: {game.boardType}</h3>
                <h3>Players:</h3>
                <h3>{game.ownerName} (Owner)</h3>
                <h3>{game.ownerName == game.opponentName ? 'Waiting on player...' : game.opponentName}</h3>
                {game.ownerName == game.opponentName && 
                <button data-id={game.id} onClick={handleJoin}>Join</button>
                }
              </div>
            )
          })}
            
        </div>
      </div>
      <div className="gameOptions">
        <Link to='/pvpcreate'>Create Game</Link>
      </div>
    </main>
    </>
    
  );
}

export function links() {
  return [{rel: 'stylesheet', href: index}]
}