import { useCallback, useContext, useState } from 'react'
import { useEffect, useRef } from 'react'
import { json, redirect } from "@remix-run/node";
import gameStyle from '~/styles/game.css'
import generateBoard from './pvpGenerator'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { library } from '@fortawesome/fontawesome-svg-core'
import { Link, useNavigation, useBeforeUnload } from "@remix-run/react";
import { faCheckSquare, faCoffee, faGear, faX } from '@fortawesome/free-solid-svg-icons'

library.add(faCheckSquare, faCoffee, faGear, faX)

import { useUser } from "~/utils";
import { requireUserId } from "~/session.server";
import { Form, useActionData, useLoaderData} from '@remix-run/react'
import { createBoard} from '~/models/board.server'
import { createScore} from '~/models/score.server'
import invariant from "tiny-invariant";

import { Beforeunload, useBeforeunload } from 'react-beforeunload';

import { emitter } from "../services/emitter.server";
import { useEventSource } from "remix-utils";

import { useFetcher } from "@remix-run/react";
import { getGameSessionById, updateBoardStateOwner, updateBoardStateOpponent, updateSessionState, updateFinalSessionState } from '../models/gamesession.server';

import { useHydrated } from "remix-utils"
import { createPVPScore } from '../models/pvpscores.server';
import { getBestWinStreak, getUserByUsername, resetUserWinStreak, updateBestWinStreak, updateUserLosses, updateUserWinStreak, updateUserWins } from '../models/user.server';

// import { useHistory } from 'react-router-dom';

export const HeadersFunction = () => {
  const headers = new Headers()
  headers.set("Server", "Remix")
  return headers
}


export const loader = async ({ params, request }) => {
  const userId = await requireUserId(request);
  invariant(params.sessionId, "sessionId not found");

  const gameSession = await getGameSessionById({ id: params.sessionId });
  if (!gameSession) {
    throw new Response("Not Found", { status: 404 });
  }
  let squareData = JSON.parse(gameSession.boardState)
  squareData = squareData.flat()
  let squareGrowth = JSON.parse(gameSession.squareGrowth)

  if (gameSession.gameState == 'Waiting') {
    return redirect('/pvpmenu')
  }
  const ownerId = await getUserByUsername(gameSession.ownerName)
  const opponentId = await getUserByUsername(gameSession.opponentName)
  return json({ gameSession, squareData, squareGrowth, ownerId, opponentId });
};


export const action = async ({ request }) => {
  const userId = await requireUserId(request)

  const formData = await request.formData()
  const submitType = formData.get('submitType')
  const sessionId = formData.get('sessionId')

  if (submitType == 'boardUpdate') {
    const boardState = formData.get('boardState')
    const squareGrowth = formData.get('squareGrowth')
    const turn = formData.get('turn')
    const captured = parseInt(formData.get('captured'))
    const turnLog = formData.get('turnLog')
    if (turn == 'Owner') {
      const updatedGameSession = await updateBoardStateOpponent({ id: sessionId, boardState, squareGrowth, turn, turnLog, opponentScore: captured})
      emitter.emit('updateBoard-gameSession', JSON.stringify(updatedGameSession))
    }
    else {
      const updatedGameSession = await updateBoardStateOwner({ id: sessionId, boardState, squareGrowth, turn, turnLog, ownerScore: captured})
      emitter.emit('updateBoard-gameSession', JSON.stringify(updatedGameSession))
    }
  }
  // else if (submitType == 'Leaving') {
  //   console.log("ballsaa")
  //   const updatedSessionState = await updateSessionState({ id: sessionId, gameState: 'Botout'})
  //   emitter.emit('edit-gameSession', JSON.stringify(updatedSessionState))
  //   return redirect('/pvpmenu')
  // }
  else if (submitType == 'gameOver') {
    const winner = formData.get('winner')
    const loser = formData.get('loser')
    const ownerName = formData.get('ownerName')
    const ownerId = formData.get('ownerId')
    const opponentName = formData.get('opponentName')
    const opponentId = formData.get('opponentId')
    const updatedSessionState = await updateFinalSessionState({ id: sessionId, winner: winner, loser: loser})
    if (winner == ownerName) {
      const win = await updateUserWins({ id: ownerId })
      const loss = await updateUserLosses({ id: opponentId })
      const winStreak = await updateUserWinStreak({ id: ownerId })
      const resetWinstreak = await resetUserWinStreak({ id: opponentId })
      const prevBestWinStreak = await getBestWinStreak({ id: ownerId})
      console.log('previous win streak')
      console.log(prevBestWinStreak)
      if (winStreak.winStreak > prevBestWinStreak.bestWinStreak) {
        const newBestWinStreak = await updateBestWinStreak({ id: ownerId, bestWinStreak: winStreak.winStreak})
      }
      // const ownerScore = await createPVPScore({ score: 'Win', userId: ownerId, userName: ownerName, gameId: sessionId})
      // const opponentScore = await createPVPScore({ score: 'Loss', userId: opponentId, userName: opponentName, gameId: sessionId})
    }
    else {
      const win = await updateUserWins({ id: opponentId })
      const loss = await updateUserLosses({ id: ownerId })
      const winStreak = await updateUserWinStreak({ id: opponentId })
      const resetWinStreak = await resetUserWinStreak({ id: ownerId })
      const prevBestWinStreak = await getBestWinStreak({ id: opponentId})
      if (winStreak.winStreak > prevBestWinStreak.bestWinStreak) {
        const newBestWinStreak = await updateBestWinStreak({ id: opponentId, bestWinStreak: winStreak.winStreak})
      }
      // const ownerScore = await createPVPScore({ score: 'Loss', userId: ownerId, userName: ownerName, gameId: sessionId})
      // const opponentScore = await createPVPScore({ score: 'Win', userId: opponentId, userName: opponentName, gameId: sessionId})
    }
    

  }
  return null
}

const colors = ['var(--red)', 'var(--orange)', 'var(--yellow)', 'var(--green)', 'var(--blue)']
const paletteColors = ['--red', '--orange', '--yellow', '--green', '--blue', '--owner', '--opponent']
let totalCaptured = 0
let turnCount = 0
// let boardSize = 20
// let totalDim = 400

// let data.squareData = generateBoard(boardSize).flat()
let squareCounterArr = [
  {
    id: 0,
    color: 'var(--red)',
    count: 0
  },
  {
    id: 1,
    color: 'var(--orange)',
    count: 0
  },
  {
    id: 2,
    color: 'var(--yellow)',
    count: 0
  },
  {
    id: 3,
    color: 'var(--green)',
    count: 0
  },
  {
    id: 4,
    color: 'var(--blue)',
    count: 0
  }
]


// let data.squareGrowth = new Array(totalDim).fill(false)



let tempSquareArr
let turnLogArr = []
let newArrayCauseReactIsLame
let turnLogJSON
let boardStateJSON
let numberCaptured = 0
let hasRun = false
let currentPlayer
let roundCaptured = 0
let fakeCaptured = 0
let fakeTurnArr = ['Owner', 'Opponent']
let fakeTurn
let totalSquares
let squaresCaptured
let remainingSquares

function App() {
  const user = useUser()
  const fetcher = useFetcher()
  const data = useLoaderData()
  const navigation = useNavigation()
  const isHydrated = useHydrated()

  const isSubmitting = navigation.formAction === '/game'

  const Ref = useRef(null);
 
    // The state for our timer
    const [timer, setTimer] = useState(13);
 
    const getTimeRemaining = (e) => {
        const total = Date.parse(e) - Date.parse(new Date());
        const seconds = Math.floor((total / 1000) % 60);
        const minutes = Math.floor((total / 1000 / 60) % 60);
        const hours = Math.floor((total / 1000 / 60 / 60) % 24);
        return {
            total, hours, minutes, seconds
        };
    }
 
    const startTimer = (e) => {
        let { total, hours, minutes, seconds } 
                    = getTimeRemaining(e);
        if (total >= 0) {
            setTimer(
                seconds
            )
        }
    }

    const clearTimer = (e) => { 
        if (Ref.current) clearInterval(Ref.current);
          const id = setInterval(() => {
            startTimer(e);
        }, 1000)
        Ref.current = id;
        
    }
 
    const getDeadTime = () => {
      let deadline
        if (boardUpdate) {
          let parsedBoardUpdate = JSON.parse(boardUpdate)
          deadline = new Date((parsedBoardUpdate.updatedAt));
        }
        else {
          deadline = new Date((data.gameSession.updatedAt));
        }
        deadline.setSeconds(deadline.getSeconds() + 13);
        return deadline;
    }
    useEffect(() => {
        clearTimer(getDeadTime());
    }, []);

   

  const [count, setCount] = useState(turnCount) //track # of turns
  const [colorState, setColorState] = useState(data.squareData) //tracks color of entire board
  const [squareCounter, setSquareCounter] = useState(squareCounterArr) //sets number of squares left
  const [highScore, setHighScore] = useState(data.bestScore == null ? '' : data.bestScore.score)
  const [selectedColor, setSelectedColor] = useState(data.squareData[0].color) //sets selected color at bottom
  const [saveActive, setSaveActive] = useState(false)
  const [radarActive, setRadarActive] = useState(false)
  const [growth, setGrowth] = useState(data.squareGrowth) //class animation on capture
  const [customBoardSize, setCustomBoardSize] = useState('')
  const [boardSize, setBoardSize] = useState(Math.sqrt(data.squareData.length))
  const [newBoardSize, setNewBoardSize] = useState(Math.sqrt(data.squareData.length))
  const [grid, setGrid] = useState(false)
  const [isOpen, setIsOpen] = useState(false)
  const [complete, setComplete] = useState(false)

  const [turnLog, setTurnLog] = useState(turnLogArr)
  const [ownerScore, setOwnerScore] = useState(data.gameSession.ownerScore)
  const [opponentScore, setOpponentScore] = useState(data.gameSession.opponentScore)
  const [ownerColor, setOwnerColor] = useState(data.squareData[0].color)
  const [opponentColor, setOpponentColor] = useState(data.squareData[data.squareData.length - 1].color)
  const [turnOrder, setTurnOrder] = useState(data.gameSession.turn)
  const [blocked, setBlocked] = useState(false)

  let boardUpdate = useEventSource('/pvpgame/subscribe', {event: 'updateBoard-gameSession'})

  useEffect(() => {
    if (boardUpdate) {
      console.log('board update')
      let parsedBoardUpdate = JSON.parse(boardUpdate)
      if (parsedBoardUpdate != null && parsedBoardUpdate.id == data.gameSession.id) {
        totalSquares = data.squareData.length
        // setGrowth(JSON.parse(parsedBoardUpdate.squareGrowth))
        data.squareGrowth = JSON.parse(parsedBoardUpdate.squareGrowth)
        setColorState(JSON.parse(parsedBoardUpdate.boardState))
        tempSquareArr = JSON.parse(parsedBoardUpdate.boardState)
        data.gameSession.turn = parsedBoardUpdate.turn
        data.squareData = tempSquareArr
        parsedBoardUpdate.turn == 'Owner' ? setOpponentScore(parsedBoardUpdate.opponentScore) : setOwnerScore(parsedBoardUpdate.ownerScore)
        parsedBoardUpdate.turn == 'Owner' ? setOpponentColor(tempSquareArr[tempSquareArr.length - 1].color) : setOwnerColor(tempSquareArr[0].color)
        squaresCaptured = parsedBoardUpdate.ownerScore + parsedBoardUpdate.opponentScore
        remainingSquares = totalSquares - squaresCaptured
        setOwnerScore(parsedBoardUpdate.ownerScore)
        setOpponentScore(parsedBoardUpdate.opponentScore)
        setBlocked(false)
        clearTimer(getDeadTime())
        setTurnOrder(parsedBoardUpdate.turn)
        turnLogArr = JSON.parse(parsedBoardUpdate.turnLog)
        console.log('after parse')
        console.log(turnLogArr)
        setTurnLog(turnLogArr)
        document.querySelector('.time').classList.remove('crunch')
        setRadarActive(true)
        if (parsedBoardUpdate.ownerScore + remainingSquares < parsedBoardUpdate.opponentScore) {
          setComplete(true)
        }
        else if (parsedBoardUpdate.opponentScore + remainingSquares < parsedBoardUpdate.ownerScore) {
          setComplete(true)
      }
      }
    }
  }, [boardUpdate])


  useEffect(() => {
    if (complete) {
      let previousPlayer
      data.gameSession.turn == 'Owner' ? previousPlayer = data.gameSession.opponentName : previousPlayer = data.gameSession.ownerName
      clearInterval(Ref.current)
      if (ownerScore > opponentScore && user.username == previousPlayer) {
        fetcher.submit({submitType: 'gameOver', winner: data.gameSession.ownerName, loser: data.gameSession.opponentName, sessionId: data.gameSession.id, ownerName: data.ownerId.username, ownerId: data.ownerId.id, opponentName: data.opponentId.username, opponentId: data.opponentId.id}, {method: 'post'})
      }
      else if (ownerScore < opponentScore && user.username == previousPlayer) {
        fetcher.submit({submitType: 'gameOver', winner: data.gameSession.opponentName, loser: data.gameSession.ownerName, sessionId: data.gameSession.id, ownerName: data.ownerId.username, ownerId: data.ownerId.id, opponentName: data.opponentId.username, opponentId: data.opponentId.id}, {method: 'post'})
      }
      document.querySelector('.victory').show()
    }
  }, [complete])


  //checks to see if player has no moves left and ends game accordingly
  useEffect(() => {
    if (radarActive && !complete) {
      let parsedBoardUpdate = JSON.parse(boardUpdate)
      let turn
      for (let x = 0; x < fakeTurnArr.length; x++) {
        fakeTurn = fakeTurnArr[x]
        for (let i = 0; i < colors.length; i++) {
          colorChange(colors[i])
        }
        console.log(fakeCaptured)
        fakeCaptured == 0 ? console.log('0 squares possible to be captured') : console.log('squares can still be captured')
        if (fakeCaptured == 0) {
          if (parsedBoardUpdate.turn == 'Owner') {
            turn = 'Opponent'
            numberCaptured = remainingSquares
            console.log('remaining')
            console.log(remainingSquares)
          }
          else {
            turn = 'Owner'
            numberCaptured = remainingSquares
            console.log('remaining')
            console.log(remainingSquares)
          }
          boardStateJSON = JSON.stringify(tempSquareArr)
          let squareGrowthJSON = JSON.stringify(data.squareGrowth)
          let turnLogJSON = JSON.stringify(turnLogArr)
          let previousPlayer
          data.gameSession.turn == 'Owner' ? previousPlayer = data.gameSession.opponentName : previousPlayer = data.gameSession.ownerName
          if (user.username == previousPlayer) {
            fetcher.submit({boardState: boardStateJSON, submitType: 'boardUpdate', turn: turn, sessionId: data.gameSession.id, squareGrowth: squareGrowthJSON, turnLog: turnLogJSON, captured: numberCaptured}, {method: 'post'})
          }
        }
        fakeCaptured = 0
      }
      setRadarActive(false)
      fakeCaptured = 0
    }
   
  }, [radarActive])

  useEffect(() => {
    if (data.squareGrowth) {
      setGrowth(data.squareGrowth)
    }
  }, [data.squareGrowth])

  useEffect(() => {
    if (!hasRun) {
      if (data.gameSession.winner != '') {
        window.location.href = '/pvpmenu'
      }
      tempSquareArr = JSON.parse(JSON.stringify(data.squareData))
      tempSquareArr.forEach(sq => {
        // boardCode += (colors.indexOf(sq.color))
        squareCounterArr.forEach(counter => {
            if (sq.color == counter.color && !sq.index == 0) {
              counter.count++
            }
          })
      })
    // data.squareGrowth[0] = 'captured'
    // data.squareGrowth[data.squareGrowth.length - 1] = 'captured'
    setGrowth(data.squareGrowth)
    setSquareCounter(squareCounterArr)
    // tempSquareArr.forEach((sq, index) => {
    //   if (sq.captured && sq.owner == "Owner") {
    //     captureCheck(sq.color, index, "Owner");
    //   }
    // });
    // tempSquareArr.forEach((sq, index) => {
    //   if (sq.captured && sq.owner == "Opponent") {
    //     captureCheck(sq.color, index, "Opponent");
    //   }
    // });
    // if (data.gameSession.ownerName == user.username) {
    //   setSelectedColor(data.squareData[0].color)
    // }
    // else if (data.gameSession.opponentName == user.username) {
    //   setSelectedColor(data.squareData[data.squareData.length - 1].color)
    // }
    data.squareData = JSON.parse(JSON.stringify(tempSquareArr))
    setColorState(tempSquareArr)
    if (data.gameSession.turnLog != '') {
      turnLogArr = JSON.parse(data.gameSession.turnLog)
      setTurnLog(turnLogArr)
    }
    localStorage.getItem('grid') == 'true' && setGrid(true)
    hasRun = true
    clearTimer(getDeadTime())
    window.history.replaceState(null, '/game', ['/pvpmenu'])
    }
    for (let i = 0; i < paletteColors.length; i++) {
      if (localStorage.getItem(paletteColors[i])) {
        document.documentElement.style.setProperty(paletteColors[i], localStorage.getItem(paletteColors[i]))
      } 
    }
    
  }, []);

  useEffect(() => {
    if (timer <= 4) {
      document.querySelector('.time').classList.add('crunch')
    }
    let blockedColor
    if (timer <= 1) {
      setBlocked(true)
    }
    if (timer <= 0) {
      if (turnOrder == 'Owner') {
        for (let i = 0; i < colors.length; i++) {
          if (ownerColor == colors[i]) {
            blockedColor = i
          }
        }
      }
      else {
        console.log('else')
        for (let i = 0; i < colors.length; i++) {
          if (opponentColor == colors[i]) {
            blockedColor = i  
          }
        }
      }
      let selectedColor = Math.floor(Math.random() * 5) 
      while (selectedColor == blockedColor) {
        selectedColor = Math.floor(Math.random() * 5)
      }
      let leaver = true
      if (turnOrder == 'Owner' && user.username == data.gameSession.ownerName) {
        colorChange(colors[selectedColor])
        leaver = false
      }
      else if (turnOrder == 'Opponent' && user.username == data.gameSession.opponentName) {
        colorChange(colors[selectedColor])
        leaver = false
      }
      else if (turnOrder == 'Owner' && user.username == data.gameSession.opponentName && leaver == true) {
        if (leaver == true) {
          colorChange(colors[selectedColor])
        } 
      }
      else if (turnOrder == 'Opponent' && user.username == data.gameSession.ownerName && leaver == true) {
        if (leaver == true) {
          colorChange(colors[selectedColor])
        } 
      }
      leaver = true
    }
  }, [timer])


  function colorChange(color) {
    totalCaptured = 0
    numberCaptured = totalCaptured
    //block spectator from making a move
    if (!radarActive) {
      console.log("timer")
      console.log(timer)
      if (timer > 0) {
        if (turnOrder == 'Owner' && data.gameSession.ownerName != user.username) {
          alert('it is not your turn')
          return
        }
        else if (turnOrder == 'Opponent' && data.gameSession.opponentName != user.username) {
          alert('it is not your turn')
          return
        }
      }
    }
    setBlocked(true)
    if (radarActive) {
      fakeTurn == 'Owner' ? currentPlayer = 'Opponent' : currentPlayer = 'Owner'
    }
    else {
      currentPlayer = data.gameSession.turn
      console.log('current player')
      console.log(currentPlayer)
      console.log(color)
      currentPlayer == 'Owner' ? setOwnerColor(color) : setOpponentColor(color)
    }
    // setColorState(tempSquareArr)
    data.squareGrowth.map((e, index) => {
      if (e == 'predicted') {
        data.squareGrowth[index] = false
      }
    })
    // setGrowth(data.squareGrowth)
    !radarActive && turnCount++
      tempSquareArr.forEach((sq, index) => {
        if (sq.captured && sq.owner == currentPlayer) {
          captureCheck(color, index, currentPlayer)
        }
      })
    setColorState(tempSquareArr)
    setCount(turnCount)
    if (radarActive) {
      tempSquareArr = JSON.parse(JSON.stringify(data.squareData))
    } 
    // data.squareData = JSON.parse(JSON.stringify(tempSquareArr))
    if (!radarActive) {
      numberCaptured = totalCaptured
      let captureObj = {
        captured: numberCaptured,
        color: color,
        username: currentPlayer == 'Owner' ? data.gameSession.ownerName : data.gameSession.opponentName
      }
      console.log('turnlogarr')
      console.log(turnLogArr)
      turnLogArr.push(captureObj)
      newArrayCauseReactIsLame = [...turnLogArr]
      setTurnLog(newArrayCauseReactIsLame)
    }

    if (!radarActive) {
      let turn
      console.log('number captured: ' + numberCaptured)
      data.gameSession.turn == 'Owner' ? turn = 'Opponent' : turn = 'Owner'
      boardStateJSON = JSON.stringify(tempSquareArr)
      let squareGrowthJSON = JSON.stringify(data.squareGrowth)
      let turnLogJSON = JSON.stringify(newArrayCauseReactIsLame)
      fetcher.submit({boardState: boardStateJSON, submitType: 'boardUpdate', turn: turn, sessionId: data.gameSession.id, squareGrowth: squareGrowthJSON, captured: numberCaptured, turnLog: turnLogJSON}, {method: 'post'})
    }
    setBlocked(false)
  }

  useEffect(() => {
    let x = document.querySelectorAll('.row')
    document.querySelectorAll('.row') != null && document.querySelectorAll('.row')[x.length - 1].scrollIntoView({ behavior: "smooth", block: "end", inline: "nearest" });
  }, [turnLog])


  function updateSquareCount(color) {
    squareCounterArr.forEach(sq => {
      if (sq.color == color) {
        sq.count--
      }
    })
    setSquareCounter(squareCounterArr)
  }

  function captureCheck(color, index, currentPlayer) {
    !radarActive ? tempSquareArr[index].fakeColor = color :   tempSquareArr[index].fakeColor = data.squareData[index].fakeColor
    tempSquareArr[index].color = color
    // right
    if (tempSquareArr[index + 1] && tempSquareArr[index + 1].captured == false) {
      if (tempSquareArr[index].color == tempSquareArr[index + 1].color && tempSquareArr[index].rowIndex == tempSquareArr[index + 1].rowIndex) {
        if (!radarActive) {
          tempSquareArr[index + 1].color = color
          tempSquareArr[index + 1].captured = true
          tempSquareArr[index + 1].owner = currentPlayer
          data.squareGrowth[index + 1] = `captured ${currentPlayer}`
          updateSquareCount(color)
          totalCaptured++
          tempSquareArr[index + 1].colIndex <= boardSize && captureCheck(color, index + 1, currentPlayer)
        }
        else {
          fakeCaptured++
          return
        }
      }
    }
    //left
    if (tempSquareArr[index - 1] && tempSquareArr[index - 1].captured == false) {
      if (tempSquareArr[index].color == tempSquareArr[index - 1].color && tempSquareArr[index].rowIndex == tempSquareArr[index - 1].rowIndex) {
        if (!radarActive) {
          tempSquareArr[index - 1].color = color
          tempSquareArr[index - 1].captured = true
          tempSquareArr[index - 1].owner = currentPlayer
          data.squareGrowth[index - 1] = `captured ${currentPlayer}`
          updateSquareCount(color)
          totalCaptured++
          tempSquareArr[index - 1].colIndex <= boardSize && captureCheck(color, index - 1, currentPlayer)
        } 
        else {
          fakeCaptured++
          return
        }
      }
    }
    // // // // down
    if (tempSquareArr[index + boardSize] && tempSquareArr[index + boardSize].captured == false) {
      if (tempSquareArr[index].color == tempSquareArr[index + boardSize].color) {
        if (!radarActive) {
          tempSquareArr[index + boardSize].color = color
          tempSquareArr[index + boardSize].captured = true
          tempSquareArr[index + boardSize].owner = currentPlayer
          data.squareGrowth[index + boardSize] = `captured ${currentPlayer}`
          updateSquareCount(color)
          totalCaptured++
          tempSquareArr[index + boardSize].rowIndex <= boardSize && captureCheck(color, index + boardSize, currentPlayer)
        }
        else {
          fakeCaptured++
          return
        }
      }
    }
    // // //up
    if (tempSquareArr[index - boardSize] && tempSquareArr[index - boardSize].captured == false) {
      if (tempSquareArr[index].color == tempSquareArr[index - boardSize].color) {
        if (!radarActive) {
          tempSquareArr[index - boardSize].color = color
          tempSquareArr[index - boardSize].captured = true
          tempSquareArr[index - boardSize].owner = currentPlayer
          data.squareGrowth[index - boardSize] = `captured ${currentPlayer}`
          updateSquareCount(color)
          totalCaptured++
          tempSquareArr[index - boardSize].rowIndex <= boardSize && captureCheck(color, index - boardSize, currentPlayer)
        }
        else {
          fakeCaptured++
          return
        }
      }
    }
  }

  function handlePredict() {
    setRadarActive(!radarActive)
    // setColorState(tempSquareArr)
    data.squareGrowth.map((e, index) => {
      if (e == 'predicted') {
        data.squareGrowth[index] = false
      }
    })
    setGrowth(data.squareGrowth)
  }

  const handleGridToggle = (event) => {
    !grid ? localStorage.setItem('grid', 'true') : localStorage.setItem('grid', 'false')
    setGrid(!grid)
  }

  function handlePaletteSwap(event) {
    // document.querySelectorAll('.colorHolder').forEach(e => {
    //   e.classList.remove('selected')
    // })
    // event.currentTarget.classList.add('selected')
    const colors = ['--red', '--orange', '--yellow', '--green', '--blue', '--owner', '--opponent']
    // for (let i = 0; i < 5; i++) {
    //   document.documentElement.style.setProperty(colors[i], `${event.target.parentElement.querySelectorAll('.palColor')[i].style.background}`);
    // }
    for (let i = 0; i < colors.length; i++) {
      localStorage.setItem(colors[i], event.target.parentElement.querySelectorAll('.palColor')[i].style.background)
      document.documentElement.style.setProperty(colors[i], `${event.target.parentElement.querySelectorAll('.palColor')[i].style.background}`)
    }
  }

  function handleOpen() {
    setIsOpen(!isOpen)
  }

  useEffect(() => {
    let x = document.querySelectorAll('.row')
    x != null && document.querySelectorAll('.row')[x.length - 1].scrollIntoView({ behavior: "smooth", block: "end", inline: "nearest" });
  }, [isOpen])

  function handleRedirect() {
    window.location.href = '/pvpmenu'
  }

  // useBeforeUnload(
  //   useCallback(() => {
  //     fetcher.submit({submitType: 'Leaving', sessionId: data.gameSession.id}, {method: 'POST', reloadDocument: true})
  //   })
  // )

  return (
    <div className={`gameContainer ${isHydrated ? '' : 'animate-appear'}`}>
      {/* <div className='settingsIcon' onClick={handleOpen}>{isOpen ? 'X' : 'O'}</div> */}
      {isHydrated && <FontAwesomeIcon className='settingsIcon' icon={!isOpen ? "fa-solid fa-gear" : "fa-solid fa-x"} onClick={handleOpen}/>}
      <dialog className='victory'>
        {ownerScore > opponentScore ? 
        <div>
          <h2>{data.gameSession.ownerName} wins the game!</h2>
          <h3>Score: {user.username != data.gameSession.opponentName ? `${ownerScore} - ${opponentScore}` : `${opponentScore} - ${ownerScore}`}</h3>
          <button onClick={handleRedirect}>Return to lobby</button>
        </div> :
        <div>
          <h2>{data.gameSession.opponentName} wins the game!</h2>
          <h3>Score: {user.username != data.gameSession.opponentName ? `${ownerScore} - ${opponentScore}` : `${opponentScore} - ${ownerScore}`}</h3>
          <button onClick={handleRedirect}>Return to lobby</button>
        </div>
        }
      </dialog>
    <section className={`left ${isOpen ? 'hide' : ''}`}>
      <h1 className='time'>{timer > 0 ? timer - 1 : 0}</h1>
      <section className='btnSection'>
        {user.username != data.gameSession.opponentName ? 
        <div className={`colorRow ${turnOrder == 'Owner' ? 'faded' : ''}`}>
          <div className={`color off ${opponentColor == 'var(--red)' ? 'grayed' : ''}`} style={{background: 'var(--red)'}}></div>
          <div className={`color off ${opponentColor == 'var(--orange)' ? 'grayed' : ''}`} style={{background: 'var(--orange)'}}></div>
          <div className={`color off ${opponentColor == 'var(--yellow)' ? 'grayed' : ''}`} style={{background: 'var(--yellow)'}}></div>
          <div className={`color off ${opponentColor == 'var(--green)' ? 'grayed' : ''}`} style={{background: 'var(--green)'}}></div>
          <div className={`color off ${opponentColor == 'var(--blue)' ? 'grayed' : ''}`} style={{background: 'var(--blue)'}}></div>
        </div> :
        <div className={`colorRow ${turnOrder == 'Opponent' ? 'faded' : ''}`}>
          <div className={`color off ${ownerColor == 'var(--red)' ? 'grayed' : ''}`} style={{background: 'var(--red)'}}></div>
          <div className={`color off ${ownerColor == 'var(--orange)' ? 'grayed' : ''}`} style={{background: 'var(--orange)'}}></div>
          <div className={`color off ${ownerColor == 'var(--yellow)' ? 'grayed' : ''}`} style={{background: 'var(--yellow)'}}></div>
          <div className={`color off ${ownerColor == 'var(--green)' ? 'grayed' : ''}`} style={{background: 'var(--green)'}}></div>
          <div className={`color off ${ownerColor == 'var(--blue)' ? 'grayed' : ''}`} style={{background: 'var(--blue)'}}></div>
        </div>
        }
      </section>
      <div className={`board ${user.username == data.gameSession.opponentName ? 'flip' : ''}`} style={{gridTemplateColumns: `repeat(${boardSize}, 1fr)`, background: user.username == data.gameSession.ownerName ? `var(${paletteColors[5]})` : `var(${paletteColors[6]})`}}>
        {data.squareData.map((sq, index) => {
          return (
            <div className={`square ${data.squareGrowth[index] == false ? '' : data.squareGrowth[index]} ${isHydrated ? 'captureFade' : ''}`} key={sq.index} style={{background: colorState[index].fakeColor, border: grid ? '1px solid black' : ''}}></div>
          )
        })}
      </div>
      <section className='buttonSection'>
        {/* <div className='extraRow'>
          <div className='resetButton'>
            <fetcher.Form reloadDocument method='post' action='/game'>
              <input type='hidden' value='newBoard' name='submitType'></input>
              <input type='hidden' value={newBoardSize} name='newBoardSize'></input>
              <button type='submit'>New Board</button>
            </fetcher.Form>
          </div>
          <button className='retryButton' onClick={handleRetry}>Retry Board</button>
          <button className={`predictButton ${radarActive == true ? 'active' : ''}`} onClick={handlePredict}>Radar</button>
        </div> */}
        {user.username != data.gameSession.opponentName ? 
        <div className={`colorRow ${turnOrder == 'Owner' ? '' : 'faded'}`}>
          <div className={`color ${ownerColor === 'var(--red)' ? 'grayed' : ''}`} onClick={!complete && !blocked && data.gameSession.ownerName == user.username ?  () => colorChange('var(--red)') : () => console.log('not your turn')} onMouseEnter={e => radarActive ? colorChange('var(--red)') : e.preventDefault()} style={{ background: 'var(--red)' }}></div>
          <div className={`color ${ownerColor === 'var(--orange)' ? 'grayed' : ''}`} onClick={!complete && !blocked && data.gameSession.ownerName == user.username ? () => colorChange('var(--orange)') : () => console.log('not your turn')} onMouseEnter={e => radarActive ? colorChange('var(--orange)') : e.preventDefault()} style={{ background: 'var(--orange)' }}></div>
          <div className={`color ${ownerColor === 'var(--yellow)' ? 'grayed' : ''}`} onClick={!complete && !blocked && data.gameSession.ownerName == user.username ? () => colorChange('var(--yellow)') : () => console.log('not your turn')} onMouseEnter={e => radarActive ? colorChange('var(--yellow)') : e.preventDefault()} style={{ background: 'var(--yellow)' }}></div>
          <div className={`color ${ownerColor === 'var(--green)' ? 'grayed' : ''}`} onClick={!complete && !blocked && data.gameSession.ownerName == user.username ? () => colorChange('var(--green)') : () => console.log('not your turn')} onMouseEnter={e => radarActive ? colorChange('var(--green)') : e.preventDefault()} style={{ background: 'var(--green)' }}></div>
          <div className={`color ${ownerColor === 'var(--blue)' ? 'grayed' : ''}`} onClick={!complete && !blocked && data.gameSession.ownerName == user.username ? () => colorChange('var(--blue)') : () => console.log('not your turn')} onMouseEnter={e => radarActive ? colorChange('var(--blue)') : e.preventDefault()} style={{ background: 'var(--blue)' }}></div>
        </div> :
        <div className={`colorRow ${turnOrder == 'Opponent' ? '' : 'faded'}`}>
          <div className={`color ${opponentColor === 'var(--red)' ? 'grayed' : ''}`} onClick={!complete && !blocked && data.gameSession.opponentName == user.username ? () => colorChange('var(--red)') : () => console.log('not your turn')} onMouseEnter={e => radarActive ? colorChange('var(--red)') : e.preventDefault()} style={{ background: 'var(--red)' }}></div>
          <div className={`color ${opponentColor === 'var(--orange)' ? 'grayed' : ''}`} onClick={!complete && !blocked && data.gameSession.opponentName == user.username ? () => colorChange('var(--orange)') : () => console.log('not your turn')} onMouseEnter={e => radarActive ? colorChange('var(--orange)') : e.preventDefault()} style={{ background: 'var(--orange)' }}></div>
          <div className={`color ${opponentColor === 'var(--yellow)' ? 'grayed' : ''}`} onClick={!complete && !blocked && data.gameSession.opponentName == user.username ? () => colorChange('var(--yellow)') : () => console.log('not your turn')} onMouseEnter={e => radarActive ? colorChange('var(--yellow)') : e.preventDefault()} style={{ background: 'var(--yellow)' }}></div>
          <div className={`color ${opponentColor === 'var(--green)' ? 'grayed' : ''}`} onClick={!complete && !blocked && data.gameSession.opponentName == user.username ? () => colorChange('var(--green)') : () => console.log('not your turn')} onMouseEnter={e => radarActive ? colorChange('var(--green)') : e.preventDefault()} style={{ background: 'var(--green)' }}></div>
          <div className={`color ${opponentColor === 'var(--blue)' ? 'grayed' : ''}`} onClick={!complete && !blocked && data.gameSession.opponentName == user.username ? () => colorChange('var(--blue)') : () => console.log('not your turn')} onMouseEnter={e => radarActive ? colorChange('var(--blue)') : e.preventDefault()} style={{ background: 'var(--blue)' }}></div>
        </div>
        }
       
      </section>
    </section>
    <section className='right'>
      <div className='captureCounter'>
        <div className='me'>
          <h4 className='playerName'>{user.username != data.gameSession.opponentName ? data.gameSession.ownerName : data.gameSession.opponentName}</h4>
          <div className='fakeSquare' style={{background: user.username != data.gameSession.opponentName ? ' var(--owner)' : 'var(--opponent)'}}>
            <h4>{user.username != data.gameSession.opponentName ? ownerScore : opponentScore}</h4>
          </div>
        </div>
        <div className='you'>
          <h4 className='playerName'>{user.username != data.gameSession.opponentName ? data.gameSession.opponentName : data.gameSession.ownerName}</h4>
          <div className='fakeSquare' style={{background: user.username != data.gameSession.opponentName ? ' var(--opponent)' : 'var(--owner)'}}>
            <h4>{user.username != data.gameSession.opponentName ? opponentScore : ownerScore}</h4>
          </div>
        </div>
      </div>
      {/* <div className='scoreboard'>
      <h2>{data.bestGlobalScore ? `Score to Beat: ${data.bestGlobalScore.score}` : `High Score: ${highScore}`}</h2>
      <h3>Squares Remaining</h3>
        <div className='squareRow'>
          <div className='fakeSquare' style={{background: 'var(--red)'}}>
            <h4>{squareCounter[0].count}</h4>
          </div>
          <div className='fakeSquare' style={{background: 'var(--orange)'}}>
            <h4>{squareCounter[1].count}</h4>
          </div>
          <div className='fakeSquare' style={{background: 'var(--yellow)'}}>
            <h4>{squareCounter[2].count}</h4>
          </div>
          <div className='fakeSquare'  style={{background: 'var(--green)'}}>
            <h4>{squareCounter[3].count}</h4>
          </div>
          <div className='fakeSquare'  style={{background: 'var(--blue)'}}>
            <h4>{squareCounter[4].count}</h4>
          </div>
        </div>
      </div> */}
      <div className={`options ${isOpen ? 'show' : ''}`}>
        <div className='optionWrap'>
          <div className='gridView'>
            <h2>Grid View</h2>
            <input id='grid' type='checkbox' value='1px solid black' checked={grid} name='grid' onChange={handleGridToggle}></input>
            <label htmlFor='grid'>Grid</label>
          </div>
        </div>
        <div className='turnLog'>
          <h3>Turn Log</h3>
          <div className='row pvp'>
              <h3>Player</h3>
              <h3>Captured</h3>
          </div>
          <div className='turnLogBox'>
            {turnLog && turnLog.map((row, index) => {
              return (
                <div className='row pvp'>
                <h3>{turnLog[index].username}</h3>
                <div className='turnInfo'>
                  <div className='fakeSquare' style={{background: turnLog[index].color}}>
                    <h4>{turnLog[index].captured}</h4>
                  </div>
                </div>
              </div>
              )
            })}
            <div className='anchor'></div>
          </div>
        </div>
        <h2 className='colorOptions'>Color Options</h2>
        <div className='colorPalette'>
          <div className='colorHolder selectedPalette'>
            <div className='palColor' style={{background: 'var(--red)'}}></div>
            <div className='palColor' style={{background: 'var(--orange)'}}></div>
            <div className='palColor' style={{background: 'var(--yellow)'}}></div>
            <div className='palColor' style={{background: 'var(--green)'}}></div>
            <div className='palColor' style={{background: 'var(--blue)'}}></div>
          </div>
          <div className='colorHolder' onClick={handlePaletteSwap}>
            <div className='palColor' style={{background: 'hsl(0, 100%, 40%)'}}></div>
            <div className='palColor' style={{background: 'hsl(22, 100%, 50%)'}}></div>
            <div className='palColor' style={{background: 'hsl(60, 100%, 50%)'}}></div>
            <div className='palColor' style={{background: 'hsl(130, 100%, 15%)'}}></div>
            <div className='palColor' style={{background: 'hsl(242, 69%, 49%)'}}></div>
            <div className='palColor hide' style={{background: 'white'}}></div>
            <div className='palColor hide' style={{background: 'rgb(31, 31, 31)'}}></div>
          </div>
          <div className='colorHolder' onClick={handlePaletteSwap}>
            <div className='palColor' style={{background: 'hsl(33, 90.8%, 12.7%)'}}></div>
            <div className='palColor' style={{background: 'hsl(33, 89.8%, 26.9%)'}}></div>
            <div className='palColor' style={{background: 'hsl(25, 95.4%, 42.7%)'}}></div>
            <div className='palColor' style={{background: 'hsl(221, 69.2%, 43.3%)'}}></div>
            <div className='palColor' style={{background: 'hsl(213, 68.6%, 90%)'}}></div>
            <div className='palColor hide' style={{background: 'rgb(133, 7, 7)'}}></div>
            <div className='palColor hide' style={{background: 'rgb(8, 68, 17)'}}></div>
          </div>
          <div className='colorHolder' onClick={handlePaletteSwap}>
            <div className='palColor' style={{background: 'hsl(358,83%,35%)'}}></div>
            <div className='palColor' style={{background: 'hsl(2,72%,51%)'}}></div>
            <div className='palColor' style={{background: 'hsl(211,88%,32%)'}}></div>
            <div className='palColor' style={{background: 'hsl(0,0%,39%)'}}></div>
            <div className='palColor' style={{background: 'hsl(0,0%,14%)'}}></div>
            <div className='palColor hide' style={{background: 'rgb(143, 4, 156)'}}></div>
            <div className='palColor hide' style={{background: 'rgb(255, 235, 15)'}}></div>
          </div>
          <div className='colorHolder' onClick={handlePaletteSwap}>
            <div className='palColor' style={{background: 'hsl(164,95%,43%)'}}></div>
            <div className='palColor' style={{background: 'hsl(240,100%,98%)'}}></div>
            <div className='palColor' style={{background: 'hsl(43,100%,70%)'}}></div>
            <div className='palColor' style={{background: 'hsl(197,19%,36%)'}}></div>
            <div className='palColor' style={{background: 'hsl(200,43%,7%)'}}></div>
            <div className='palColor hide' style={{background: 'rgb(5, 73, 157)'}}></div>
            <div className='palColor hide' style={{background: 'rgb(197, 42, 11)'}}></div>
          </div>
          <div className='colorHolder' onClick={handlePaletteSwap}>
            <div className='palColor' style={{background: 'hsl(7,55%,30%)'}}></div>
            <div className='palColor' style={{background: 'hsl(6,56%,49%)'}}></div>
            <div className='palColor' style={{background: 'hsl(24,38%,87%)'}}></div>
            <div className='palColor' style={{background: 'hsl(183,66%,28%)'}}></div>
            <div className='palColor' style={{background: 'hsl(180,20%,20%)'}}></div>
            <div className='palColor hide' style={{background: 'rgb(228, 174, 13)'}}></div>
            <div className='palColor hide' style={{background: 'rgb(110, 13, 228)'}}></div>
          </div>
          <div className='colorHolder' onClick={handlePaletteSwap}>
            <div className='palColor' style={{background: 'hsl(306, 81%, 21%)'}}></div>
            <div className='palColor' style={{background: 'hsl(327,100%,44%)'}}></div>
            <div className='palColor' style={{background: 'hsl(211,88%,32%)'}}></div>
            <div className='palColor' style={{background: 'hsl(0,0%,39%)'}}></div>
            <div className='palColor' style={{background: 'hsl(0,0%,14%)'}}></div>
            <div className='palColor hide' style={{background: 'rgb(23, 190, 8)'}}></div>
            <div className='palColor hide' style={{background: 'rgb(190, 20, 8)'}}></div>
          </div>
          <div className='colorHolder' onClick={handlePaletteSwap}>
            <div className='palColor' style={{background: 'hsl(83, 45%, 18%)'}}></div>
            <div className='palColor' style={{background: 'hsl(59,70%,30%)'}}></div>
            <div className='palColor' style={{background: 'hsl(55, 47%, 78%)'}}></div>
            <div className='palColor' style={{background: 'hsl(48,99%,59%)'}}></div>
            <div className='palColor' style={{background: 'hsl(27, 55%, 33%)'}}></div>
            <div className='palColor hide' style={{background: 'rgb(31, 194, 215)'}}></div>
            <div className='palColor hide' style={{background: 'rgb(204, 72, 16)'}}></div>
          </div>
        </div>
        <div className='link'>
          <Link to='/'>Return to Main Menu</Link>
        </div>
      </div>
    </section>
    </div>
  )
}

export function links() {
    return [{rel: 'stylesheet', href: gameStyle}]
  }

export default App
