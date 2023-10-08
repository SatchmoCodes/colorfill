import { Link } from "@remix-run/react";
import { Form, NavLink, Outlet, useLoaderData } from "@remix-run/react";
import { requireUserId } from "~/session.server";
import { createGameSession, findExistingSession } from "../models/gamesession.server";
import { createBoard } from "../models/board.server";
import { json, redirect } from "@remix-run/node";
import { getUserNameById } from "../models/user.server";
import generateBoard from './pvpGenerator'

import { useState } from "react";

import logo from '~/img/Colorfill.png'

import { useOptionalUser } from "~/utils";

import index from '~/styles/index.css'
import { emitter } from "../services/emitter.server";

export const meta = () => [{ title: "Color Fill" }];

export const action = async ({ request }) => {
  const userId = await requireUserId(request);
  const formData = await request.formData()
  const size = formData.get('size')
  const boardType = formData.get('boardType')
  const gameType = formData.get('gameType')
  let dimensions
  let boardData = []

  switch(size) {
    case 'Small':
      dimensions = 9
      break
    case 'Medium':
      dimensions = 15
      break
    case 'Large':
      dimensions = 21
      break
  }

  if (boardType == 'Mirror') {
    let halfDim
    let boardHalf = []
    halfDim = Math.ceil(((dimensions * dimensions) / 2) - 1)
    console.log(halfDim)
  
    for (let i = 0; i < halfDim; i++) {
      boardHalf.push(Math.floor(Math.random() * 5)) 
    }
    while (boardHalf[1] == boardHalf[0]) {
      boardHalf.splice(1, 1, Math.floor(Math.random() * 5))
    }
    while (boardHalf[dimensions] == boardHalf[0]) {
      boardHalf.splice(dimensions, 1, Math.floor(Math.random() * 5))
    }
    let reverseHalf = JSON.parse(JSON.stringify(boardHalf))
    reverseHalf = reverseHalf.reverse()
    let centerPiece = (Math.floor(Math.random() * 5))
    boardHalf.push(centerPiece)
    boardData = boardHalf.concat(reverseHalf)
  }
  else {
    console.log('random')
    for (let i = 0; i < dimensions * dimensions; i++) {
      boardData.push(Math.floor(Math.random() * 5))
    }
    while (boardData[1] == boardData[0]) {
      boardData.splice(1, 1, Math.floor(Math.random() * 5))
    }
    while (boardData[dimensions] == boardData[0]) {
      boardData.splice(dimensions, 1, Math.floor(Math.random() * 5))
    }
    while (boardData[boardData.length - 1] == boardData[0]) {
      boardData.splice(boardHalf.length - 1, 1, Math.floor(Math.random() * 5))
    }
    while (boardData[(boardData.length - 1) - dimensions] == boardData[0]) {
      boardData.splice((boardData.length - 1) - dimensions, 1, Math.floor(Math.random() * 5))
    }
  }

  boardData = boardData.join("")
  console.log(boardData)

 const username = await getUserNameById({id: userId})
 const existingSession = await findExistingSession({ ownerName: username.username})
//  if (existingSession) {
//   throw new Response("A session already exists for this user", { status: 200})
//  }
//  else {
  
//  }
  let firstMove = Math.floor(Math.random() * 2)
  let turn
  firstMove == 0 ? turn = 'Owner' : turn = 'Opponent'

  const boardState = JSON.stringify(generateBoard(boardData))
  const squareGrowthArr = new Array(dimensions * dimensions).fill(false)
  squareGrowthArr[0] = 'captured Owner'
  squareGrowthArr[squareGrowthArr.length - 1] = 'captured Opponent'
  let squareGrowth = JSON.stringify(squareGrowthArr)

  const board = await createBoard({ size, boardData, userId})
  const gameSession = await createGameSession({ownerName: username.username, opponentName: 'waiting for player', boardId: board.id, boardSize: size, boardData, gameState: 'Waiting', boardState, squareGrowth, boardType, gameType, turn, ownerScore: 1, opponentScore: 1, turnLog: ''})
  emitter.emit('new-gameSession', `${JSON.stringify(gameSession)}\n\n`)

  return redirect(`/pvplobby/${gameSession.id}`)
}

export default function Pvpcreate() {
  const user = useOptionalUser();

  const [size, setSize] = useState('Medium')
  const [boardType, setBoardType] = useState('Mirror')
  const [gameType, setGameType] = useState('Public')

  function handleSizeChange(event) {
    setSize(event.currentTarget.value)
  }

  function handleTypeChange(event) {
    setBoardType(event.currentTarget.value)
  }

  function handleGameTypeChange(event) {
    setGameType(event.currentTarget.value)
  }
 
 
  return (
    <>
    <main>
      <div className="top">
        <img src={logo}></img>
      </div>
      <div className="pvpOptions">
        <h2>Game Options</h2>
        <div className="optionContainer">
            <div className="size box">
                <h3>Board Size</h3>
                <div className='option'>
                    <input id='small' type='radio' name='size' value={'Small'} onChange={handleSizeChange}/>
                    <label htmlFor='small'>Small</label>
                </div>
                <div className='option'>
                    <input id='medium' type='radio' name='size' defaultChecked  value={'Medium'} onChange={handleSizeChange}/>
                    <label htmlFor='medium'>Medium</label>
                </div>
                <div className='option'>
                    <input id='large' type='radio' name='size' value={'Large'} onChange={handleSizeChange}/>
                    <label htmlFor='large'>Large</label>
                </div>
            </div>
            <div className="boardType box">
                <h3>Board Type</h3>
                <div className='option'>
                    <input id='mirror' type='radio' name='boardType' defaultChecked  value={'Mirror'} onChange={handleTypeChange}/>
                    <label htmlFor='mirror'>Mirrored</label>
                </div>
                <div className='option'>
                    <input id='random' type='radio' name='boardType' value={'Random'} onChange={handleTypeChange}/>
                    <label htmlFor='random'>Random</label>
                </div>
            </div>
            <div className="gameType box">
                <h3>Game Type</h3>
            <div className='option'>
                    <input id='public' type='radio' name='gameType' defaultChecked  value={'Public'} onChange={handleGameTypeChange}/>
                    <label htmlFor='mirror'>Public</label>
                </div>
                <div className='option'>
                    <input id='private' type='radio' name='gameType' value={'Private'} onChange={handleGameTypeChange}/>
                    <label htmlFor='random'>Private</label>
                </div>
            </div>
        </div>
        <Form method="post">
          <input type="hidden" name="size" value={size}></input>
          <input type="hidden" name="boardType" value={boardType}></input>
          <input type="hidden" name="gameType" value={gameType}></input>
          <div className="submit box">
            <button>Create Game</button>
          </div>
        </Form>
      </div>
    </main>
    </>
    
  );
}

export function links() {
  return [{rel: 'stylesheet', href: index}]
}
