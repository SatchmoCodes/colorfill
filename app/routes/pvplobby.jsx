import React, { useCallback } from 'react'
import index from '~/styles/index.css'
import logo from '~/img/Colorfill.png'

import {useState, useEffect} from 'react'

import invariant from "tiny-invariant";
import { requireUserId } from "~/session.server";
import { getGameSessionById, updateSessionState, updateUserInSession } from '../models/gamesession.server';
import { json, redirect } from "@remix-run/node";
import { useLoaderData, useSubmit } from '@remix-run/react';
import { useEventSource } from "remix-utils";
import { useFetcher } from '@remix-run/react';
import { useBeforeUnload } from '@remix-run/react';
import { Link } from '@remix-run/react';
import { Beforeunload, useBeforeunload } from 'react-beforeunload';

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
  // if (gameSession.opponentName != user.username) {
  //   return redirect('/pvplobby')
  // }
  if (gameSession.gameState == 'Finished' || gameSession.gameState == 'Delete') {
    console.log('I like sucking on giant weiners')
    return redirect('/pvpmenu')
  }
  return json({ gameSession})
}

export const action = async({ request }) => {
  const userId = await requireUserId(request)
  const formData = await request.formData()
  const gameState = formData.get('state')
  const id = formData.get('id')
  const submitType = formData.get('submitType')
  if (submitType == 'Starting') {
    const updatedGameSession = await updateSessionState({ id, gameState})
    emitter.emit('edit-gameSession', JSON.stringify(updatedGameSession))
  }
  else if (submitType == 'Leaving') {
    console.log('tastasdtasdt')
    const ownerName = formData.get('name')
    const updatedGameSession = await updateUserInSession({ id, opponentName: ownerName, gameState: 'Waiting'})
    emitter.emit('edit-gameSession', JSON.stringify(updatedGameSession))
  }
  else if (submitType == 'Deleting') {
    const updatedGameSession = await updateSessionState({ id, gameState: 'Delete' })
    emitter.emit('edit-gameSession', JSON.stringify(updatedGameSession))
    return redirect('/pvpmenu')
  }
  return null
}

function pvplobby() {
    const user = useUser()
    const fetcher = useFetcher()
    const submit = useSubmit()
    let data = useLoaderData()

    const [gameSession, setGameSession] = useState(data.gameSession)
    let updatedGameSession = useEventSource('/pvplobby/subscribe', {event: 'edit-gameSession'})

    console.log(user.username)
    console.log(gameSession.ownerName)
    useEffect(() => {
      console.log('update')
        let parsedSession = JSON.parse(updatedGameSession)
        if (parsedSession != null && parsedSession.id == gameSession.id) {
            setGameSession(parsedSession)
            if (parsedSession.gameState == 'Playing') {
              window.location.href = `/pvpgame/${parsedSession.id}`
            }
            else if (parsedSession.gameState == 'Delete') {
              window.location.href = '/pvpmenu'
            }
        }
    }, [updatedGameSession])

    function startGame() {
      fetcher.submit({state: 'Playing', id: gameSession.id, submitType: 'Starting'}, {method: 'POST'})
    }
    
    useBeforeUnload(
      useCallback(() => {
        if (gameSession.ownerName != gameSession.opponentName) {
          if (user.username == gameSession.opponentName && gameSession.gameState != 'Finished') {
            console.log(gameSession.gameState)
            fetcher.submit({state: 'Waiting', id: gameSession.id, submitType: 'Leaving', name: gameSession.ownerName}, {method: 'POST'})
          }
        }
        else if (user.username == gameSession.ownerName && gameSession.gameState != 'Finished') {
          console.log('faggot')
          submit({state: 'Delete', id: gameSession.id, submitType: 'Deleting'}, {method: 'POST'})
        }
      })
    )
    

  return (
    <main>
        <div className='top'>
          <Link to='/'>
            <img src={logo}></img>
          </Link>
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