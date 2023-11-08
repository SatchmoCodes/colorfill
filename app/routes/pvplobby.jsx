import React, { useCallback } from 'react'
import index from '~/styles/index.css'
import logo from '~/img/Colorfill.png'

import {useState, useEffect} from 'react'

import invariant from "tiny-invariant";
import { requireUserId } from "~/session.server";
import { getGameSessionById, updateSessionState, updateUserInSession } from '../models/gamesession.server';
import { json, redirect } from "@remix-run/node";
import { useLoaderData, useNavigate, useSubmit } from '@remix-run/react';
import { useEventSource, useHydrated } from "remix-utils";
import { useFetcher } from '@remix-run/react';
import { useBeforeUnload } from '@remix-run/react';
import { Link } from '@remix-run/react';
import { Form } from '@remix-run/react';
import { Beforeunload, useBeforeunload } from 'react-beforeunload';

import { emitter } from "../services/emitter.server";

import { useUser } from "~/utils";
import { getUserNameById } from '../models/user.server';

import { RotatingLines } from 'react-loader-spinner';





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
  console.log(gameSession.turnLog)
  // if (gameSession.gameState != 'Waiting') {
  //   return redirect('/pvpmenu')
  // }
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
    // return redirect(`/pvpgame/${id}`)
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
    const navigate = useNavigate()
    const isHydrated = useHydrated()
    console.log(data.gameSession.gameState)

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
      // submit(document.querySelector('.start'))
    }

    useEffect(() => {
      if (data.gameSession.gameState != 'Waiting') {
        navigate('../pvpmenu', {replace: true})
      }
    }, [])
    
    

    useEffect(() => {
      window.history.replaceState(null, '/game', ['/pvpmenu'])
      // window.history.pushState(null, '/game', ['/pvpmenu'])
    }, [])

    useBeforeUnload(
      useCallback(() => {
        if (gameSession.ownerName != gameSession.opponentName) {
          if (user.username == gameSession.opponentName && gameSession.gameState != 'Finished') {
            console.log(gameSession.gameState)
            fetcher.submit({state: 'Waiting', id: gameSession.id, submitType: 'Leaving', name: gameSession.ownerName}, {method: 'POST'})
          }
        }
        else if (user.username == gameSession.ownerName && gameSession.gameState != 'Finished') {
          submit({state: 'Delete', id: gameSession.id, submitType: 'Deleting'}, {method: 'POST'})
        }
      })
    )
    

  return (
    <main>
        <div className='top'>
          <Link reloadDocument to='/'>
            <img src={logo}></img>
          </Link>
        </div>
        <div className='lobby'>
          <h1>Game Info</h1>
          <div className='gameInfo'>
            <h2>Board Size: {gameSession.boardSize}</h2>
            <h2>Board Type: {gameSession.boardType}</h2>
          </div>
          <div className='players'>
            <h3>{gameSession.ownerName}</h3>
            <h3>Vs</h3>
            <div className='waiting'>
              <h3>{gameSession.opponentName == gameSession.ownerName ? 'Waiting on player...' : gameSession.opponentName}</h3>
              {(isHydrated && gameSession.opponentName == gameSession.ownerName) && <RotatingLines 
                  strokeWidth="5"
                  width="5"
                  radius="3"
                  strokeColor='darkGreen'
                  ariaLabel="loading"
                  wrapperClass>
                </RotatingLines>}
            </div>
          </div>
          {gameSession.ownerName == user.username && 
          <button disabled={gameSession.opponentName == gameSession.ownerName ? true : false} onClick={startGame}>Start Game</button>
          }
          {gameSession.ownerName == user.username && <h3 className='code'>Code: {gameSession.code}</h3>}
        </div>
    </main>
  )
}

export function links() {
    return [{rel: 'stylesheet', href: index}]
  }

export default pvplobby