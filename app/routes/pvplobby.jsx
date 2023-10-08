import React from 'react'
import index from '~/styles/index.css'
import logo from '~/img/Colorfill.png'

import {useState, useEffect} from 'react'

import invariant from "tiny-invariant";
import { requireUserId } from "~/session.server";
import { getGameSessionById, updateSessionState } from '../models/gamesession.server';
import { json, redirect } from "@remix-run/node";
import { useLoaderData } from '@remix-run/react';
import { useEventSource } from "remix-utils";
import { useFetcher } from '@remix-run/react';

import { emitter } from "../services/emitter.server";

import { useUser } from "~/utils";
import { getUserNameById } from '../models/user.server';



export const loader = async ({ params, request}) => {
  const userId = await requireUserId(request)
  invariant(params.sessionId, "sessionId not found");

  const gameSession = await getGameSessionById({ id: params.sessionId })
  const user = await getUserNameById({ id: userId })
  if (!gameSession) {
    throw new Response("Not Found", { status: 404 });
  }
  if (gameSession.opponentName != user.username) {
    return redirect('/pvplobby')
  }
  return json({ gameSession})
}

export const action = async({ request }) => {
  const userId = await requireUserId(request)
  const formData = await request.formData()
  const gameState = formData.get('state')
  const id = formData.get('id')

  const updatedGameSession = await updateSessionState({ id, gameState})
  emitter.emit('edit-gameSession', JSON.stringify(updatedGameSession))
  return null
}

function pvplobby() {
    const user = useUser()
    const fetcher = useFetcher()
    let data = useLoaderData()
    console.log(data.gameSession)
    console.log(data.gameSession.boardState)
    console.log(JSON.parse(data.gameSession.boardState))

    const [gameSession, setGameSession] = useState(data.gameSession)
    let updatedGameSession = useEventSource('/pvplobby/subscribe', {event: 'edit-gameSession'})

    useEffect(() => {
        let parsedSession = JSON.parse(updatedGameSession)
        if (parsedSession != null) {
            setGameSession(parsedSession)
            if (parsedSession.gameState == 'Playing') {
              window.location.href = `/pvpgame/${parsedSession.id}`
            }
        }
    }, [updatedGameSession])

    function startGame() {
      fetcher.submit({state: 'Playing', id: gameSession.id}, {method: 'POST'})
    }

  return (
    <main>
        <div className='top'>
            <img src={logo}></img>
        </div>
        <div className='lobby'>
            <h3>{gameSession.ownerName}</h3>
            <h3>Vs</h3>
            <h3>{gameSession.opponentName == gameSession.ownerName ? 'Waiting on player...' : gameSession.opponentName}</h3>
            <div className='rules'>
                <h3></h3>
            </div>
            {gameSession.ownerName == user.username && 
            <button disabled={gameSession.opponentName == gameSession.ownerName ? true : false} onClick={startGame}>Start Game</button>
            }
        </div>
    </main>
  )
}

export function links() {
    return [{rel: 'stylesheet', href: index}]
  }

export default pvplobby