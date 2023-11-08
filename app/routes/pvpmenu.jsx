import { Link } from "@remix-run/react";

import { useOptionalUser } from "~/utils";

import index from '~/styles/index.css'

import logo from '~/img/Colorfill.png'

import {useState, useEffect} from 'react'

import { json, redirect } from "@remix-run/node";
import { useLoaderData, Form } from "@remix-run/react";
import { useSubmit } from "@remix-run/react"
import { useEventSource, useHydrated } from "remix-utils";
import { getAllGameSessions, getGameSession, getWaitingSessions, updateUserInSession } from "../models/gamesession.server";
import { useNavigate } from "react-router-dom";
import { requireUserId } from "~/session.server";
import { getUserNameById } from "../models/user.server";
import { emitter } from "../services/emitter.server";

import { TailSpin, RotatingLines, Bars } from "react-loader-spinner";

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { library } from '@fortawesome/fontawesome-svg-core'
import { faEye, faLayerGroup, faList, faTableColumns } from '@fortawesome/free-solid-svg-icons'

library.add(faEye, faList, faLayerGroup, faTableColumns)

export const loader = async({ request }) => {
  
  const url = new URL(request.url)
  const listType = url.searchParams.get('listType')
  let games
  if (listType == '' || listType == 'false') {
    games = await getGameSession({ gameState: 'Waiting'})
  }
  else {
    games = await getAllGameSessions()
    console.log('all games')
    console.log(games)
  }
  games = games.filter((game) => (Date.now() - Date.parse(game.createdAt)) / 1000 < 300)

  return json({ games });
}

export const action = async ({ request }) => {
  const userId = await requireUserId(request)
  const formData = await request.formData()
  const sessionId = formData.get('id')
  const submitType = formData.get('submitType')

  const username = await getUserNameById({ id: userId})
  if (submitType == 'noCode') {
    const updatedSession = await updateUserInSession({ id: sessionId, opponentName: username.username, gameState: 'Waiting'})
    emitter.emit('edit-gameSession', `${JSON.stringify(updatedSession)}\n\n`)
    return redirect(`/pvplobby/${sessionId}`)
  }
  else if (submitType == 'code') {
    let correctId = null
    let code = formData.get('code')
    console.log(code)
    const waitingSessions = await getWaitingSessions()
    waitingSessions.forEach((session) => {
      console.log(session.code)
      if (session.code == code) {
        correctId = session.id
      }
    })
    if (correctId != null) {
      const updatedSession = await updateUserInSession({ id: correctId, opponentName: username.username, gameState: 'Waiting'})
      emitter.emit('edit-gameSession', `${JSON.stringify(updatedSession)}\n\n`)
      return redirect(`/pvplobby/${correctId}`)
    }
  }
  return null
}

export const meta = () => [{ title: "Color Fill" }];

export default function Index() {
  const user = useOptionalUser();
  let loaderData = useLoaderData()
  const submit = useSubmit()
  const isHydrated = useHydrated()

  const [games, setGames] = useState(loaderData.games)
  const [input, setInput] = useState('')
  const [allGames, setAllGames] = useState(false)
  const [listView, setListView] = useState(false)
  let newGameSession = useEventSource('/pvpmenu/subscribe', {event: 'new-gameSession'})
  let editedGameSession = useEventSource('/pvplobby/subscribe', {event: 'edit-gameSession'})
   
  useEffect(() => {
    let parsedGameSession = JSON.parse(newGameSession)
    if (parsedGameSession != null && parsedGameSession.gameType != 'Private') {
      setGames((prev) => [...prev, parsedGameSession])
    }
  }, [newGameSession])

  useEffect(() => {
    let parsedEditedSession = JSON.parse(editedGameSession)
    if (parsedEditedSession != null) {
      let gameArr = games
      let newGameArr
      console.log('game arr')
      console.log(gameArr)
      if (!allGames) {
        newGameArr = gameArr.filter(game => game.id != parsedEditedSession.id && game.gameState == 'Waiting' && game.gameType != 'Private' && (Date.now() - Date.parse(game.createdAt)) / 1000 < 300)
        parsedEditedSession.gameState == 'Waiting' && parsedEditedSession.gameType != 'Private' ? setGames([parsedEditedSession, ...newGameArr]) : setGames(newGameArr)
      }
      else {
        newGameArr = gameArr.filter(game => game.id != parsedEditedSession.id && game.gameType != 'Private')
        parsedEditedSession.gameType != 'Private' ? setGames([parsedEditedSession, ...newGameArr]) : setGames(newGameArr)
      }
      // parsedEditedSession.gameState == 'Waiting' && parsedEditedSession.gameType != 'Private' ? setGames([parsedEditedSession, ...newGameArr]) : setGames(newGameArr)
      // if (parsedEditedSession.gameState == 'Waiting') {
      //   setGames([parsedEditedSession, newGameArr])
      // }
      // else {
      //   if (newGameArr.length == 0) {
      //     setGames([])
      //   }
      //   else {
      //     setGames([newGameArr])
      //   }
      // }
    }
  }, [editedGameSession])

  useEffect(() => {
    submit({ listType: allGames }, {method: 'get'})
  }, [allGames])

  function handleInput(event) {
    setInput(event.target.value)
  }

  useEffect(() => {
    console.log('running')
    setGames(loaderData.games)
  }, [loaderData.games])

  console.log(loaderData.games)
  return (
   
    <>
    {isHydrated && <main>
      <div className="top">
        <Link to='/'>
          <img src={logo}></img>
        </Link>
      </div>
      <div className="gameList">
        <h2>Game List: {games.length} {games.length == 1 ? 'Game' : 'Games'}</h2>
        <div className="filters">
          <h3 className={!allGames ? 'picked' : ''} onClick={() => setAllGames(false)}>Open Games</h3>
          <h3 className={!allGames ? '' : 'picked'} onClick={() => setAllGames(true)}>All Games</h3>
        </div>
        <div className="viewOptions">
          <h3 className={!listView ? 'picked' : ''} onClick={() => setListView(false)}><FontAwesomeIcon icon="fa-solid fa-layer-group" /></h3>
          <h3 className={!listView ? '' : 'picked'} onClick={() => setListView(true)}><FontAwesomeIcon icon="fa-solid fa-list" /></h3>
        </div>
        <div className="interior">
          {games.length == 0 ? <div className="noGames">
          <h3>No games currently...</h3>
          <TailSpin 
          height="80"
          width="80"
          radius="1"
          color="green"
          ariaLabel="loading"
          wrapperStyle={{justifyContent: 'center', margin: 'auto'}}>
          </TailSpin>
          </div> :
          games.map((game, index) => {
            return (
              <>
              {!listView ? <div className='gameContainer' key={index}>
                {console.log(game.gameState)}
                <h3>Board Size: {game.boardSize}</h3>
                <h3>Board Type: {game.boardType}</h3>
                <h3>Status: {game.gameState}</h3>
                <h3>Players: ({game.ownerName == game.opponentName ? '1/2' : '2/2'})</h3>
                <h3>{game.ownerName}</h3>
                <div className="players">
                  <h3>{game.ownerName == game.opponentName ? 'Waiting on player...' : game.opponentName}</h3>
                  {game.ownerName == game.opponentName && <Bars 
                  height="30"
                  width="30"
                  radius="3"
                  strokeColor="darkGreen"
                  ariaLabel="loading"
                  wrapperStyle={{alignItems: 'center'}}
                  wrapperClass>
                  </Bars>}
                </div>
                {game.ownerName == game.opponentName && 
                <Form method='POST' reloadDocument>
                  <input type='hidden' name='id' value={game.id}></input>
                  <input type="hidden" name="submitType" value='noCode'></input>
                  <button type='submit'>Join</button>
                </Form> 
                }
                {game.gameState == 'Playing' && isHydrated && <button onClick={() => window.location.href = `/pvpgame/${game.id}`}><FontAwesomeIcon icon={faEye} />Spectate</button>}
              </div> :
              <div className="gameContainer list">
                <div>
                  <h3>Board Size:</h3>
                  <h3>{game.boardSize}</h3>
                </div>
                <div>
                  <h3>Board Type:</h3>
                  <h3>{game.boardType}</h3>
                </div>
                <div>
                  <h3>Status:</h3>
                  <h3>{game.gameState}</h3>
                </div>
                <div className="playerCol">
                  <h3>Players: ({game.ownerName == game.opponentName ? '1/2' : '2/2'})</h3>
                  <h3>{game.ownerName}</h3>
                  <div className="players">
                    <h3 className="none">{game.ownerName == game.opponentName ? <Bars 
                    height="30"
                    width="30"
                    radius="3"
                    strokeColor="darkGreen"
                    ariaLabel="loading"
                    wrapperStyle={{alignItems: 'center'}}
                    wrapperClass>
                    </Bars> : game.opponentName}</h3>
                  </div>
                </div>
                {console.log(game.gameState)}
                {game.ownerName == game.opponentName ? 
                <Form method='POST' reloadDocument>
                  <input type='hidden' name='id' value={game.id}></input>
                  <input type="hidden" name="submitType" value='noCode'></input>
                  <button type='submit'>Join</button>
                </Form> :
                <div className={game.gameState != 'Playing' && 'empty'}></div>
                }
                {game.gameState == 'Playing' && isHydrated && <button className='spectate' onClick={() => window.location.href = `/pvpgame/${game.id}`}><FontAwesomeIcon icon={faEye} /></button>}
              </div>}
              </>
            )
          })}
            
        </div>
      </div>
      
      <div className="gameOptions">
        <div className="join">
          <h3>Code:</h3>
          <input type="text" maxLength={6} size={6} onChange={(event) => handleInput(event)}></input>
        </div>
        <div className="buttons">
          <Form method='POST' reloadDocument>
            <input type="hidden" name="code" value={input}></input>
            <input type="hidden" name="submitType" value='code'></input>
            <button disabled={input.length != 6} type="submit">Join</button>
          </Form>
          <button onClick={() => window.location.href = '/pvpcreate'}>Create</button>
        </div>
      </div>
    </main>}
    </>
    
  );
}

export function links() {
  return [{rel: 'stylesheet', href: index}]
}