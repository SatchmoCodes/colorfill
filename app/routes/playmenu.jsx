import { Link } from "@remix-run/react";

import { useState } from 'react'

import { useOptionalUser } from "~/utils";
import { createBoard } from "~/models/board.server";
import { Form, useActionData} from '@remix-run/react'
import { requireUserId } from "~/session.server";

import { getRecentBoard } from "../models/board.server";

import index from '~/styles/index.css'
import { redirect } from "@remix-run/node";
import { useEffect } from "react";

import logo from '~/img/Colorfill.png'


export const meta = () => [{ title: "Color Fill" }];

export const action = async ({ request }) => {
  const userId = await requireUserId(request);
  const formData = await request.formData()
  const gamemode = formData.get('mode')
  const playing = formData.get('playing')
  const id = formData.get('id')
  const recentMode = formData.get('recentMode')

  if (id != false) {
    const recentBoard = await getRecentBoard({ id })
    if (recentBoard) {
      if (gamemode == 'freeplay' && recentMode == 'freeplay') {
        return redirect(`/game/${recentBoard.id}`)
      }
      else if (gamemode == 'progressive' && recentMode == 'progressive') {
        return redirect(`/proggame/${recentBoard.id}`)
      }
    }
  }
  
  let boardData = ''

  if (gamemode == 'freeplay') {
    const size = 'Medium'
    for (let i = 0; i < 225; i++) {
      boardData+= Math.floor(Math.random() * 5)
    }
    const board = await createBoard({ size, boardData, userId})
    return redirect(`/game/${board.id}`)
  }
  else if (gamemode == 'progressive') {
    const size = '10'
    for (let i = 0; i < 1210; i++) {
      boardData += Math.floor(Math.random() * 5)
    }
    const board = await createBoard({ size, boardData, userId})
    return redirect(`/proggame/${board.id}`)
  }
  else if (gamemode == 'pvp') {
    const size = '21x21 '
    for (let i = 0; i < 441; i++) {
      boardData+= Math.floor(Math.random() * 5)
    }
    const board = await createBoard({ size, boardData, userId})
    return redirect(`/pvplocal/${board.id}`)
  }

  
};

export default function Index() {
  const user = useOptionalUser();
  const [playing, setPlaying] = useState(false)
  const [id, setId] = useState(false)
  const [gamemode, setGamemode] = useState(false)

  useEffect(() => {
    setPlaying(localStorage.getItem('playing'))
    setId(localStorage.getItem('recentId'))
    setGamemode(localStorage.getItem('gamemode'))
  })
 
  return (
    <>
    <main>
      <div className="top">
        <Link to='/'>
            <img src={logo}></img>
        </Link>
      </div>
      <div className="gamemodeOptions">
        <Form reloadDocument method='post'>
          <button type='submit'>Free Play</button>
          <input type='hidden' value='freeplay' name='mode'></input>
          <input type='hidden' value={playing} name='playing'></input>
          <input type='hidden' value={id} name='id'></input>
          <input type='hidden' value={gamemode} name='recentMode'></input>
        </Form>
        {/* <Link to='/progmenu'><h2>Progressive</h2></Link> */}
        <Form reloadDocument method='post'>
          <button type='submit'>Progressive</button>
          <input type='hidden' value='progressive' name='mode'></input>
          <input type='hidden' value={playing} name='playing'></input>
          <input type='hidden' value={id} name='id'></input>
          <input type='hidden' value={gamemode} name='recentMode'></input>
        </Form>
        {/* <Form reloadDocument method='post'>
          <button type="submit">Player Vs Player (Local)</button>
          <input type='hidden' value='pvp' name='mode'></input>
          <input type='hidden' value={playing} name='playing'></input>
          <input type='hidden' value={id} name='id'></input>
          <input type='hidden' value={gamemode} name='recentMode'></input>
        </Form> */}
        {/* <Link><h2>Player vs Player (local)</h2></Link> */}
        <Link to='/pvpmenu'><h2>Player vs Player</h2></Link>
      </div>
    </main>
    </>
    
  );
}

export function links() {
  return [{rel: 'stylesheet', href: index}]
}