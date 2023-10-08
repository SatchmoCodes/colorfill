import React from 'react'
import index from '~/styles/index.css'
import logo from '~/img/Colorfill.png'

import {useState, useEffect} from 'react'

import invariant from "tiny-invariant";
import { requireUserId } from "~/session.server";
import { getGameSessionById } from '../models/gamesession.server';
import { json, redirect } from "@remix-run/node";
import { useLoaderData } from '@remix-run/react';
import { useEventSource } from "remix-utils";

export const loader = async ({ params, request}) => {
  const userId = await requireUserId(request)
  invariant(params.sessionId, "sessionId not found");

  const gameSession = await getGameSessionById({ id: params.sessionId })
  if (!gameSession) {
    throw new Response("Not Found", { status: 404 });
  }
  return json({ gameSession})
}

function pvplobby() {
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
        }
    }, [updatedGameSession])

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
            <button disabled={gameSession.opponentName == gameSession.ownerName ? true : false}>Start Game</button>
        </div>
    </main>
  )
}

export function links() {
    return [{rel: 'stylesheet', href: index}]
  }

export default pvplobby